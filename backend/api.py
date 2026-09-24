"""API Lambda — HTTP router behind API Gateway proxy integration.

INPUT (API Gateway proxy event):
    {
        "httpMethod": "GET"|"POST"|"PUT"|"DELETE"|"OPTIONS",
        "path": str,                        — e.g. "/api/review/start"
        "body": str|null,                   — JSON string for POST/PUT requests
        "queryStringParameters": dict|null, — e.g. {"account_id": "123"}
        "headers": dict                     — includes Authorization header (Cognito JWT)
    }

OUTPUT (API Gateway proxy response):
    {
        "statusCode": int,                  — 200, 400, 404, etc.
        "headers": {                        — includes CORS headers
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json", ...
        },
        "body": str                         — JSON-encoded response payload
    }

ROUTES:
    GET    /api/accounts                              — list Canvas accounts visible to API token
    GET    /api/courses                               — list courses (?account_id= optional filter)
    POST   /api/review/start                          — create review session, start Step Function pipeline
           body: {"course_id": str}
           returns: {"review_id": str, "status": "started"}
    GET    /api/review/{id}/status                    — poll review progress (ingesting → extracting → ready)
    GET    /api/review/{id}/objective/{obj_id}        — single objective AI verdict + human score
    GET    /api/review/{id}/all                       — all 50 objectives: proposed scores, confirmations
    POST   /api/review/{id}/score                     — save human reviewer score (0/1/2) for one objective
           body: {"obj_id": str, "score": 0|1|2, "rationale": str}
    GET    /api/review/{id}/export                    — full JSON scorecard with section subtotals
    GET    /api/review/{id}/dashboard                 — dashboard: score grid, triage list, structural audit
    POST   /api/review/{id}/finalize                  — lock review, generate PDF, write history, trigger plan
    GET    /api/review/{id}/pdf                       — presigned S3 URL for finalized scorecard PDF
    GET    /api/courses/{id}/history                  — past finalized reviews, newest first
    DELETE /api/courses/{id}/history/{completed_at}   — delete one history entry + its PDF
    POST   /api/courses/{id}/improvement-plan         — trigger async AI improvement plan generation
    GET    /api/courses/{id}/improvement-plan         — fetch plan JSON (status: generating|ready|error)

SIDE EFFECTS:
    - DynamoDB reads/writes to reviews table and history table
    - S3 reads/writes for content, verdicts, PDFs, improvement plans
    - Starts Step Function executions (review pipeline)
    - Invokes Plan Lambda asynchronously (on finalize)
    - Canvas API calls (list accounts/courses, pagination with scope guard)
"""

import importlib
import json
import logging
import os
import random
import re
import sys
import time
import uuid
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse

import boto3
import requests
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger("canvas_olc_insights")


# --- Config ---

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
REVIEWS_TABLE = os.environ.get("REVIEWS_TABLE", "")
HISTORY_TABLE = os.environ.get("HISTORY_TABLE", "")
CONTENT_BUCKET = os.environ.get("CONTENT_BUCKET", "")

_TOKEN_TTL_SECONDS = 300
_cached_token: str | None = None
_token_fetched_at: float = 0.0


def _resolve_canvas_token() -> str:
    """Fetch the raw Canvas token — a plain env var if set, otherwise from
    SSM SecureString. Called by get_canvas_token whenever the cache expires."""
    token = os.environ.get("CANVAS_API_TOKEN", "")
    if token:
        return token
    ssm_param = os.environ.get("CANVAS_API_TOKEN_SSM_PARAM", "")
    if not ssm_param:
        return ""
    try:
        _ssm = boto3.client("ssm", region_name=AWS_REGION)
        return _ssm.get_parameter(Name=ssm_param, WithDecryption=True)["Parameter"]["Value"]
    except Exception:
        logger.warning("Failed to fetch Canvas token from SSM param %s", ssm_param)
        return ""


def get_canvas_token() -> str:
    """Return the Canvas token, cached for _TOKEN_TTL_SECONDS to avoid an SSM
    call on every request — re-fetches once the cache expires or after
    invalidate_canvas_token() clears it on a 401."""
    global _cached_token, _token_fetched_at
    now = time.monotonic()
    if _cached_token is not None and (now - _token_fetched_at) < _TOKEN_TTL_SECONDS:
        return _cached_token
    _cached_token = _resolve_canvas_token()
    _token_fetched_at = now
    return _cached_token


def invalidate_canvas_token():
    global _cached_token, _token_fetched_at
    _cached_token = None
    _token_fetched_at = 0.0


CANVAS_BASE_URL = os.environ.get("CANVAS_BASE_URL", "https://your-canvas-instance.instructure.com")

_dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
_s3 = boto3.client("s3", region_name=AWS_REGION)


# --- Canvas API Client ---
#
# canvas_get/paginate verify the URL matches a known Canvas endpoint shape —
# catches bugs, not authorization. The token's own grant from Canvas is the
# actual authorization boundary, since this app shows whatever courses that
# token's subaccount can see rather than restricting to a fixed allowlist.

_CONTENT_ENDPOINT_PATTERNS = [
    re.compile(p) for p in [
        r"^/api/v1/courses/\d+$",
        r"^/api/v1/courses/\d+/modules$",
        r"^/api/v1/courses/\d+/modules/\d+$",
        r"^/api/v1/courses/\d+/assignments$",
        r"^/api/v1/courses/\d+/assignments/\d+$",
        r"^/api/v1/courses/\d+/assignment_groups$",
        r"^/api/v1/courses/\d+/rubrics$",
        r"^/api/v1/courses/\d+/rubrics/\d+$",
        r"^/api/v1/courses/\d+/files$",
        r"^/api/v1/courses/\d+/files/\d+$",
        r"^/api/v1/courses/\d+/pages$",
        r"^/api/v1/courses/\d+/pages/[\w-]+$",
        r"^/api/v1/courses/\d+/discussion_topics$",
        r"^/api/v1/courses/\d+/discussion_topics/\d+$",
        r"^/api/v1/courses/\d+/front_page$",
        r"^/api/v1/courses/\d+/quizzes$",
        r"^/api/v1/courses/\d+/quizzes/\d+$",
        r"^/api/v1/accounts/\d+/courses$",
        r"^/api/v1/accounts$",
        r"^/api/v1/courses$",
        r"^/api/v1/calendar_events$",
    ]
]


class CanvasScopeViolation(Exception):
    """Raised when a Canvas API call doesn't match any known endpoint shape."""


class CanvasIngestionError(Exception):
    """Raised when a Canvas API call fails after retries."""


def _check_canvas_scope(url: str):
    """Verify the URL matches one of Canvas's known content-endpoint shapes.
    Not an authorization check — the Canvas token's own grant is what
    actually authorizes access. This just catches calls to something that
    isn't a Canvas content endpoint at all, before it reaches the network."""
    path = urlparse(url).path
    for pattern in _CONTENT_ENDPOINT_PATTERNS:
        if pattern.match(path):
            return
    raise CanvasScopeViolation(f"no known endpoint pattern matched for {path}")


def _canvas_headers():
    """Return the Authorization header dict for Canvas API calls."""
    return {"Authorization": f"Bearer {get_canvas_token()}"}


def _canvas_get(url: str, **kwargs) -> requests.Response:
    """Scope-checked GET with automatic token refresh on 401."""
    _check_canvas_scope(url)
    resp = requests.get(url, headers=_canvas_headers(), **kwargs)
    if resp.status_code == 401:
        invalidate_canvas_token()
        resp = requests.get(url, headers=_canvas_headers(), **kwargs)
    return resp


def _paginate(url: str, params: dict = None, max_retries: int = 4) -> list:
    """Follow Canvas API pagination (Link header) and return all results as a flat list. Retries transient errors with exponential backoff."""
    results = []
    next_url = url
    next_params = params
    while next_url:
        resp = None
        for attempt in range(max_retries):
            resp = _canvas_get(next_url, params=next_params, timeout=20)
            if resp.status_code == 200:
                break
            retryable = resp.status_code in (403, 429, 500, 502, 503, 504)
            if not retryable or attempt == max_retries - 1:
                raise CanvasIngestionError(
                    f"Canvas API call to {next_url} failed with status {resp.status_code} "
                    f"after {attempt + 1} attempt(s): {resp.text[:200]}"
                )
            sleep_time = (2 ** attempt) + random.uniform(0, 1)
            logger.warning(
                "canvas call retrying url=%s status=%d attempt=%d",
                next_url, resp.status_code, attempt + 1,
            )
            time.sleep(sleep_time)

        data = resp.json()
        if isinstance(data, list):
            results.extend(data)
        else:
            return data
        next_url = None
        next_params = None
        for part in resp.headers.get("Link", "").split(","):
            if 'rel="next"' in part:
                next_url = part.split(";")[0].strip().strip("<>")
    return results


# --- DynamoDB ---

_table = _dynamodb.Table(REVIEWS_TABLE)
_history_table = _dynamodb.Table(HISTORY_TABLE)


def get_review(review_id: str) -> dict:
    """Fetch a review session from DynamoDB by its ID. Returns empty dict if not found."""
    resp = _table.get_item(Key={"review_id": review_id})
    return resp.get("Item", {})


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


def save_score(review_id: str, obj_id: str, score: int, rationale: str, was_override: bool):
    """Persist a human reviewer's confirmed score for one objective into the review's scores map."""
    _table.update_item(
        Key={"review_id": review_id},
        UpdateExpression="SET scores.#oid = :sc",
        ExpressionAttributeNames={"#oid": obj_id},
        ExpressionAttributeValues={
            ":sc": {
                "score": score,
                "rationale": rationale,
                "scored_at": datetime.now().isoformat(),
                "was_override": was_override,
            }
        },
    )


def put_history_item(course_id: str, completed_at: str, scorecard: dict):
    """Write a finalized review snapshot to the history table (course_id + completed_at as composite key)."""
    _history_table.put_item(
        Item={"course_id": course_id, "completed_at": completed_at, **scorecard}
    )


def get_course_history(course_id: str, limit: int = 20) -> list:
    """Query the history table for a course's past reviews, returned newest-first up to `limit`."""
    resp = _history_table.query(
        KeyConditionExpression=Key("course_id").eq(course_id),
        ScanIndexForward=False,
        Limit=limit,
    )
    return resp.get("Items", [])


# --- S3 Storage ---

def get_content(review_id: str) -> dict:
    """Read the course content dict from S3. Called by scorer, summary, dashboard, and evidence builder."""
    resp = _s3.get_object(
        Bucket=CONTENT_BUCKET,
        Key=f"reviews/{review_id}/content.json",
    )
    return json.loads(resp["Body"].read())


def get_verdict(review_id: str, obj_id: str) -> dict:
    """Read a single objective's verdict from S3. Returns empty dict if not yet scored."""
    try:
        resp = _s3.get_object(
            Bucket=CONTENT_BUCKET,
            Key=f"reviews/{review_id}/verdicts/{obj_id}.json",
        )
        return json.loads(resp["Body"].read())
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            return {}
        raise


def list_verdicts(review_id: str) -> dict:
    """Load all verdict JSONs for a review from S3 and return them as a dict keyed by obj_id."""
    prefix = f"reviews/{review_id}/verdicts/"
    resp = _s3.list_objects_v2(Bucket=CONTENT_BUCKET, Prefix=prefix)
    verdicts = {}
    for obj in resp.get("Contents", []):
        key = obj["Key"]
        obj_id = key.replace(prefix, "").replace(".json", "")
        data = _s3.get_object(Bucket=CONTENT_BUCKET, Key=key)
        verdicts[obj_id] = json.loads(data["Body"].read())
    return verdicts



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


# --- API Setup ---

REVIEW_STATE_MACHINE_ARN = os.environ.get("REVIEW_STATE_MACHINE_ARN", "")
PLAN_FUNCTION_NAME = os.environ.get("PLAN_FUNCTION_NAME", "canvas-olc-insights-plan")

_lambda_client = boto3.client("lambda", region_name=AWS_REGION)
_sfn = boto3.client("stepfunctions", region_name=AWS_REGION)

# Wildcard origin is intentional: API Gateway enforces Cognito JWT auth on all
# routes, which is the real security boundary. The CloudFront URL is dynamic and
# cannot be passed here without a circular CDK dependency.
_CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
}


class HttpError(Exception):
    """Raised by route handlers to return an HTTP error response to the client."""

    def __init__(self, status_code: int, detail: str = ""):
        self.status_code = status_code
        self.detail = detail


class _DecimalAwareEncoder(json.JSONEncoder):
    """DynamoDB's boto3 client returns all numbers as Decimal, which isn't
    natively JSON-serializable. json.dumps(..., default=str) used to be the
    fallback here — but that turns every DynamoDB-sourced number into a JSON
    *string* (e.g. score 0 becomes "0"), which silently breaks any frontend
    code doing strict numeric comparison (s === 0) against it. This encoder
    converts Decimal to a real int (when whole) or float instead, so the
    JSON type stays a number."""

    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def _json_response(status_code: int, body):
    """Build an API Gateway proxy-integration response dict with CORS headers and JSON body."""
    return {
        "statusCode": status_code,
        "headers": {**_CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(body, cls=_DecimalAwareEncoder),
    }


def _body(event) -> dict:
    """Parse the JSON request body from an API Gateway proxy event."""
    raw = event.get("body") or "{}"
    return json.loads(raw)


def _qs(event, key: str, default=None):
    """Read a single query-string parameter from the API Gateway event."""
    params = event.get("queryStringParameters") or {}
    return params.get(key, default)


# --- Route handlers ---

def _list_accounts(event, match):
    """GET /api/accounts — Return all Canvas accounts visible to the configured API token."""
    url = f"{CANVAS_BASE_URL}/api/v1/accounts"
    raw = _paginate(url, params={"per_page": "100"})
    accounts = [
        {
            "id": a["id"],
            "name": a.get("name", "Unnamed"),
            "parent_account_id": a.get("parent_account_id"),
            "workflow_state": a.get("workflow_state", ""),
        }
        for a in raw
    ]
    return {"accounts": accounts}


def _list_courses(event, match):
    """GET /api/courses — Return courses, optionally filtered by ?account_id."""
    account_id = _qs(event, "account_id")
    if account_id:
        url = f"{CANVAS_BASE_URL}/api/v1/accounts/{account_id}/courses"
    else:
        url = f"{CANVAS_BASE_URL}/api/v1/courses"
    raw = _paginate(url, params={"per_page": "100"})
    courses = [
        {
            "id": c["id"],
            "name": c.get("name", "Unnamed"),
            "course_code": c.get("course_code", ""),
            "workflow_state": c.get("workflow_state", ""),
        }
        for c in raw
    ]
    return {"courses": courses}


def _start_review(event, match):
    """POST /api/review/start — Create a new review session and kick off async ingestion."""
    body = _body(event)
    course_id = body.get("course_id")
    if not course_id:
        raise HttpError(400, "course_id is required")

    review_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()

    _table.put_item(Item={
        "review_id": review_id,
        "course_id": course_id,
        "course_name": "",
        "status": "ingesting",
        "progress": 0,
        "total": 50,
        "started_at": now,
        "scores": {},
        "course_summary": "",
        "course_overview": "",
    })

    _sfn.start_execution(
        stateMachineArn=REVIEW_STATE_MACHINE_ARN,
        name=f"review-{review_id}",
        input=json.dumps({"review_id": review_id, "course_id": course_id}),
    )

    return {"review_id": review_id, "status": "started"}


def _get_status(event, match):
    """GET /api/review/{review_id}/status — Return current review progress and status."""
    review_id = match.group("review_id")
    r = get_review(review_id)
    if not r:
        raise HttpError(404, "Review not found")
    return {
        "review_id": review_id,
        "status": r.get("status"),
        "progress": r.get("progress", 0),
        "total": r.get("total", 50),
        "course_id": r.get("course_id", ""),
        "course_name": r.get("course_name", ""),
        "error": r.get("error"),
    }


def _get_objective(event, match):
    """GET /api/review/{review_id}/objective/{obj_id} — Return the AI verdict for one objective, merged with any human score."""
    review_id = match.group("review_id")
    obj_id = match.group("obj_id")
    r = get_review(review_id)
    if not r:
        raise HttpError(404, "Review not found")

    verdict = get_verdict(review_id, obj_id)
    if not verdict:
        raise HttpError(404, f"Verdict for {obj_id} not ready yet")

    scores = r.get("scores", {})
    verdict["human_score"] = scores.get(obj_id, {}).get("score")
    verdict["human_rationale"] = scores.get(obj_id, {}).get("rationale", "")
    verdict["confirmed"] = obj_id in scores
    return verdict


def _get_all_verdicts(event, match):
    """GET /api/review/{review_id}/all — Return a summary of all 50 objectives with AI proposals and human confirmations."""
    review_id = match.group("review_id")
    r = get_review(review_id)
    if not r:
        raise HttpError(404, "Review not found")

    verdicts = list_verdicts(review_id)
    scores = r.get("scores", {})
    result = []

    for obj_id in OBJECTIVES:
        obj = OBJECTIVES[obj_id]
        verdict = verdicts.get(obj_id, {})
        score_record = scores.get(obj_id, {})
        result.append({
            "obj_id": obj_id,
            "title": obj["title"],
            "section": obj["section"],
            "optional": obj.get("optional", False),
            "human_judgment": verdict.get("human_judgment_required", False),
            "pattern": verdict.get("pattern", ""),
            "proposed_score": verdict.get("proposed_score"),
            "proposed_label": verdict.get("score_label"),
            "confidence": verdict.get("confidence"),
            "human_score": score_record.get("score"),
            "human_rationale": score_record.get("rationale", ""),
            "confirmed": obj_id in scores,
            "ready": obj_id in verdicts,
        })

    return {
        "review_id": review_id,
        "course_name": r.get("course_name", ""),
        "status": r.get("status"),
        "objectives": result,
        "confirmed_count": len(scores),
    }


def _save_score(event, match):
    """POST /api/review/{review_id}/score — Save a human reviewer's confirmed score (0/1/2) for one objective."""
    review_id = match.group("review_id")
    body = _body(event)
    obj_id = body.get("obj_id", "")
    score = body.get("score")
    rationale = body.get("rationale", "")

    r = get_review(review_id)
    if not r:
        raise HttpError(404, "Review not found")
    if score not in (0, 1, 2):
        raise HttpError(400, "Score must be 0, 1, or 2")

    verdict = get_verdict(review_id, obj_id)
    was_override = score != verdict.get("proposed_score")
    save_score(review_id, obj_id, score, rationale, was_override)
    return {"ok": True, "obj_id": obj_id, "score": score}


def _build_objective_detail(obj_id: str, obj: dict, score_rec: dict, verdict: dict) -> dict:
    """Build one objective's export detail — score, AI proposal, rationale,
    and the findings/suggestions carried over from its verdict."""
    sc = score_rec.get("score")
    return {
        "title": obj["title"],
        "section": obj["section"],
        "optional": obj.get("optional", False),
        "score": sc,
        "score_label": ["Developing", "Accomplished", "Exemplary"][sc] if sc is not None else None,
        "rationale": score_rec.get("rationale", ""),
        "ai_proposed_score": verdict.get("proposed_score"),
        "was_override": score_rec.get("was_override", False),
        "key_findings": verdict.get("key_findings", []),
        "improvement_suggestions": verdict.get("improvement_suggestions", ""),
    }


def _export_scorecard(event, match):
    """GET /api/review/{review_id}/export — Build and return a full JSON scorecard with section subtotals and per-objective detail."""
    review_id = match.group("review_id")
    r = get_review(review_id)
    if not r:
        raise HttpError(404, "Review not found")

    scores = r.get("scores", {})
    verdicts = list_verdicts(review_id)

    essential_total = sum(v["score"] for k, v in scores.items() if k.startswith("E"))
    advanced_total = sum(v["score"] for k, v in scores.items() if k.startswith("A"))
    delivery_total = sum(v["score"] for k, v in scores.items() if k.startswith("D"))

    objectives_detail = {
        obj_id: _build_objective_detail(obj_id, obj, scores.get(obj_id, {}), verdicts.get(obj_id, {}))
        for obj_id, obj in OBJECTIVES.items()
    }

    total = essential_total + advanced_total + delivery_total
    return {
        "review_id": review_id,
        "course_id": r.get("course_id"),
        "course_name": r.get("course_name", ""),
        "reviewer": "QA Reviewer",
        "review_date": datetime.now().strftime("%Y-%m-%d"),
        "scorecard": {
            "essential_design": {"subtotal": essential_total, "max": 40,
                                 "objectives": {k: v for k, v in objectives_detail.items() if k.startswith("E")}},
            "advanced_design": {"subtotal": advanced_total, "max": 30,
                                "objectives": {k: v for k, v in objectives_detail.items() if k.startswith("A")}},
            "course_delivery": {"subtotal": delivery_total, "max": 30,
                                "note": "Course Delivery objectives require live course observation.",
                                "objectives": {k: v for k, v in objectives_detail.items() if k.startswith("D")}},
            "total_score": total,
            "total_max": 100,
            "percentage": round(total, 1),
        },
        "completion": {
            "total_objectives": 50,
            "scored": len(scores),
            "complete": len(scores) == 50,
        },
        "generated_at": datetime.now().isoformat(),
    }


def _needs_attention_reason(v: dict) -> str:
    """Map a verdict to the human-readable reason it needs triage. Order
    matters — checked most-specific to least-specific, same as the original."""
    if v.get("human_judgment_required"):
        return "Human judgment needed"
    if v.get("confidence") == "low":
        return "Low confidence"
    if v.get("error"):
        return "Scoring error"
    return "Needs review"


def _needs_attention(v: dict, pattern: str) -> bool:
    """True if an objective's AI verdict signals it needs human review."""
    return bool(
        v.get("human_judgment_required") or pattern == "HUMAN"
        or v.get("confidence") == "low" or v.get("error")
    )


def _build_grid_row(obj_id: str, obj: dict, v: dict, sc: dict, confirmed: bool) -> dict:
    """Build one objective's grid entry, plus everything the caller needs
    to also decide on a triage entry and a section-total contribution."""
    pattern = v.get("pattern", "")
    flagged = _needs_attention(v, pattern) and not confirmed
    return {
        "obj_id": obj_id,
        "section": obj.get("section", ""),
        "confirmed": confirmed,
        "human_score": sc.get("score"),
        "proposed_score": v.get("proposed_score"),
        "needs_attention": flagged,
        "pattern": pattern,
        "optional": obj.get("optional", False),
    }


def _build_score_grid(scores: dict, verdicts: dict) -> dict:
    """Build the per-objective score grid, the triage list of objectives
    needing human attention, and running section subtotals. Returns
    {"grid", "triage", "confirmed_count", "section_totals"}."""
    grid, triage = [], []
    confirmed_count = 0
    section_totals = {"Essential Design": 0, "Advanced Design": 0, "Course Delivery": 0}

    for obj_id, obj in OBJECTIVES.items():
        v = verdicts.get(obj_id, {})
        sc = scores.get(obj_id, {})
        row = _build_grid_row(obj_id, obj, v, sc, confirmed=obj_id in scores)
        grid.append(row)

        if row["confirmed"]:
            confirmed_count += 1
            if row["section"] in section_totals:
                section_totals[row["section"]] += row["human_score"] or 0

        if row["needs_attention"]:
            triage.append({
                "obj_id": obj_id,
                "title": obj.get("title", ""),
                "section": row["section"],
                "pattern": row["pattern"],
                "reason": _needs_attention_reason(v),
            })

    return {"grid": grid, "triage": triage, "confirmed_count": confirmed_count, "section_totals": section_totals}


def _classify_syllabus_status(content: dict) -> tuple:
    """Classify how the syllabus was obtained and whether it looks usable.
    Returns (status, detail)."""
    syllabus = content.get("syllabus", "")
    syllabus_file_only = content.get("syllabus_is_file_only", False)
    extracted_files = content.get("extracted_files", [])
    syllabus_extracted = [
        ef for ef in extracted_files
        if ef.get("status") == "EXTRACTED" and "syllabus" in (ef.get("name") or "").lower()
    ]

    syl_len = len(syllabus.strip())
    if syllabus_file_only and syllabus_extracted:
        return "file_extracted", f"Linked as file attachment, successfully extracted: {syllabus_extracted[0]['name']}"
    if syllabus_file_only:
        return "file_only", "Linked as file attachment — extraction not attempted or failed"
    if syl_len > 500:
        return "ok", f"Inline HTML ({syl_len:,} chars)"
    if syl_len > 0:
        return "warn", f"Sparse ({syl_len} chars)"
    return "empty", "No syllabus content detected"


def _build_module_stats(content: dict) -> dict:
    """Module-0/orientation detection and a count of item types across all modules."""
    modules = content.get("modules", [])
    m0_names = content.get("module_0_candidates", [])
    item_types = {}
    for m in modules:
        for item in m.get("items", []):
            t = item.get("type", "Unknown")
            item_types[t] = item_types.get(t, 0) + 1
    return {
        "modules": modules,
        "module_count": len(modules),
        "module_0_present": bool(m0_names),
        "module_0_names": m0_names,
        "module_item_types": item_types,
    }


def _build_media_stats(pages: list) -> dict:
    """Embedded-media and captioning checks across page content — flags
    Panopto videos with captions explicitly disabled, and non-Panopto media
    (YouTube/Kaltura/Vimeo) as a separate signal since captioning can't be
    verified for those the same way."""
    orientation_pages = [p for p in pages if p.get("is_orientation")]
    media_pages = [p for p in pages if p.get("has_embedded_media")]

    captions_issues = []
    for p in pages:
        for url in p.get("embedded_media_urls", []):
            if "captions=false" in url.lower():
                captions_issues.append({
                    "page": p.get("title", "unknown"),
                    "issue": "captions=false (Panopto)",
                    "url": url[:80],
                })
    non_panopto_media = [
        p for p in media_pages
        if any("youtu" in u.lower() or "kaltura" in u.lower() or "vimeo" in u.lower()
               for u in p.get("embedded_media_urls", []))
    ]

    return {
        "orientation_pages": len(orientation_pages),
        "content_pages": len(pages) - len(orientation_pages),
        "total_pages_fetched": len(pages),
        "embedded_media_pages": len(media_pages),
        "captions_issues": captions_issues,
        "non_panopto_media_pages": len(non_panopto_media),
    }


def _build_gap_and_forum_stats(content: dict) -> dict:
    """Content-gap breakdown (inaccessible files vs. external LTI tools) and
    Q&A-style discussion forum detection, both derived from content.json."""
    gaps = content.get("content_gaps", [])
    discussions = content.get("discussions", [])

    file_gaps = [g for g in gaps if g.get("type") == "file_attachment"]
    lti_gaps = [g for g in gaps if g.get("type") == "external_tool"]
    unique_tools = list({g.get("name", "Unknown") for g in lti_gaps})

    qa_forums = [d for d in discussions if any(
        kw in (d.get("title", "")).lower()
        for kw in ["q&a", "q & a", "question", "help", "cafe", "muddy", "general", "ask"]
    )]

    return {
        "discussion_count": len(discussions),
        "qa_forums_detected": len(qa_forums),
        "inaccessible_files": len(file_gaps),
        "external_tools": len(lti_gaps),
        "external_tool_names": unique_tools[:6],
    }


def _build_structural_audit(review_id: str) -> dict | None:
    """Build the dashboard's structural audit (syllabus status, module/page
    stats, caption/media issues, content gaps) from content.json. Returns
    None if content.json isn't available yet or is malformed — logged, not
    silent, so a real bug here is visible in CloudWatch instead of just
    disappearing from the dashboard with no trace."""
    try:
        content = get_content(review_id)
    except Exception as e:
        logger.warning("structural audit: could not read content.json for review %s: %s", review_id, e)
        return None

    try:
        struct = content.get("structural", {})
        pages = content.get("pages", [])

        syl_status, syl_detail = _classify_syllabus_status(content)
        module_stats = _build_module_stats(content)
        media_stats = _build_media_stats(pages)
        gap_forum_stats = _build_gap_and_forum_stats(content)

        return {
            "syllabus_status": syl_status,
            "syllabus_detail": syl_detail,
            "module_count": module_stats["module_count"],
            "module_0_present": module_stats["module_0_present"],
            "module_0_names": module_stats["module_0_names"],
            "module_item_types": module_stats["module_item_types"],
            **media_stats,
            "assignment_count": struct.get("assignment_count", 0),
            "rubric_count": struct.get("rubric_count", 0),
            "rubric_count_direct": struct.get("rubric_count_direct", 0),
            "rubric_pct": struct.get("rubric_coverage_pct", 0),
            "uses_weighted_grading": struct.get("uses_weighted_grading", False),
            "specs_grading": struct.get("specs_grading", False),
            "missing_due_dates": struct.get("assignments_without_due_date", [])[:8],
            "announcement_count": struct.get("announcement_count", 0),
            "file_count": struct.get("file_count", 0),
            "quiz_count": struct.get("quiz_count", 0),
            **gap_forum_stats,
        }
    except Exception as e:
        logger.warning("structural audit: failed to build for review %s: %s", review_id, e)
        return None


def _get_dashboard(event, match):
    """GET /api/review/{review_id}/dashboard — Return the full dashboard payload: score grid, triage list, structural audit, and section totals."""
    review_id = match.group("review_id")
    r = get_review(review_id)
    if not r:
        raise HttpError(404, "Review not found")

    verdicts = list_verdicts(review_id)
    scores = r.get("scores", {})
    grid_data = _build_score_grid(scores, verdicts)
    structural_audit = _build_structural_audit(review_id)

    totals = grid_data["section_totals"]
    total_scored = sum(totals.values())

    result = {
        "review_id": review_id,
        "course_id": r.get("course_id", ""),
        "course_name": r.get("course_name", ""),
        "course_summary": r.get("course_summary", ""),
        "course_overview": r.get("course_overview", ""),
        "status": r.get("status"),
        "confirmed_count": grid_data["confirmed_count"],
        "total_objectives": 50,
        "scores": {
            "total": total_scored,
            "max": 100,
            "essential": {"scored": totals["Essential Design"], "max": 40},
            "advanced": {"scored": totals["Advanced Design"], "max": 30},
            "delivery": {"scored": totals["Course Delivery"], "max": 30},
        },
        "triage": grid_data["triage"],
        "grid": grid_data["grid"],
    }
    if structural_audit:
        result["structural_audit"] = structural_audit
    return result


def _get_history(event, match):
    """GET /api/courses/{course_id}/history — Return past finalized reviews for this course, newest first."""
    course_id = match.group("course_id")
    reviews = get_course_history(course_id)
    result = []
    for item in reviews:
        result.append({
            "completed_at": item.get("completed_at"),
            "review_id": item.get("review_id"),
            "reviewer": item.get("reviewer", ""),
            "course_name": item.get("course_name", ""),
            "total_score": item.get("total_score", 0),
            "total_max": item.get("total_max", 100),
            "essential_subtotal": item.get("essential_subtotal", 0),
            "advanced_subtotal": item.get("advanced_subtotal", 0),
            "delivery_subtotal": item.get("delivery_subtotal", 0),
            "objectives": item.get("objectives", {}),
            "is_synthetic": item.get("is_synthetic", False),
        })
    return {"course_id": course_id, "reviews": result}


def _delete_history_entry(event, match):
    """DELETE /api/courses/{course_id}/history/{completed_at} — Remove a history entry and its associated PDF from S3."""
    course_id = match.group("course_id")
    completed_at = match.group("completed_at")

    resp = _history_table.get_item(Key={"course_id": course_id, "completed_at": completed_at})
    item = resp.get("Item")
    if not item:
        raise HttpError(404, "History entry not found")

    pdf_key = item.get("pdf_key")
    if pdf_key:
        try:
            _s3.delete_object(Bucket=CONTENT_BUCKET, Key=pdf_key)
        except ClientError:
            pass

    _history_table.delete_item(Key={"course_id": course_id, "completed_at": completed_at})
    return {"ok": True, "deleted": completed_at}


def _compute_section_totals(scores: dict) -> dict:
    """Sum confirmed scores by section prefix (E/A/D). Returns totals plus
    the objectives_map used for the history record."""
    essential = sum(v["score"] for k, v in scores.items() if k.startswith("E"))
    advanced = sum(v["score"] for k, v in scores.items() if k.startswith("A"))
    delivery = sum(v["score"] for k, v in scores.items() if k.startswith("D"))
    return {
        "essential": essential, "advanced": advanced, "delivery": delivery,
        "total": essential + advanced + delivery,
        "objectives_map": {obj_id: sc.get("score", 0) for obj_id, sc in scores.items()},
    }


def _build_pdf_data(r: dict, scores: dict, verdicts: dict, totals: dict, review_date: str) -> dict:
    """Assemble the dict pdf_generator.generate_scorecard_pdf expects — per-
    objective title/section/score/findings, plus the section subtotals."""
    objectives = {}
    for obj_id, obj in OBJECTIVES.items():
        sc = scores.get(obj_id, {})
        verdict = verdicts.get(obj_id, {})
        objectives[obj_id] = {
            "title": obj["title"],
            "section": obj["section"],
            "score": sc.get("score", 0),
            "key_findings": verdict.get("key_findings", []),
            "improvement_suggestions": verdict.get("improvement_suggestions", ""),
        }
    return {
        "course_id": r.get("course_id", ""),
        "course_name": r.get("course_name", ""),
        "reviewer": "QA Reviewer",
        "review_date": review_date,
        "total_score": totals["total"],
        "total_max": 100,
        "essential_subtotal": totals["essential"],
        "advanced_subtotal": totals["advanced"],
        "delivery_subtotal": totals["delivery"],
        "objectives": objectives,
    }


def _generate_and_upload_pdf(pdf_data: dict, course_id: str, review_id: str) -> str:
    """Render the scorecard PDF and upload it to S3, returning its key."""
    from pdf_generator import generate_scorecard_pdf

    pdf_key = f"finalized/{course_id}/{review_id}.pdf"
    _s3.put_object(
        Bucket=CONTENT_BUCKET, Body=generate_scorecard_pdf(pdf_data),
        Key=pdf_key, ContentType="application/pdf",
    )
    return pdf_key


def _record_history_and_trigger_plan(review_id: str, r: dict, totals: dict, pdf_key: str, now: str):
    """Write the finalized scorecard to the history table, mark the review
    finalized, seed a 'generating' placeholder for the improvement plan, and
    invoke the Plan Lambda asynchronously to fill it in."""
    course_id = r.get("course_id", "")
    history_item = {
        "review_id": review_id,
        "reviewer": "QA Reviewer",
        "course_name": r.get("course_name", ""),
        "total_score": totals["total"],
        "total_max": 100,
        "essential_subtotal": totals["essential"],
        "advanced_subtotal": totals["advanced"],
        "delivery_subtotal": totals["delivery"],
        "objectives": totals["objectives_map"],
        "pdf_key": pdf_key,
    }
    put_history_item(course_id, now, history_item)
    update_review_status(review_id, "finalized", {"finalized_at": now, "pdf_key": pdf_key})

    _s3.put_object(
        Bucket=CONTENT_BUCKET, Key=f"plans/{course_id}/improvement.json",
        Body=json.dumps({"status": "generating"}), ContentType="application/json",
    )
    _lambda_client.invoke(
        FunctionName=PLAN_FUNCTION_NAME, InvocationType="Event",
        Payload=json.dumps({"course_id": course_id}),
    )


def _finalize_review(event, match):
    """POST /api/review/{review_id}/finalize — Lock the review: generate PDF, write history record, and trigger improvement plan generation."""
    review_id = match.group("review_id")
    r = get_review(review_id)
    if not r:
        raise HttpError(404, "Review not found")
    if r.get("status") == "finalized":
        return {"ok": True, "completed_at": r.get("finalized_at", ""), "pdf_url": r.get("pdf_key", "")}

    scores = r.get("scores", {})
    if len(scores) < 50:
        raise HttpError(400, f"Only {len(scores)}/50 objectives scored — finalize requires all 50")

    verdicts = list_verdicts(review_id)
    now = datetime.now().isoformat()
    course_id = r.get("course_id", "")

    totals = _compute_section_totals(scores)
    pdf_data = _build_pdf_data(r, scores, verdicts, totals, review_date=now[:10])
    pdf_key = _generate_and_upload_pdf(pdf_data, course_id, review_id)
    _record_history_and_trigger_plan(review_id, r, totals, pdf_key, now)

    pdf_url = _s3.generate_presigned_url(
        "get_object", Params={"Bucket": CONTENT_BUCKET, "Key": pdf_key}, ExpiresIn=3600,
    )
    return {"ok": True, "completed_at": now, "pdf_url": pdf_url}


def _get_pdf(event, match):
    """GET /api/review/{review_id}/pdf — Return a pre-signed S3 URL for the finalized scorecard PDF."""
    review_id = match.group("review_id")
    r = get_review(review_id)
    if not r:
        raise HttpError(404, "Review not found")
    pdf_key = r.get("pdf_key")
    if not pdf_key:
        raise HttpError(404, "No PDF available — review has not been finalized")
    url = _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": CONTENT_BUCKET, "Key": pdf_key},
        ExpiresIn=3600,
    )
    return {"url": url}


def _post_improvement_plan(event, match):
    """POST /api/courses/{course_id}/improvement-plan — Trigger async generation of an AI improvement plan. Returns cached plan if already ready (unless ?force=true)."""
    course_id = match.group("course_id")
    force = _qs(event, "force", "false").lower() == "true"

    reviews = get_course_history(course_id)
    if not reviews:
        raise HttpError(404, "No reviews found for this course")

    plan_key = f"plans/{course_id}/improvement.json"

    if not force:
        try:
            resp = _s3.get_object(Bucket=CONTENT_BUCKET, Key=plan_key)
            existing = json.loads(resp["Body"].read())
            if existing.get("status") == "ready":
                return existing
        except ClientError:
            pass

    _s3.put_object(
        Bucket=CONTENT_BUCKET,
        Key=plan_key,
        Body=json.dumps({"status": "generating"}),
        ContentType="application/json",
    )

    _lambda_client.invoke(
        FunctionName=PLAN_FUNCTION_NAME,
        InvocationType="Event",
        Payload=json.dumps({"course_id": course_id}),
    )

    return {"status": "generating"}


def _get_improvement_plan(event, match):
    """GET /api/courses/{course_id}/improvement-plan — Fetch the current improvement plan JSON from S3 (may be 'generating' or 'ready')."""
    course_id = match.group("course_id")
    plan_key = f"plans/{course_id}/improvement.json"
    try:
        resp = _s3.get_object(Bucket=CONTENT_BUCKET, Key=plan_key)
        return json.loads(resp["Body"].read())
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            raise HttpError(404, "No improvement plan found")
        raise


# --- Router ---

_ROUTES = [
    ("GET",    re.compile(r"^/api/accounts$"),                                                     _list_accounts),
    ("GET",    re.compile(r"^/api/courses$"),                                                      _list_courses),
    ("POST",   re.compile(r"^/api/review/start$"),                                                 _start_review),
    ("GET",    re.compile(r"^/api/review/(?P<review_id>[^/]+)/status$"),                            _get_status),
    ("GET",    re.compile(r"^/api/review/(?P<review_id>[^/]+)/objective/(?P<obj_id>[^/]+)$"),       _get_objective),
    ("GET",    re.compile(r"^/api/review/(?P<review_id>[^/]+)/all$"),                               _get_all_verdicts),
    ("POST",   re.compile(r"^/api/review/(?P<review_id>[^/]+)/score$"),                             _save_score),
    ("GET",    re.compile(r"^/api/review/(?P<review_id>[^/]+)/export$"),                            _export_scorecard),
    ("GET",    re.compile(r"^/api/review/(?P<review_id>[^/]+)/dashboard$"),                         _get_dashboard),
    ("POST",   re.compile(r"^/api/review/(?P<review_id>[^/]+)/finalize$"),                          _finalize_review),
    ("GET",    re.compile(r"^/api/review/(?P<review_id>[^/]+)/pdf$"),                               _get_pdf),
    ("GET",    re.compile(r"^/api/courses/(?P<course_id>[^/]+)/history$"),                           _get_history),
    ("DELETE", re.compile(r"^/api/courses/(?P<course_id>[^/]+)/history/(?P<completed_at>[^/]+)$"),   _delete_history_entry),
    ("POST",   re.compile(r"^/api/courses/(?P<course_id>[^/]+)/improvement-plan$"),                  _post_improvement_plan),
    ("GET",    re.compile(r"^/api/courses/(?P<course_id>[^/]+)/improvement-plan$"),                  _get_improvement_plan),
]


def handler(event, context):
    """Lambda entry point. Dispatches API Gateway proxy events to route handlers by matching HTTP method and path against _ROUTES."""
    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    if method == "OPTIONS":
        return _json_response(200, {})

    for route_method, pattern, fn in _ROUTES:
        if method != route_method:
            continue
        m = pattern.match(path)
        if m:
            try:
                result = fn(event, m)
                return _json_response(200, result)
            except HttpError as e:
                return _json_response(e.status_code, {"detail": e.detail})

    return _json_response(404, {"detail": f"Not found: {method} {path}"})