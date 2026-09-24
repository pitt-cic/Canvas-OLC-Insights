"""Extraction Lambda — BFS crawl + structural metadata + quality checks.

INPUT (Step Function event):
    {
        "review_id": str   — unique 8-char review session ID (e.g. "a1b2c3d4")
        "course_id": str   — Canvas LMS course ID (e.g. "12345")
    }

OUTPUT (returned to Step Function):
    {
        "status": "extracted",
        "review_id": str
    }

SIDE EFFECTS:
    - Writes content.json to S3 at reviews/{review_id}/content.json containing:
        course_context   — {"kind:id": {"title", "text", "source"}} for every text node
                           (pages, assignments, quizzes, discussions, files, syllabus)
        structural       — module/assignment/rubric/discussion/file/quiz counts, grading info
        modules          — full module list with items
        pages            — fetched page content with body text, embedded media URLs, orientation flags
        discussions      — discussion topics with cleaned message text
        announcements    — announcements with cleaned text
        quality_checks   — {links: {broken, unreachable, timeout, ok_count, ...}, spelling: {flagged_terms, ...}}
        content_gaps     — inaccessible file attachments and external LTI tool references
        extracted_files  — list of files found during the crawl with extraction status
        syllabus         — plain text of syllabus (from HTML or file fallback)
        syllabus_html    — raw syllabus HTML
        syllabus_is_file_only — whether syllabus was a linked file rather than inline HTML
        course_name      — human-readable course name from Canvas
        course_id        — Canvas course ID
    - Updates DynamoDB review record status to "extracting" with course_name
    - On failure: updates status to "error" with error detail, then re-raises

DESIGN NOTE — every Canvas resource is fetched exactly once:
    Canvas's list endpoints for assignments, quizzes, discussion topics, and
    announcements already return the full body/description/message field —
    there's no need to fetch each one individually a second time, and both the
    old BFS crawl and the old structural-metadata pass were doing exactly that
    (twice, independently, with two different implementations). Only pages
    (whose list endpoint omits the body) and files (never in a list body at
    all) need a per-item fetch. The one Canvas call per resource type is
    shared by scoring text (course_context), the dashboard (structural), and
    quality checks (link/spelling) — nothing here re-fetches anything.
"""

import json
import logging
import os
import random
import socket
import ipaddress
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from urllib.parse import urlparse, urljoin

import boto3
import pdfplumber
import requests
from bs4 import BeautifulSoup
from docx import Document
from pptx import Presentation

logger = logging.getLogger("extraction")


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
REVIEWS_TABLE = os.environ.get("REVIEWS_TABLE", "")
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


# ---------------------------------------------------------------------------
# Canvas API Client
#
# Every Canvas call in this file goes through canvas_get or paginate. Both
# enforce that the URL matches a known Canvas endpoint shape (catches bugs —
# a malformed course_id, an unintended endpoint — not authorization; the
# token's own grant from Canvas is the actual authorization boundary, since
# the app now shows whatever courses that token's subaccount can see rather
# than restricting to a fixed allowlist).
# ---------------------------------------------------------------------------

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
    This isn't an authorization check — the Canvas token's own grant from
    Canvas is what actually authorizes access. This just catches calls to
    something that isn't a Canvas content endpoint at all (a bug, a
    malformed ID), before it ever reaches the network."""
    path = urlparse(url).path
    for pattern in _CONTENT_ENDPOINT_PATTERNS:
        if pattern.match(path):
            return
    raise CanvasScopeViolation(f"no known endpoint pattern matched for {path}")


def canvas_headers():
    """Return the Authorization header dict for Canvas API calls."""
    return {"Authorization": f"Bearer {get_canvas_token()}"}


def canvas_get(url: str, **kwargs) -> requests.Response:
    """Scope-checked GET with automatic token refresh on 401. `url` may be a
    full URL (pagination Link headers) or a path relative to the API root."""
    if not url.startswith("http"):
        url = f"{CANVAS_BASE_URL}/api/v1{url}"
    _check_canvas_scope(url)
    resp = requests.get(url, headers=canvas_headers(), **kwargs)
    if resp.status_code == 401:
        invalidate_canvas_token()
        resp = requests.get(url, headers=canvas_headers(), **kwargs)
    return resp


def paginate(url: str, params: dict = None, max_retries: int = 4) -> list:
    """Follow Canvas API pagination (Link header) and return all results as a
    flat list, retrying transient errors with exponential backoff."""
    results = []
    next_url = url
    next_params = params
    while next_url:
        resp = None
        for attempt in range(max_retries):
            resp = canvas_get(next_url, params=next_params, timeout=20)
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


def safe_paginate(url: str, params: dict = None) -> list:
    """Like paginate, but returns an empty list instead of raising — for
    optional endpoints where a failure shouldn't abort the whole caller."""
    try:
        return paginate(url, params)
    except CanvasIngestionError as e:
        logger.warning("paginate failed (non-fatal): %s — %s", url, e)
        return []


# ---------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# S3 Storage
# ---------------------------------------------------------------------------

def put_content(review_id: str, content: dict):
    """Write the full ingested course content dict to S3 as content.json. This is the central data artifact that all downstream Lambdas read."""
    _s3.put_object(
        Bucket=CONTENT_BUCKET,
        Key=f"reviews/{review_id}/content.json",
        Body=json.dumps(content, default=str),
        ContentType="application/json",
    )


# ---------------------------------------------------------------------------
# HTML Parsing — the single HTML-to-text implementation used everywhere
# ---------------------------------------------------------------------------

LINK_RE = re.compile(r"/courses/(\d+)/(pages|assignments|quizzes|discussion_topics|files)/([\w-]+)")


def parse_html(html: str, course_id=None) -> dict:
    """Parse a Canvas HTML field once, returning everything any caller needs:
        text        — plain text with tags stripped
        links       — same-course Canvas resource links found in <a>/<iframe>,
                      as {(kind, id), ...} (populated only if course_id given)
        media_urls  — iframe src values (embedded video/interactive content)

    Replaces what used to be two separate HTML-to-text implementations (a
    hand-rolled HTMLParser subclass for structural metadata, and BeautifulSoup
    for the BFS crawl) with one, so scoring text and dashboard text can't
    silently diverge."""
    soup = BeautifulSoup(html or "", "html.parser")

    media_urls = [tag.get("src") for tag in soup.find_all("iframe") if tag.get("src")]

    links = set()
    if course_id is not None:
        for tag in soup.find_all(["a", "iframe"]):
            href = tag.get("href") or tag.get("src") or ""
            m = LINK_RE.search(href)
            if m and m.group(1) == str(course_id):
                links.add((m.group(2), m.group(3)))

    text = soup.get_text(separator=" ", strip=True)
    return {"text": text, "links": links, "media_urls": media_urls}


# ---------------------------------------------------------------------------
# Content Gap Detection — linked files/LTI tools the API can't read
# ---------------------------------------------------------------------------

_RE_FILE_LINKS = re.compile(
    r'href=(?:"([^"]*(?:/files/|/download[^"]*|[.]pdf|[.]docx?|[.]pptx?|[.]xlsx?)[^"]*)"'
    r"|'([^']*(?:/files/|/download[^']*|[.]pdf|[.]docx?|[.]pptx?|[.]xlsx?)[^']*)')",
    re.IGNORECASE,
)
_RE_LTI_LINKS = re.compile(
    r'href=(?:"([^"]*(?:perusall|turnitin|voicethread|kaltura|panopto)[^"]*)"'
    r"|'([^']*(?:perusall|turnitin|voicethread|kaltura|panopto)[^']*)')",
    re.IGNORECASE,
)

_EXTRACTABLE_EXTENSIONS = {".pdf", ".docx"}


def extract_file_references(html: str, context_label: str = "") -> list:
    """Scan HTML for linked files and LTI tools that the API can't read, returning a list of content gap dicts used to flag inaccessible content."""
    if not html:
        return []
    gaps = []
    canvas_file_urls = [m.group(1) or m.group(2) for m in _RE_FILE_LINKS.finditer(html)]
    for url in canvas_file_urls:
        if "/files/" in url:
            continue
        ext = ""
        for e in [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"]:
            if e in url.lower():
                ext = e
                break
        if ext in _EXTRACTABLE_EXTENSIONS:
            continue
        file_type = {
            ".doc": "Word document",
            ".ppt": "PowerPoint", ".pptx": "PowerPoint",
            ".xls": "Spreadsheet", ".xlsx": "Spreadsheet",
        }.get(ext, "uploaded file")
        name_match = re.search(r"/([^/?#]+)(?:\?|$|/download)", url)
        name = name_match.group(1).replace("%20", " ") if name_match else url[:60]
        gaps.append({
            "type": "file_attachment", "file_type": file_type, "name": name,
            "url": url, "context": context_label, "accessible": False,
            "message": f"A {file_type} is linked from {context_label} but cannot be read with the current API token.",
        })
    lti_patterns = [m.group(1) or m.group(2) for m in _RE_LTI_LINKS.finditer(html)]
    for url in lti_patterns:
        tool_name = next(
            (t for t in ["Perusall", "Turnitin", "VoiceThread", "Kaltura", "Panopto"]
             if t.lower() in url.lower()),
            "External Tool",
        )
        gaps.append({
            "type": "external_tool", "file_type": "external tool content", "name": tool_name,
            "url": url, "context": context_label, "accessible": False,
            "message": f"Content hosted in {tool_name} (linked from {context_label}) is not accessible via the Canvas API.",
        })
    return gaps


def _dedupe_gaps(gaps: list) -> list:
    """Drop gaps with a URL already seen, keeping the first occurrence."""
    seen, unique = set(), []
    for g in gaps:
        if g["url"] not in seen:
            seen.add(g["url"])
            unique.append(g)
    return unique


# ---------------------------------------------------------------------------
# File Attachment Parsing (PDF / DOCX / PPTX)
# ---------------------------------------------------------------------------

def _extract_pdf_text(raw: bytes) -> str:
    """Extract text from a PDF's pages, stopping once MAX_FILE_CHARS worth of
    text has been collected — parsing pages that will only get discarded by
    the truncation cap afterward wastes real time on a large file (this is
    what caused a genuine Lambda timeout on a 400+ page textbook: the old
    version parsed every page before the cap ever got a chance to matter)."""
    chunks, total_len = [], 0
    with pdfplumber.open(BytesIO(raw)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            chunks.append(text)
            total_len += len(text)
            if total_len >= MAX_FILE_CHARS:
                break
    return "\n".join(chunks)


def _extract_docx_text(raw: bytes) -> str:
    """Extract text from a Word document's paragraphs."""
    return "\n".join(p.text for p in Document(BytesIO(raw)).paragraphs)


def _text_frame_lines(shape) -> list:
    """Non-empty lines from a shape's text frame, one per paragraph."""
    lines = ("".join(run.text for run in para.runs) for para in shape.text_frame.paragraphs)
    return [line for line in lines if line.strip()]


def _table_cell_texts(shape) -> list:
    """Non-empty cell texts from a shape's table, row by row."""
    return [cell.text for row in shape.table.rows for cell in row.cells if cell.text.strip()]


def _slide_notes_text(slide) -> list:
    """The slide's speaker notes text, as a one-item list (or empty)."""
    if slide.has_notes_slide and slide.notes_slide.notes_text_frame.text.strip():
        return [slide.notes_slide.notes_text_frame.text]
    return []


def _extract_slide_text(slide) -> list:
    """Pull text from one slide: text-frame paragraphs, table cells, and
    speaker notes."""
    chunks = []
    for shape in slide.shapes:
        if shape.has_text_frame:
            chunks.extend(_text_frame_lines(shape))
        if shape.has_table:
            chunks.extend(_table_cell_texts(shape))
    chunks.extend(_slide_notes_text(slide))
    return chunks


def _extract_pptx_text(raw: bytes) -> str:
    """Extract text from every slide in a PowerPoint file."""
    prs = Presentation(BytesIO(raw))
    chunks = []
    for slide in prs.slides:
        chunks.extend(_extract_slide_text(slide))
    return "\n".join(chunks)


_FILE_EXTRACTORS = {
    "pdf": _extract_pdf_text,
    "docx": _extract_docx_text,
    "pptx": _extract_pptx_text,
    "txt": lambda raw: raw.decode("utf-8", errors="ignore"),
    "md": lambda raw: raw.decode("utf-8", errors="ignore"),
}


def _parse_file_bytes(filename: str, raw: bytes) -> str:
    """Extract plain text from an uploaded file's bytes, dispatched by real
    file extension — always use Canvas's `filename` field, never
    `display_name` (instructors can rename display_name to anything, often
    dropping the extension entirely). Unrecognized extensions return ""."""
    ext = filename.lower().rsplit(".", 1)[-1]
    extractor = _FILE_EXTRACTORS.get(ext)
    return extractor(raw) if extractor else ""


def _fetch_file_text(file_meta: dict) -> str:
    """Download and parse one file's content, given its /files metadata."""
    raw = requests.get(file_meta["url"], headers=canvas_headers()).content
    return _parse_file_bytes(file_meta["filename"], raw)


# A single legitimately dense file we've observed in real courses tops out
# around 27,000 characters (a syllabus PDF) — 100,000 gives ~4x headroom for
# anything unusually large but still legitimate, while reliably catching a
# genuine textbook (typically 400,000+ characters) before it can blow out
# the scoring context or the per-call token budget.
MAX_FILE_CHARS = 100_000


def _truncate_if_oversized(text: str, filename: str) -> tuple:
    """Cap extracted file text at MAX_FILE_CHARS. Returns (text, gap) where
    gap is a content_gap dict if truncation happened, else None — truncation
    is flagged, never silent, so a reviewer can see a file was cut down
    rather than the scorer quietly working from a partial document."""
    if len(text) <= MAX_FILE_CHARS:
        return text, None
    gap = {
        "type": "file_truncated",
        "file_type": "oversized file",
        "name": filename,
        "url": "",
        "context": f"File: '{filename}'",
        "accessible": True,
        "message": (
            f"'{filename}' extracted to {len(text):,} characters, exceeding the "
            f"{MAX_FILE_CHARS:,}-character cap — truncated to the first "
            f"{MAX_FILE_CHARS:,} characters. Content beyond this point was not "
            f"seen by the scorer."
        ),
    }
    return text[:MAX_FILE_CHARS], gap


def _fetch_file_by_id(file_id, course_id) -> dict:
    """Fetch one file's metadata by ID and parse its text."""
    meta = canvas_get(f"/courses/{course_id}/files/{file_id}").json()
    return meta, _fetch_file_text(meta)


# ---------------------------------------------------------------------------
# Seed Lists — every Canvas resource fetched exactly once
# ---------------------------------------------------------------------------

def _fetch_seed_lists(course_id) -> dict:
    """Fetch every top-level Canvas resource once. Assignments, quizzes,
    discussion topics, and announcements already include their full body
    text in these list responses — no per-item fetch is needed for any of
    them. Only pages (body omitted from the list) and files (linked, fetched
    reactively) need individual follow-up calls, done later in the crawl."""
    base = f"/courses/{course_id}"
    with ThreadPoolExecutor(max_workers=9) as executor:
        futures = {
            "course": executor.submit(canvas_get, base, params={"include[]": "syllabus_body"}),
            "modules": executor.submit(paginate, f"{base}/modules", {"include[]": "items", "per_page": "50"}),
            "pages": executor.submit(paginate, f"{base}/pages", {"per_page": "50"}),
            "assignments": executor.submit(paginate, f"{base}/assignments", {"per_page": "50"}),
            "quizzes": executor.submit(safe_paginate, f"{base}/quizzes", {"per_page": "50"}),
            "discussions": executor.submit(paginate, f"{base}/discussion_topics", {"per_page": "50"}),
            "announcements": executor.submit(paginate, f"{base}/discussion_topics",
                                              {"only_announcements": "true", "per_page": "50"}),
            "files": executor.submit(paginate, f"{base}/files", {"per_page": "50"}),
            "rubrics_direct": executor.submit(safe_paginate, f"{base}/rubrics", {"per_page": "50"}),
        }
    seeds = {k: f.result() for k, f in futures.items()}
    seeds["course"] = seeds["course"].json()
    return seeds


def _syllabus_file_fallback(files: list) -> tuple:
    """If syllabus_body is empty/near-empty, find a 'syllabus'-named file
    among the already-fetched files list and parse it."""
    matches = [f for f in files if "syllabus" in f["display_name"].lower()]
    if not matches:
        return None, None
    file_meta = matches[0]
    return file_meta["display_name"], _fetch_file_text(file_meta)


# ---------------------------------------------------------------------------
# Crawl — builds course_context (scoring text) and tracks page raw-HTML/
# media for structural metadata, in one pass over the seed lists.
# ---------------------------------------------------------------------------

def _text_node_from_item(kind, item, id_field, title_field, body_field, course_id):
    """Build a course_context entry straight from a seed-list item's own HTML
    field (no Canvas call — see the module docstring for why this is safe
    for assignments/quizzes/discussions/announcements)."""
    node_id = item[id_field]
    parsed = parse_html(item.get(body_field), course_id)
    node = {"title": item.get(title_field, str(node_id)), "text": parsed["text"], "source": f"{kind}:{node_id}"}
    return (kind, node_id), node, parsed["links"]


def _crawl_pages(seeds, course_id) -> tuple:
    """Fetch each page's body individually (the one thing the /pages list
    doesn't include). Returns (store_entries, page_raw_html, page_media_urls,
    file_links) — file_links feeds the reactive file fetch below."""
    store, raw_html, media_urls, file_links = {}, {}, {}, set()
    for p in seeds["pages"]:
        key = ("pages", p["url"])
        try:
            data = canvas_get(f"/courses/{course_id}/pages/{p['url']}").json()
        except Exception as e:
            store[key] = {"title": p.get("title", p["url"]), "text": "", "error": str(e)}
            continue
        body = data.get("body") or ""
        parsed = parse_html(body, course_id)
        store[key] = {"title": data.get("title", p["url"]), "text": parsed["text"], "source": f"pages:{p['url']}"}
        raw_html[key] = body
        media_urls[key] = parsed["media_urls"]
        file_links |= {l for l in parsed["links"] if l[0] == "files"}
    return store, raw_html, media_urls, file_links


def _build_syllabus_node(course_id, seeds):
    """Build the syllabus's course_context entry, falling back to a linked
    file if syllabus_body is too thin. Returns (node, syllabus_html,
    file_links found in its own linked content, truncation_gaps)."""
    syllabus_html = seeds["course"].get("syllabus_body") or ""
    parsed = parse_html(syllabus_html, course_id)
    text = parsed["text"]
    gaps = []
    if len(text) < 50:
        fname, file_text = _syllabus_file_fallback(seeds["files"])
        if file_text:
            file_text, gap = _truncate_if_oversized(file_text, fname)
            if gap:
                gaps.append(gap)
            text, source = file_text, f"course.syllabus_body -> file:{fname}"
        else:
            source = "course.syllabus_body (empty, no fallback file found)"
    else:
        source = "course.syllabus_body"
    node = {"title": "Syllabus", "text": text, "source": source}
    file_links = {l for l in parsed["links"] if l[0] == "files"}
    return node, syllabus_html, file_links, gaps


_FLAT_BODY_SOURCES = [
    ("assignments", "assignments", "id", "name", "description"),
    ("quizzes", "quizzes", "id", "title", "description"),
    ("discussion_topics", "discussions", "id", "title", "message"),
    ("discussion_topics", "announcements", "id", "title", "message"),
]


def _crawl_flat_body_nodes(seeds, course_id) -> tuple:
    """Build course_context entries for every assignment/quiz/discussion/
    announcement — all read straight from their seed-list item's own body
    field, no per-item Canvas call (see module docstring). Returns
    (store_entries, file_links found in their content)."""
    store, file_links = {}, set()
    for kind, seed_key, id_field, title_field, body_field in _FLAT_BODY_SOURCES:
        for item in seeds[seed_key]:
            node_key, node, links = _text_node_from_item(kind, item, id_field, title_field, body_field, course_id)
            store[node_key] = node
            file_links |= {l for l in links if l[0] == "files"}
    return store, file_links


def _crawl_linked_files(file_links: set, course_id) -> tuple:
    """Fetch and parse every file actually linked from other content — never
    the whole course file list, only what was actually referenced. Returns
    (store_entries, truncation_gaps)."""
    store, gaps = {}, []
    for _, file_id in file_links:
        try:
            meta, text = _fetch_file_by_id(file_id, course_id)
            text, gap = _truncate_if_oversized(text, meta["display_name"])
            if gap:
                gaps.append(gap)
            store[("files", file_id)] = {"title": meta["display_name"], "text": text, "source": f"files:{file_id}"}
        except Exception as e:
            store[("files", file_id)] = {"title": str(file_id), "text": "", "error": str(e)}
    return store, gaps


def _crawl_course(course_id, seeds) -> dict:
    """Build course_context text for every node, plus the syllabus and page
    raw-HTML/media data structural metadata needs. Returns a dict with keys:
    store, syllabus_html, page_raw_html, page_media_urls, truncation_gaps."""
    store = {}

    syllabus_node, syllabus_html, file_links, syllabus_gaps = _build_syllabus_node(course_id, seeds)
    store[("syllabus", course_id)] = syllabus_node

    flat_store, flat_file_links = _crawl_flat_body_nodes(seeds, course_id)
    store.update(flat_store)
    file_links |= flat_file_links

    page_store, page_raw_html, page_media_urls, page_file_links = _crawl_pages(seeds, course_id)
    store.update(page_store)
    file_links |= page_file_links

    linked_file_store, linked_file_gaps = _crawl_linked_files(file_links, course_id)
    store.update(linked_file_store)

    return {
        "store": store,
        "syllabus_html": syllabus_html,
        "page_raw_html": page_raw_html,
        "page_media_urls": page_media_urls,
        "truncation_gaps": syllabus_gaps + linked_file_gaps,
    }


# ---------------------------------------------------------------------------
# Structural Metadata — dashboard/PDF stats, built entirely from the seed
# lists and crawl results above. No additional Canvas calls.
# ---------------------------------------------------------------------------

def _detect_module_0(modules: list) -> list:
    """Modules whose name suggests they're the orientation/start-here module."""
    return [
        m for m in modules
        if any(kw in m.get("name", "").lower() for kw in
               ["module 0", "start here", "orientation", "welcome", "getting started", "begin here"])
    ]


def _build_page_module_lookup(modules: list, module_0_candidates: list) -> dict:
    """Map each page_url that's linked from a module to that module's
    name/position/orientation-flag, for pages to look themselves up by URL."""
    lookup = {}
    for m in modules:
        is_start = m in module_0_candidates
        for item in m.get("items", []):
            if item.get("type") == "Page" and item.get("page_url"):
                lookup[item["page_url"]] = {
                    "module_name": m.get("name"),
                    "module_position": m.get("position"),
                    "is_orientation": is_start,
                }
    return lookup


def _build_page_entry(p_seed: dict, crawl: dict, module_info: dict) -> tuple:
    """Build one page's structural entry plus any content gaps found in its
    raw HTML. Returns (entry, gaps)."""
    key = ("pages", p_seed["url"])
    node = crawl["store"].get(key, {})
    raw_body = crawl["page_raw_html"].get(key, "")
    media_urls = crawl["page_media_urls"].get(key, [])
    page_title = p_seed.get("title", p_seed["url"])

    gaps = extract_file_references(raw_body, f"Page: '{page_title}'")
    entry = {
        "module_name": module_info.get("module_name"),
        "module_position": module_info.get("module_position"),
        "title": page_title,
        "url": p_seed["url"],
        "body_text": node.get("text", ""),
        "raw_body_html": raw_body,
        "is_orientation": module_info.get("is_orientation", False),
        "has_embedded_media": len(media_urls) > 0,
        "embedded_media_urls": media_urls,
        "has_inaccessible_files": len(gaps) > 0,
        "inaccessible_files": gaps,
    }
    return entry, gaps


def _build_pages_list(seeds, crawl) -> tuple:
    """Build the structural pages list from every crawled page (including
    ones not linked into any module), enriched with module position/
    orientation info where a module links to them. Returns
    (pages, module_0_names, content_gaps)."""
    modules = seeds["modules"]
    module_0_candidates = _detect_module_0(modules)
    page_module_info = _build_page_module_lookup(modules, module_0_candidates)

    pages, content_gaps = [], []
    for p_seed in seeds["pages"]:
        module_info = page_module_info.get(p_seed["url"], {})
        entry, gaps = _build_page_entry(p_seed, crawl, module_info)
        pages.append(entry)
        content_gaps.extend(gaps)

    pages.sort(key=lambda p: (0 if p.get("is_orientation") else 1, p.get("module_position") or 99))
    return pages, [m.get("name") for m in module_0_candidates], content_gaps


def _build_discussion_entries(raw_list: list, store: dict) -> tuple:
    """Build discussion/announcement entries, reusing the crawl's already
    cleaned text and the seed list's own raw message field — no re-fetching."""
    entries, content_gaps = [], []
    for d in raw_list:
        clean_message = store.get(("discussion_topics", d["id"]), {}).get("text", "")
        raw_message = d.get("message") or ""
        gaps = extract_file_references(raw_message, f"Discussion: '{d.get('title', '')}'")
        content_gaps.extend(gaps)
        entries.append({**d, "clean_message": clean_message, "has_inaccessible_files": len(gaps) > 0})
    return entries, content_gaps


def _build_announcement_entries(raw_list: list, store: dict) -> tuple:
    """Build announcement entries, reusing the crawl's cleaned text (looked
    up from the store by ID, since announcements share the discussion_topics
    kind) and the seed list's own raw message field for gap detection."""
    entries, content_gaps = [], []
    for a in raw_list:
        clean_msg = store.get(("discussion_topics", a["id"]), {}).get("text", "")
        raw_msg = a.get("message") or ""
        gaps = extract_file_references(raw_msg, f"Announcement: '{a.get('title', '')}'")
        content_gaps.extend(gaps)
        entries.append({
            "title": a.get("title", ""),
            "message": raw_msg,
            "clean_message": clean_msg,
            "posted_at": a.get("posted_at", ""),
            "has_inaccessible_files": len(gaps) > 0,
        })
    return entries, content_gaps


def _collect_all_content_gaps(course: dict, assignments: list, page_gaps: list, disc_gaps: list, ann_gaps: list) -> list:
    """Combine content gaps from pages/discussions/announcements with the
    ones found in the syllabus and each assignment's description."""
    gaps = page_gaps + disc_gaps + ann_gaps
    gaps += extract_file_references(course.get("syllabus_body") or "", "Syllabus page")
    for a in assignments:
        gaps += extract_file_references(a.get("description") or "", f"Assignment: '{a.get('name', '')}'")
    return _dedupe_gaps(gaps)


def _detect_specs_grading(assignments: list) -> bool:
    """Heuristic: specs grading tends to show up as many assignments all
    worth the same small number of points (commonly pass/fail, ≤1 point)."""
    if not assignments:
        return False
    points = [a.get("points_possible") or 0 for a in assignments]
    return len(assignments) > 5 and len(set(points)) <= 2 and max(points) <= 1.0


def _build_structural_stats(seeds: dict, assignments: list, pages: list) -> dict:
    """Build the 'structural' counts dict — module/page/assignment/rubric/
    discussion/file/quiz counts plus grading-style signals."""
    rubric_count = sum(1 for a in assignments if a.get("rubric"))
    return {
        "module_count": len(seeds["modules"]),
        "page_count": len(pages),
        "assignment_count": len(assignments),
        "rubric_count": rubric_count,
        "rubric_count_direct": len(seeds["rubrics_direct"]),
        "rubric_coverage_pct": round(rubric_count / len(assignments) * 100, 1) if assignments else 0,
        "discussion_count": len(seeds["discussions"]),
        "announcement_count": len(seeds["announcements"]),
        "file_count": len(seeds["files"]),
        "quiz_count": len(seeds["quizzes"]),
        "uses_weighted_grading": seeds["course"].get("apply_assignment_group_weights", False),
        "specs_grading": _detect_specs_grading(assignments),
        "assignments_without_due_date": [a.get("name") for a in assignments if not a.get("due_at")],
    }


def _build_structural_metadata(seeds, crawl) -> dict:
    """Assemble all dashboard/PDF-facing structural data from the seed lists
    and crawl results already in hand — no additional Canvas calls."""
    course = seeds["course"]
    assignments = seeds["assignments"]

    pages, module_0_names, page_gaps = _build_pages_list(seeds, crawl)
    discussions, disc_gaps = _build_discussion_entries(seeds["discussions"], crawl["store"])
    announcements, ann_gaps = _build_announcement_entries(seeds["announcements"], crawl["store"])

    all_gaps = _collect_all_content_gaps(course, assignments, page_gaps, disc_gaps, ann_gaps)
    all_gaps = _dedupe_gaps(all_gaps + crawl["truncation_gaps"])

    return {
        "course_name": course.get("name", ""),
        "modules": seeds["modules"],
        "module_0_candidates": module_0_names,
        "pages": pages,
        "discussions": discussions,
        "announcements": announcements,
        "content_gaps": all_gaps,
        "structural": _build_structural_stats(seeds, assignments, pages),
    }


# ---------------------------------------------------------------------------
# Quality Checks — link checking (with SSRF protection) + spelling
#
# Kept as its own clearly separate section: unlike everything above, this
# isn't about extracting course content — it's validating already-extracted
# HTML (broken links, flagged spelling) for the dashboard and the E20
# objective. Functionally unchanged from before.
# ---------------------------------------------------------------------------

_MAX_LINKS_PER_COURSE = 40
_MAX_REDIRECTS = 5
_REQUEST_TIMEOUT = 8
_MAX_WORKERS = 12

_URL_REGEX = re.compile(r'href=["\']([^"\']+)["\']|(?<!["\'])(https?://[^\s<>"\')]+)', re.IGNORECASE)

_SPELLCHECK_ALLOWLIST = {
    "canvas", "syllabus", "pdf", "docx", "pptx", "lms", "url", "faq",
    "asynchronous", "rubric", "gradebook", "webex", "zoom", "perusall",
    "panopto", "blackboard", "instructure",
}


def _extract_urls(html_or_text: str, base_url: str = "") -> list:
    """Extract all unique HTTP(S) URLs from HTML or plain text. Resolves relative hrefs against base_url when provided."""
    if not html_or_text:
        return []
    urls = set()
    for m in _URL_REGEX.finditer(html_or_text):
        url = m.group(1) or m.group(2)
        if not url:
            continue
        if base_url and not url.lower().startswith(("http://", "https://")):
            try:
                url = urljoin(base_url, url)
            except ValueError:
                continue
        urls.add(url.strip())
    return sorted(urls)


def _validate_url_structure(url: str) -> tuple:
    """Check the URL itself is well-formed and http(s) with a hostname,
    before any network lookup happens. Returns (ok, hostname_or_None, reason)."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return False, None, "unparseable URL"
    if parsed.scheme not in ("http", "https"):
        return False, None, f"non-http(s) scheme: {parsed.scheme}"
    if not parsed.hostname:
        return False, None, "no hostname"
    return True, parsed.hostname, ""


def _hostname_resolves_to_public_ip(hostname: str) -> tuple:
    """Resolve the hostname and verify every address it maps to is a public
    IP — blocks private, loopback, link-local, reserved, multicast, and
    unspecified addresses. Returns (is_safe, reason)."""
    try:
        addrs = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return False, "DNS resolution failed"

    for _, _, _, _, sockaddr in addrs:
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
            return False, f"resolves to non-public address ({ip_str})"
    return True, ""


def _is_safe_url(url: str) -> tuple:
    """SSRF protection: verify that a URL resolves to a public IP address. Returns (is_safe, reason). Blocks private, loopback, link-local, and reserved addresses."""
    ok, hostname, reason = _validate_url_structure(url)
    if not ok:
        return False, reason
    return _hostname_resolves_to_public_ip(hostname)


def _check_one_link(url: str) -> dict:
    """Check a single URL by following redirects manually (re-checking SSRF safety at each hop)."""
    current_url = url
    for hop in range(_MAX_REDIRECTS + 1):
        safe, reason = _is_safe_url(current_url)
        if not safe:
            return {"url": url, "status": "BLOCKED_UNSAFE", "detail": reason}
        try:
            resp = requests.get(
                current_url, timeout=_REQUEST_TIMEOUT, allow_redirects=False,
                headers={"User-Agent": "Canvas-QA-Bot-LinkCheck/1.0"},
            )
        except requests.Timeout:
            return {"url": url, "status": "TIMEOUT", "detail": f"timed out after {_REQUEST_TIMEOUT}s"}
        except requests.RequestException as e:
            return {"url": url, "status": "UNREACHABLE", "detail": str(e)[:150]}

        if resp.status_code in (301, 302, 303, 307, 308):
            location = resp.headers.get("Location")
            if not location:
                return {"url": url, "status": "BROKEN", "detail": "redirect with no Location header"}
            current_url = urljoin(current_url, location)
            continue

        if 200 <= resp.status_code < 400:
            return {"url": url, "status": "OK", "detail": f"HTTP {resp.status_code}"}
        if resp.status_code in (401, 403):
            return {"url": url, "status": "AUTH_REQUIRED",
                    "detail": f"HTTP {resp.status_code} — may require institutional login"}
        return {"url": url, "status": "BROKEN", "detail": f"HTTP {resp.status_code}"}

    return {"url": url, "status": "BROKEN", "detail": f"exceeded {_MAX_REDIRECTS} redirects"}


def _check_links(urls: list, max_links: int = _MAX_LINKS_PER_COURSE) -> dict:
    """Check up to max_links URLs in parallel (12 workers) and return aggregated results grouped by status category."""
    selected = urls[:max_links]
    truncated = len(urls) > max_links
    results = []

    with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as executor:
        futures = {executor.submit(_check_one_link, u): u for u in selected}
        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                url = futures[future]
                results.append({"url": url, "status": "CHECK_FAILED", "detail": str(e)[:150]})

    by_status = {}
    for r in results:
        by_status.setdefault(r["status"], []).append(r)

    return {
        "total_urls_found": len(urls),
        "checked": len(selected),
        "truncated": truncated,
        "results": results,
        "broken": by_status.get("BROKEN", []),
        "unreachable": by_status.get("UNREACHABLE", []),
        "timeout": by_status.get("TIMEOUT", []),
        "blocked_unsafe": by_status.get("BLOCKED_UNSAFE", []),
        "auth_required": by_status.get("AUTH_REQUIRED", []),
        "ok_count": len(by_status.get("OK", [])),
    }


def _check_spelling(text: str, max_chars: int = 20000) -> dict:
    """Run a spell check on a text sample using pyspellchecker."""
    try:
        from spellchecker import SpellChecker
    except ImportError:
        logger.warning("pyspellchecker not installed, skipping spelling check")
        return {"skipped": True, "reason": "pyspellchecker not installed"}

    sample = text[:max_chars]
    words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", sample)
    candidates = [w for w in words if len(w) > 2 and not w.isupper()]

    spell = SpellChecker()
    unknown = spell.unknown(w.lower() for w in candidates)
    flagged = sorted(unknown - _SPELLCHECK_ALLOWLIST)

    return {
        "words_checked": len(candidates),
        "flagged_count": len(flagged),
        "flagged_terms": flagged[:30],
        "note": (
            "These are POTENTIAL issues from a generic English dictionary — proper nouns, "
            "domain terminology, and abbreviations will appear here even when correct. "
            "Treat as a prompt for a human to spot-check, not a confirmed error list."
        ),
    }


def _run_quality_checks(syllabus_html: str, metadata: dict) -> dict:
    """Run link checking and spell checking against all HTML content collected
    during structural metadata assembly."""
    html_parts = [syllabus_html]
    html_parts += [p.get("raw_body_html", "") for p in metadata["pages"]]
    html_parts += [d.get("message", "") for d in metadata["discussions"]]
    html_parts += [a.get("message", "") for a in metadata["announcements"]]
    combined_html = "\n".join(p for p in html_parts if p)

    urls = _extract_urls(combined_html, base_url=f"{CANVAS_BASE_URL}/")
    link_results = _check_links(urls) if urls else {
        "total_urls_found": 0, "checked": 0, "truncated": False,
        "results": [], "broken": [], "unreachable": [], "timeout": [],
        "blocked_unsafe": [], "auth_required": [], "ok_count": 0,
    }

    combined_text = re.sub(r"<[^>]+>", " ", combined_html)
    combined_text = re.sub(r"\s+", " ", combined_text).strip()
    spelling_results = _check_spelling(combined_text)

    return {"links": link_results, "spelling": spelling_results}


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------

def _find_syllabus_info(course_context: dict) -> tuple:
    """Look up the syllabus node in course_context and return its text plus
    whether it came from a file fallback rather than syllabus_body directly."""
    syllabus_node = course_context.get(next((k for k in course_context if k.startswith("syllabus:")), ""), {})
    return syllabus_node.get("text", ""), "-> file:" in syllabus_node.get("source", "")


def _list_extracted_files(course_context: dict) -> list:
    """Build the extracted_files summary list from every files: entry in course_context."""
    return [
        {"name": data.get("title", key), "status": "EXTRACTED" if data.get("text") else "FAILED",
         "source": data.get("source", "")}
        for key, data in course_context.items() if key.startswith("files:")
    ]


def _assemble_content(course_id, crawl, metadata, quality_checks, course_context) -> dict:
    """Build the full content.json dict from everything gathered so far."""
    syllabus_text, syllabus_is_file_only = _find_syllabus_info(course_context)
    return {
        "course_id": course_id,
        "course_name": metadata["course_name"],
        "course_context": course_context,
        "syllabus": syllabus_text,
        "syllabus_html": crawl["syllabus_html"],
        "syllabus_is_file_only": syllabus_is_file_only,
        "modules": metadata["modules"],
        "module_0_candidates": metadata["module_0_candidates"],
        "pages": metadata["pages"],
        "discussions": metadata["discussions"],
        "announcements": metadata["announcements"],
        "structural": metadata["structural"],
        "quality_checks": quality_checks,
        "content_gaps": metadata["content_gaps"],
        "extracted_files": _list_extracted_files(course_context),
    }


def handler(event, context):
    """Lambda entry point. Fetches every Canvas resource once via
    _fetch_seed_lists, crawls it into scoring text, derives structural
    metadata and quality checks from that same data, and writes content.json."""
    review_id = event["review_id"]
    course_id = event["course_id"]

    try:
        seeds = _fetch_seed_lists(course_id)
        crawl = _crawl_course(course_id, seeds)
        course_context = {f"{kind}:{node_id}": data for (kind, node_id), data in crawl["store"].items()}

        metadata = _build_structural_metadata(seeds, crawl)
        quality_checks = _run_quality_checks(crawl["syllabus_html"], metadata)
        content = _assemble_content(course_id, crawl, metadata, quality_checks, course_context)

        put_content(review_id, content)
        update_review_status(review_id, "extracting", {"course_name": metadata["course_name"]})

        return {"status": "extracted", "review_id": review_id}

    except Exception as e:
        logger.exception("Extraction failed for review %s", review_id)
        update_review_status(review_id, "error", {"error": f"{type(e).__name__}: extraction failed"})
        raise