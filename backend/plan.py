"""Improvement Plan Lambda — generates an AI improvement plan asynchronously.

INPUT (async Lambda invoke from API Lambda):
    {
        "course_id": str   — Canvas LMS course ID (e.g. "12345")
    }

OUTPUT:
    {
        "status": "ready"|"error"
    }

SIDE EFFECTS:
    - Reads the latest finalized review from DynamoDB history table for this course
    - Reads content.json from S3 to extract broken link details (for E20 objective)
    - Invokes Bedrock (Claude) via PydanticAI Agent with structured output (ImprovementPlan):
        summary  — 1-2 sentence overall improvement strategy
        items[]  — ordered from easiest to hardest, each with:
            obj_id, title, current_score, target_score, difficulty (easy|moderate|hard),
            effort_hours, what_to_do, why_it_matters, quick_wins[], broken_links[]
    - Filters out objectives already at Exemplary (score 2)
    - Enforces E20 (broken links/spelling) at end of list regardless of difficulty
    - Writes plan JSON to S3 at plans/{course_id}/improvement.json with status "ready"
    - On failure: writes {"status": "error", "error": "..."} to S3, then re-raises
"""

import importlib
import json
import logging
import os
import random
import sys
import time
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.exceptions import ModelHTTPError
from pydantic_ai.models.bedrock import BedrockModelSettings


# --- Config ---

logger = logging.getLogger("plan")

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
HISTORY_TABLE = os.environ.get("HISTORY_TABLE", "")
CONTENT_BUCKET = os.environ.get("CONTENT_BUCKET", "")
BEDROCK_MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.anthropic.claude-sonnet-4-6")

_dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
_s3 = boto3.client("s3", region_name=AWS_REGION)


# --- Bedrock Model ---

def _get_bedrock_model():
    from pydantic_ai.models.bedrock import BedrockConverseModel
    from pydantic_ai.providers.bedrock import BedrockProvider

    provider = BedrockProvider(region_name=AWS_REGION, aws_read_timeout=300)
    return BedrockConverseModel(model_name=BEDROCK_MODEL_ID, provider=provider)


# --- DynamoDB ---

_history_table = _dynamodb.Table(HISTORY_TABLE)


def get_course_history(course_id: str, limit: int = 20) -> list:
    """Query the history table for a course's past reviews, returned newest-first up to `limit`."""
    resp = _history_table.query(
        KeyConditionExpression=Key("course_id").eq(course_id),
        ScanIndexForward=False,
        Limit=limit,
    )
    return resp.get("Items", [])


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


# --- Pydantic Models ---

class ImprovementItem(BaseModel):
    """One actionable improvement recommendation for a single OLC objective."""

    obj_id: str
    title: str
    current_score: int
    target_score: int
    difficulty: str = Field(description="easy | moderate | hard")
    effort_hours: str
    what_to_do: str
    why_it_matters: str
    quick_wins: list[str] = Field(default_factory=list)
    broken_links: list[str] = Field(default_factory=list, description="URLs broken at time of scan (E20 only)")


class ImprovementPlan(BaseModel):
    """AI-generated improvement plan: a summary plus ordered list of actionable items from easiest to hardest."""

    summary: str
    items: list[ImprovementItem]


# --- Handler ---

def _put_plan(plan_key: str, body: dict):
    """Write a plan result (success or error) to S3 — the one write path
    both the success and failure branches of handler share."""
    _s3.put_object(
        Bucket=CONTENT_BUCKET, Key=plan_key,
        Body=json.dumps(body, default=str),
        ContentType="application/json",
    )


def _build_scorecard_text(objectives: dict) -> str:
    """Render the review's per-objective scores as plain text, one line per
    objective, sorted by section letter then number (E1, E2, ..., A1, ...)."""
    lines = []
    for obj_id in sorted(objectives.keys(), key=lambda x: (x[0], int(x[1:]))):
        score = objectives[obj_id]
        obj_def = OBJECTIVES.get(obj_id, {})
        title = obj_def.get("title", obj_id)
        section = obj_def.get("section", "")
        lines.append(f"{obj_id} ({section}): score={score}/2 — {title}")
    return "\n".join(lines)


def _build_broken_links_text(review_id: str) -> str:
    """Fetch E20 link-check details from content.json and render them as a
    prompt-ready text block. Returns "" if there's no review_id, no
    content.json, or no broken/unreachable/timed-out links to report —
    failures here are logged but non-fatal, since a plan can still be
    generated without link detail."""
    if not review_id:
        return ""
    try:
        content_resp = _s3.get_object(Bucket=CONTENT_BUCKET, Key=f"reviews/{review_id}/content.json")
        content = json.loads(content_resp["Body"].read())
        links = content.get("quality_checks", {}).get("links", {})
        problem_links = links.get("broken", []) + links.get("unreachable", []) + links.get("timeout", [])
        if not problem_links:
            return ""

        link_lines = []
        for lnk in problem_links[:20]:
            url = lnk if isinstance(lnk, str) else lnk.get("url", str(lnk))
            detail = "" if isinstance(lnk, str) else f" ({lnk.get('detail', 'broken')})"
            link_lines.append(f"  - {url}{detail}")

        return (
            f"\n\nBROKEN/UNREACHABLE LINKS DETECTED ({len(problem_links)} total, showing up to 20):\n"
            + "\n".join(link_lines)
            + "\n\nNote: These links were broken at the time of the last automated scan "
            "and may need re-verification."
        )
    except Exception as e:
        logger.warning("Could not read content.json for link details: %s", e)
        return ""


def _build_improvement_prompt(course_id: str, latest: dict, scorecard_text: str, broken_links_text: str) -> str:
    """Assemble the full user prompt sent to the improvement-plan agent."""
    total = latest.get("total_score", 0)
    total_max = latest.get("total_max", 100)
    return f"""Analyze this OLC course scorecard and generate an improvement plan ordered from easiest to hardest changes.

COURSE: {latest.get('course_name', course_id)}
TOTAL SCORE: {total}/{total_max} ({round(total/total_max*100)}%)
Essential: {latest.get('essential_subtotal', 0)}/40
Advanced: {latest.get('advanced_subtotal', 0)}/30
Delivery: {latest.get('delivery_subtotal', 0)}/30

SCORECARD (all 50 objectives with current scores):
{scorecard_text}

INSTRUCTIONS:
- Only include objectives scored 0 (Developing) or 1 (Accomplished). Do NOT include objectives already scored 2 (Exemplary) — they need no improvement.
- Order from EASIEST/quickest wins to HARDEST/most time-intensive changes
- For each item, provide specific, actionable guidance (not generic advice)
- Consider that Essential Design objectives (E1-E20) are highest priority
- "easy" = can be done in under 1 hour (e.g., adding a statement, linking a resource)
- "moderate" = 1-4 hours (e.g., creating a new page, restructuring content)
- "hard" = 4+ hours (e.g., redesigning assessments, creating new multimedia)
- Include 1-2 quick_wins per item (concrete first steps)
- Provide a 1-2 sentence summary of the overall improvement strategy
- IMPORTANT: If E20 (broken links/spelling) is included, it MUST be the LAST item in the list regardless of difficulty. Include the specific broken URLs in the what_to_do and broken_links fields.{broken_links_text}"""


def _finalize_plan_items(plan: ImprovementPlan) -> ImprovementPlan:
    """Drop any Exemplary (score 2) objectives the model included anyway,
    then force E20 to the end of the list regardless of the model's
    difficulty-based ordering — both are enforced here rather than trusted
    to the prompt alone."""
    plan.items = [i for i in plan.items if i.current_score < 2]
    e20_items = [i for i in plan.items if i.obj_id == "E20"]
    other_items = [i for i in plan.items if i.obj_id != "E20"]
    plan.items = other_items + e20_items
    return plan


MAX_BEDROCK_RETRIES = 3


def _run_agent_with_retry(agent, prompt: str):
    """Run the agent synchronously, retrying on Bedrock throttling (429)
    with backoff — same pattern as evaluation.py's async version, adapted
    for plan.py's single synchronous call."""
    for attempt in range(MAX_BEDROCK_RETRIES + 1):
        try:
            return agent.run_sync(prompt)
        except ModelHTTPError as e:
            if e.status_code != 429 or attempt == MAX_BEDROCK_RETRIES:
                raise
            wait = e.retry_after if e.retry_after else (2 ** attempt) + random.uniform(0, 1)
            logger.warning("Bedrock throttled generating plan, retrying in %.1fs (attempt %d/%d)",
                            wait, attempt + 1, MAX_BEDROCK_RETRIES)
            time.sleep(wait)


def handler(event, context):
    """Lambda entry point. Reads the latest finalized scorecard from the history table, prompts Bedrock to generate an improvement plan ordered from easiest to hardest, and writes the result to S3. Only includes objectives scoring below Exemplary."""
    course_id = event["course_id"]
    plan_key = f"plans/{course_id}/improvement.json"

    try:
        reviews = get_course_history(course_id)
        if not reviews:
            _put_plan(plan_key, {"status": "error", "error": "No reviews found"})
            return {"status": "error"}

        latest = reviews[0]
        scorecard_text = _build_scorecard_text(latest.get("objectives", {}))
        broken_links_text = _build_broken_links_text(latest.get("review_id", ""))
        user_prompt = _build_improvement_prompt(course_id, latest, scorecard_text, broken_links_text)

        agent = Agent(
            model=_get_bedrock_model(),
            output_type=ImprovementPlan,
            model_settings=BedrockModelSettings(bedrock_cache_instructions=True),
            system_prompt=(
                "You are an instructional design consultant specializing in OLC Quality Scorecard standards. "
                "Generate practical, specific improvement plans for Canvas courses. Be concrete — reference "
                "the actual objective requirements. Order items strictly from easiest to hardest."
            ),
        )
        plan = _finalize_plan_items(_run_agent_with_retry(agent, user_prompt).output)

        output = plan.model_dump()
        output["status"] = "ready"
        _put_plan(plan_key, output)
        return {"status": "ready"}

    except Exception as e:
        logger.exception("Plan generation failed")
        _put_plan(plan_key, {"status": "error", "error": f"{type(e).__name__}: plan generation failed"})
        raise