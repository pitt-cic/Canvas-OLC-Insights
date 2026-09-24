"""Evaluation Lambda — scores all 50 OLC objectives via bounded-concurrency async
Bedrock calls, then generates AI course summary and overview.

INPUT (Step Function event — passed from Extraction step):
    {
        "review_id": str   — unique 8-char review session ID (e.g. "a1b2c3d4")
    }

OUTPUT (returned to Step Function):
    {
        "status": "evaluated",
        "review_id": str,
        "objectives_evaluated": int   — number of objectives scored (should be 50)
    }

SIDE EFFECTS:
    - Reads content.json from S3 at reviews/{review_id}/content.json
      (written by the Extraction step; contains course_context dict with all crawled text)
    - For each of the 50 OLC objectives, invokes Bedrock (Claude) via PydanticAI Agent
      with bounded concurrency (6 simultaneous calls) to produce an AIVerdict:
        obj_id, title, proposed_score (0/1/2 or None), score_label, confidence,
        human_judgment_required, pattern ("AI" or "HUMAN"), accomplished_criteria,
        exemplary_criteria, key_findings, reasoning, improvement_suggestions
    - Writes each verdict to S3 at reviews/{review_id}/verdicts/{obj_id}.json
    - Generates a 2-3 sentence course quality summary via Bedrock
    - Generates a 3-4 sentence course overview (subject area, learning outcomes, structure) via Bedrock
    - Updates DynamoDB review record status to "ready" with course_summary and course_overview
    - On failure: updates status to "error" with error detail, then re-raises

SCORING LOGIC:
    - proposed_score is NEVER taken from the model directly — always recomputed from
      individual criterion verdicts (all accomplished MET → 1, all exemplary also MET → 2, else 0)
    - If model sets can_determine=False (objective not judgeable from static content),
      score is None and pattern is "HUMAN" (flagged for human reviewer)
    - Progress counter is atomically incremented in DynamoDB after each objective completes
"""

import asyncio
import importlib
import json
import logging
import os
import random
import sys
import time
from pathlib import Path
from typing import Literal

import boto3
from pydantic import BaseModel, Field
from pydantic_ai.exceptions import ModelHTTPError


# --- Config ---

logger = logging.getLogger("evaluation")

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
REVIEWS_TABLE = os.environ.get("REVIEWS_TABLE", "")
CONTENT_BUCKET = os.environ.get("CONTENT_BUCKET", "")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")

_dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
_s3 = boto3.client("s3", region_name=AWS_REGION)


# --- DynamoDB ---

_table = _dynamodb.Table(REVIEWS_TABLE)


def update_review_status(review_id: str, status: str, extra: dict = None):
    """Update a review's status field and optionally set additional attributes (e.g., course_name, error)."""
    expr = "SET #st = :st"
    names = {"#st": "status"}
    values = {":st": status}
    if extra:
        for i, (k, v) in enumerate(extra.items()):
            alias = f"#a{i}"
            expr += f", {alias} = :v{i}"
            names[alias] = k
            values[f":v{i}"] = v
    _table.update_item(
        Key={"review_id": review_id},
        UpdateExpression=expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )


def increment_progress(review_id: str):
    """Atomically increment the review's progress counter by 1. Called after each objective is scored."""
    _table.update_item(
        Key={"review_id": review_id},
        UpdateExpression="ADD progress :one",
        ExpressionAttributeValues={":one": 1},
    )


# --- S3 Storage ---

def get_content(review_id: str) -> dict:
    """Read the course content dict from S3. Called by scorer, summary, dashboard, and evidence builder."""
    resp = _s3.get_object(
        Bucket=CONTENT_BUCKET,
        Key=f"reviews/{review_id}/content.json",
    )
    return json.loads(resp["Body"].read())


def put_verdict(review_id: str, obj_id: str, verdict: dict):
    """Write a single objective's scoring verdict to S3 as verdicts/{obj_id}.json."""
    _s3.put_object(
        Bucket=CONTENT_BUCKET,
        Key=f"reviews/{review_id}/verdicts/{obj_id}.json",
        Body=json.dumps(verdict, default=str),
        ContentType="application/json",
    )


# --- Objectives ---

def _load_objectives():
    """Dynamically import objectives.py from this Lambda's own package
    directory and return its OBJECTIVES dict (the 50 scoring criteria)."""
    obj_path = Path(__file__).parent / "objectives.py"
    spec = importlib.util.spec_from_file_location("objectives", obj_path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["objectives"] = mod
    spec.loader.exec_module(mod)
    return mod.OBJECTIVES


OBJECTIVES = _load_objectives()


# --- Scoring Engine ---

class CriterionVerdict(BaseModel):
    criterion: str
    met: Literal["MET", "NOT_MET", "INSUFFICIENT_EVIDENCE"]
    evidence: str = ""


class AIVerdict(BaseModel):
    can_determine: bool = Field(
        description="False if this objective isn't judgeable from static course content"
    )
    confidence: Literal["high", "medium", "low"]
    accomplished_criteria: list[CriterionVerdict]
    exemplary_criteria: list[CriterionVerdict]
    key_findings: list[str]
    reasoning: str
    improvement_suggestions: str

MAX_CONCURRENT_CALLS = 8

SCORING_PHILOSOPHY = """You are scoring a Canvas course against a single quality objective at a time.

For each criterion, judge it independently as MET, NOT_MET, or INSUFFICIENT_EVIDENCE
(use INSUFFICIENT_EVIDENCE when the course content simply doesn't say enough either way —
don't force NOT_MET just because evidence is thin). Ground every judgment in the actual
course content provided — do not infer quality from what a "typical" or "reasonable"
course would do, only from what's actually evidenced here.

If the objective describes something that simply isn't visible from static course content
at all (e.g. live instructor behavior, response timestamps, things that only happen during
the term), set can_determine to False and mark every criterion INSUFFICIENT_EVIDENCE rather
than guessing."""

SCORE_LABELS = {0: "Developing", 1: "Accomplished", 2: "Exemplary"}


def _get_bedrock_model():
    from pydantic_ai.models.bedrock import BedrockConverseModel
    from pydantic_ai.providers.bedrock import BedrockProvider

    provider = BedrockProvider(region_name=AWS_REGION, aws_read_timeout=300)
    return BedrockConverseModel(model_name=BEDROCK_MODEL_ID, provider=provider)


_summary_agent = None


def get_summary_agent():
    """Return a plain-text (no structured output) Pydantic AI agent for the
    course summary/overview calls — built once and cached, since it's
    reused across both generate_summary and generate_overview."""
    global _summary_agent
    if _summary_agent is None:
        from pydantic_ai import Agent

        _summary_agent = Agent(
            model=_get_bedrock_model(),
            system_prompt="You write concise, specific course quality summaries in plain text. No markdown, no bullet points.",
        )
    return _summary_agent


def recompute_score(accomplished, exemplary):
    """proposed_score is never taken from the model directly — always recomputed
    from the individual criterion verdicts, so the score can't drift from the evidence."""
    if not all(c.met == "MET" for c in accomplished):
        return 0
    if exemplary and all(c.met == "MET" for c in exemplary):
        return 2
    return 1


def load_course_context(course_context_dict):
    """Flatten the crawled course_context dict into one labeled text blob —
    this becomes the static, cacheable part of the scoring agent's
    instructions, shared across all 50 objective calls."""
    chunks = [
        f"--- {k} ({v.get('title', '')}) ---\n{v['text']}"
        for k, v in course_context_dict.items()
        if v.get("text")
    ]
    return "\n\n".join(chunks)


def build_agent(course_context):
    """Build the scoring agent once per review, with the course content and
    scoring philosophy baked into its static instructions (enables Bedrock
    prompt caching across all 50 per-objective calls)."""
    from pydantic_ai import Agent
    from pydantic_ai.models.bedrock import BedrockModelSettings

    instructions = f"{SCORING_PHILOSOPHY}\n\n=== COURSE CONTENT ===\n{course_context}"
    return Agent(
        model=_get_bedrock_model(),
        output_type=AIVerdict,
        model_settings=BedrockModelSettings(
            bedrock_cache_instructions=True,
            bedrock_cache_messages=True,
        ),
        instructions=instructions,
    )


def objective_prompt(obj_id, obj):
    """Build the per-objective question sent to the scoring agent — just the
    objective's title and criteria; the course content itself lives in the
    agent's static instructions, not repeated here."""
    lines = [
        f"Objective {obj_id}: {obj['title']}",
        "\naccomplished_criteria:",
        *[f"  - {c}" for c in obj["accomplished_criteria"]],
        "\nexemplary_criteria:",
        *[f"  - {c}" for c in obj["exemplary_criteria"]],
    ]
    return "\n".join(lines)


def _base_verdict(obj_id, obj, pattern):
    """Fields every verdict has regardless of outcome — build_verdict and
    error_verdict each fill in the parts that differ on top of this."""
    return {
        "obj_id": obj_id,
        "title": obj["title"],
        "where_to_look": obj.get("where_to_look", []),
        "optional": obj.get("optional", False),
        "pattern": pattern,
    }


def build_verdict(obj_id, obj, ai: AIVerdict):
    """Turn a successful AIVerdict into the full verdict dict written to S3
    and read by the dashboard. proposed_score is recomputed here, not taken
    from the model — see recompute_score."""
    score = recompute_score(ai.accomplished_criteria, ai.exemplary_criteria) if ai.can_determine else None
    return {
        **_base_verdict(obj_id, obj, "AI" if ai.can_determine else "HUMAN"),
        "proposed_score": score,
        "score_label": SCORE_LABELS.get(score, ""),
        "confidence": ai.confidence,
        "human_judgment_required": not ai.can_determine,
        "error": False,
        "error_detail": "",
        "accomplished_criteria": [c.model_dump() for c in ai.accomplished_criteria],
        "exemplary_criteria": [c.model_dump() for c in ai.exemplary_criteria],
        "key_findings": ai.key_findings,
        "reasoning": ai.reasoning,
        "improvement_suggestions": ai.improvement_suggestions,
    }


def error_verdict(obj_id, obj, exc):
    """Build a verdict for an objective whose scoring call raised an
    exception — always pattern HUMAN, with the real exception message kept
    in error_detail so it's visible on the dashboard, not just in logs."""
    return {
        **_base_verdict(obj_id, obj, "HUMAN"),
        "proposed_score": None,
        "score_label": "",
        "confidence": "low",
        "human_judgment_required": True,
        "error": True,
        "error_detail": str(exc),
        "accomplished_criteria": [],
        "exemplary_criteria": [],
        "key_findings": [],
        "reasoning": "",
        "improvement_suggestions": "",
    }


MAX_BEDROCK_RETRIES = 3


async def _run_agent_with_retry(agent, prompt: str, obj_id: str):
    """Run the agent, retrying on Bedrock throttling (429) with backoff —
    using the provider's own retry_after hint when it gives one, otherwise
    exponential backoff with jitter. Any other error (auth, validation,
    non-throttling) is raised immediately; retrying those won't help."""
    for attempt in range(MAX_BEDROCK_RETRIES + 1):
        try:
            return await agent.run(prompt)
        except ModelHTTPError as e:
            if e.status_code != 429 or attempt == MAX_BEDROCK_RETRIES:
                raise
            wait = e.retry_after if e.retry_after else (2 ** attempt) + random.uniform(0, 1)
            logger.warning(
                "Bedrock throttled scoring %s, retrying in %.1fs (attempt %d/%d)",
                obj_id, wait, attempt + 1, MAX_BEDROCK_RETRIES,
            )
            await asyncio.sleep(wait)


async def score_one(agent, semaphore, obj_id, obj, counter, total, start_time, review_id=None):
    """Score a single objective, bounded by the semaphore so at most
    MAX_CONCURRENT_CALLS run at once. Never raises — any failure becomes an
    error_verdict instead, so one bad objective can't abort the whole run."""
    async with semaphore:
        try:
            ai_result = (await _run_agent_with_retry(agent, objective_prompt(obj_id, obj), obj_id)).output
            verdict = build_verdict(obj_id, obj, ai_result)
        except Exception as e:
            verdict = error_verdict(obj_id, obj, e)
        counter["done"] += 1
        if review_id:
            try:
                increment_progress(review_id)
            except Exception as e:
                logger.warning("progress counter update failed for review %s, obj %s: %s", review_id, obj_id, e)
        return obj_id, verdict


async def score_course_async(course_context_dict, review_id=None):
    """Score all 50 objectives concurrently and return {obj_id: verdict}.
    Task order matches OBJECTIVES' insertion order regardless of which
    finishes first — asyncio.gather preserves input order in its results."""
    course_context = load_course_context(course_context_dict)
    agent = build_agent(course_context)

    syllabus_node = course_context_dict.get(
        next((k for k in course_context_dict if k.startswith("syllabus:")), ""), {}
    )
    syllabus_is_file_only = "-> file:" in syllabus_node.get("source", "")

    semaphore = asyncio.Semaphore(MAX_CONCURRENT_CALLS)
    total = len(OBJECTIVES)
    counter = {"done": 0}
    start_time = time.monotonic()
    tasks = [
        score_one(agent, semaphore, obj_id, obj, counter, total, start_time, review_id)
        for obj_id, obj in OBJECTIVES.items()
    ]
    pairs = await asyncio.gather(*tasks)

    results = {}
    for obj_id, verdict in pairs:
        verdict["syllabus_is_file_only"] = syllabus_is_file_only
        results[obj_id] = verdict
    return results


def _aggregate_verdicts_by_section(verdicts: dict) -> dict:
    """Group scores by section, and separately collect objectives flagged
    for human judgment and objectives scoring Exemplary (2)."""
    scores_by_section = {"Essential Design": [], "Advanced Design": [], "Course Delivery": []}
    flagged, strengths = [], []

    for obj_id, v in verdicts.items():
        obj = OBJECTIVES.get(obj_id, {})
        section = obj.get("section", "")
        score = v.get("proposed_score")
        if score is not None and section in scores_by_section:
            scores_by_section[section].append(score)
        if v.get("human_judgment_required"):
            flagged.append(obj_id)
        if score == 2:
            strengths.append(f"{obj_id}: {obj.get('title', '')[:50]}")

    return {"scores_by_section": scores_by_section, "flagged": flagged, "strengths": strengths}


def _section_average(scores: list) -> float:
    """Round average of a list of scores, or 0 if the list is empty."""
    return round(sum(scores) / len(scores), 1) if scores else 0


def _build_summary_prompt(course_name: str, agg: dict) -> str:
    """Build the course-summary prompt from aggregated verdict stats."""
    by_section = agg["scores_by_section"]
    strengths = agg["strengths"]
    return f"""You are evaluating the quality of an online course called "{course_name}"
    against the OLC Course Review Scorecard.

    Summary data:
    - Essential Design: average score {_section_average(by_section["Essential Design"])}/2 across {len(by_section["Essential Design"])} objectives
    - Advanced Design: average score {_section_average(by_section["Advanced Design"])}/2 across {len(by_section["Advanced Design"])} objectives
    - Course Delivery: requires live observation ({len(by_section["Course Delivery"])} objectives)
    - Objectives scoring Exemplary (2): {len(strengths)} of 35 (Essential + Advanced)
    - Objectives flagged for human judgment: {len(agg["flagged"])}
    - Top strengths: {', '.join(strengths[:4]) if strengths else 'none yet identified'}

    Write 2-3 sentences summarizing the course's overall quality profile.
    Be specific, constructive, and direct. Name actual strengths and the most important gaps.
    Do not use generic filler. Do not start with "This course".
    Return plain text only."""


async def generate_summary(course_name: str, verdicts: dict) -> str:
    """Generate a 2-3 sentence plain-text course quality summary from the
    scored verdicts. Falls back to a generic templated summary (logged, not
    silent) if the Bedrock call fails."""
    agg = _aggregate_verdicts_by_section(verdicts)
    prompt = _build_summary_prompt(course_name, agg)

    try:
        result = await get_summary_agent().run(prompt)
        return result.output.strip()
    except Exception as e:
        logger.warning("course summary generation failed, using fallback text: %s", e)
        strengths = agg["strengths"]
        strength_level = "strong" if len(strengths) > 8 else "moderate" if len(strengths) > 4 else "developing"
        return (
            f"Course demonstrates {strength_level} design across assessed objectives. "
            f"Several objectives require human judgment or live observation to score definitively."
        )


async def generate_overview(course_name: str, content: dict) -> str:
    """Generate a 3-4 sentence factual (non-evaluative) course overview from
    the syllabus and module list. Same fallback behavior as generate_summary."""
    syllabus = content.get("syllabus", "")[:3000]
    modules = content.get("modules", [])
    module_names = [
        m.get("name", "")
        for m in modules
        if not any(
            kw in m.get("name", "").lower()
            for kw in ["start here", "module 0", "orientation", "welcome"]
        )
    ]

    prompt = f"""You are writing a brief course overview for a quality reviewer who
may not be familiar with this subject area.

Course name: {course_name}
Module titles: {', '.join(module_names[:8]) if module_names else 'not available'}
Syllabus excerpt:
{syllabus}

Write 3-4 sentences that explain:
1. What subject area or discipline this course covers
2. What students learn or are able to do after completing it
3. How the course is structured (e.g., number of units, any notable format)

Be factual and neutral. No quality judgments. No scores. No filler phrases.
Return plain text only."""

    try:
        result = await get_summary_agent().run(prompt)
        return result.output.strip()
    except Exception as e:
        logger.warning("course overview generation failed, using fallback text: %s", e)
        return f"{course_name} - course overview unavailable. See syllabus for details."


# --- Handler ---

async def _evaluate_and_summarize(review_id, content):
    """Run scoring then the two summary generations, in that order — the
    summaries describe the scored results, so they need the verdicts first."""
    course_context = content["course_context"]
    course_name = content.get("course_name", "")

    verdicts = await score_course_async(course_context, review_id)

    for obj_id, verdict in verdicts.items():
        put_verdict(review_id, obj_id, verdict)

    course_summary = await generate_summary(course_name, verdicts)
    course_overview = await generate_overview(course_name, content)

    return verdicts, course_summary, course_overview


def handler(event, context):
    """Lambda entry point. Reads course content from S3, evaluates all objectives with
    bounded-concurrency Bedrock calls, writes verdicts, generates summaries, and
    sets status to ready."""
    review_id = event["review_id"]

    try:
        content = get_content(review_id)

        verdicts, course_summary, course_overview = asyncio.run(
            _evaluate_and_summarize(review_id, content)
        )

        update_review_status(review_id, "ready", {
            "course_summary": course_summary,
            "course_overview": course_overview,
        })

        return {
            "status": "evaluated",
            "review_id": review_id,
            "objectives_evaluated": len(verdicts),
        }

    except Exception as e:
        logger.exception("Evaluation failed for review %s", review_id)
        update_review_status(review_id, "error", {
            "error": f"{type(e).__name__}: evaluation failed",
        })
        raise
