"""
Server-side PDF scorecard generator using fpdf2.
Mirrors the layout from the frontend jsPDF implementation.
"""

from fpdf import FPDF

ROYAL = (0, 53, 148)
GOLD = (255, 184, 28)
INK = (11, 17, 32)
GRAY = (100, 116, 139)
LIGHT_GRAY = (241, 245, 249)
WHITE = (255, 255, 255)

SECTIONS = [
    ("Essential Design", "E", 20, 40),
    ("Advanced Design", "A", 15, 30),
    ("Course Delivery", "D", 15, 30),
]


def _safe(text: str) -> str:
    """Encode text to latin-1 (fpdf2's default encoding), replacing unsupported Unicode characters."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def _draw_course_info_block(pdf: FPDF, data: dict, y: float) -> float:
    """Draw the course name line and the ID/reviewer/date line under the header. Returns y after."""
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*INK)
    pdf.set_xy(14, y)
    pdf.cell(0, 5, _safe(f"Course: {data.get('course_name', '')}"))
    y += 6

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*GRAY)
    pdf.set_xy(14, y)
    pdf.cell(0, 4, _safe(f"Course ID: {data.get('course_id', '')}  |  Reviewer: {data.get('reviewer', '')}  |  Date: {data.get('review_date', '')}"))
    return y + 8


def _draw_all_section_tables(pdf: FPDF, data: dict, y: float):
    """Draw the Essential/Advanced/Delivery section tables in sequence, paginating as needed."""
    objectives = data.get("objectives", {})
    for section_name, prefix, count, max_score in SECTIONS:
        if y > 220:
            pdf.add_page()
            y = 20
        section_objs = [(f"{prefix}{i+1}", objectives.get(f"{prefix}{i+1}", {})) for i in range(count)]
        y = _draw_section_table(pdf, section_name, section_objs, y, data.get(f"{prefix.lower()}_subtotal", 0), max_score)
        y += 4
        if y > 250:
            pdf.add_page()
            y = 20


def _draw_page_footers(pdf: FPDF):
    """Draw the 'COURSE REVIEW SCORECARD' label and page number on every page."""
    for i in range(1, pdf.page + 1):
        pdf.page = i
        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(*GRAY)
        pdf.set_xy(14, 285)
        pdf.cell(0, 4, "COURSE REVIEW SCORECARD")
        pdf.set_xy(180, 285)
        pdf.cell(0, 4, str(i))


def generate_scorecard_pdf(data: dict) -> bytes:
    """Generate a complete OLC scorecard PDF from a data dict containing course info, objectives, scores, and section subtotals. Returns raw PDF bytes ready for S3 upload."""
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    _draw_header(pdf, data)
    y = 38

    if data.get("is_synthetic"):
        _draw_watermark_banner(pdf, y)
        y += 10

    y = _draw_course_info_block(pdf, data, y)
    _draw_all_section_tables(pdf, data, y)

    pdf.add_page()
    _draw_summary(pdf, data)
    _draw_page_footers(pdf)

    return pdf.output()


def _draw_header(pdf: FPDF, data: dict):
    """Draw the royal-blue header banner with the scorecard title and OLC branding."""
    pdf.set_fill_color(*ROYAL)
    pdf.rect(0, 0, 210, 28, "F")

    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*WHITE)
    pdf.set_xy(14, 8)
    pdf.cell(0, 8, "Course Review Scorecard")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_xy(14, 17)
    pdf.cell(0, 5, "Online Learning Consortium")


def _draw_watermark_banner(pdf: FPDF, y: float):
    """Draw a yellow 'SAMPLE / DEMO DATA' banner for synthetic/seeded scorecards."""
    pdf.set_fill_color(255, 220, 50)
    pdf.rect(14, y, 182, 8, "F")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(100, 50, 0)
    pdf.set_xy(14, y + 1)
    pdf.cell(182, 6, "SAMPLE / DEMO DATA -- NOT AN ACTUAL COURSE REVIEW", align="C")


def _draw_section_title_and_legend(pdf: FPDF, title: str, y: float) -> float:
    """Draw the section title and the 0/1/2 score legend line. Returns y after."""
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*INK)
    pdf.set_xy(14, y)
    pdf.cell(0, 6, title)
    y += 8

    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(*GRAY)
    pdf.set_xy(14, y)
    pdf.cell(0, 4, "0 = Developing     1 = Accomplished     2 = Exemplary")
    return y + 6


def _draw_table_header_row(pdf: FPDF, y: float) -> float:
    """Draw the royal-blue #/OBJECTIVE/SCORE header row. Returns y after."""
    pdf.set_fill_color(*ROYAL)
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_xy(14, y)
    pdf.cell(12, 6, "#", border=1, align="C", fill=True)
    pdf.cell(148, 6, "OBJECTIVE", border=1, fill=True)
    pdf.cell(18, 6, "SCORE", border=1, align="C", fill=True)
    return y + 6


def _draw_objective_row(pdf: FPDF, index: int, obj_id: str, obj_data: dict, y: float) -> float:
    """Draw one objective's row (# / title / score), zebra-striped by index. Returns y after."""
    pdf.set_fill_color(*(250, 251, 252) if index % 2 == 1 else WHITE)

    row_title = obj_data.get("title", obj_id)
    score = obj_data.get("score")
    score_str = str(score) if score is not None else "-"

    pdf.set_xy(14, y)
    pdf.set_text_color(*INK)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.cell(12, 7, str(index + 1), border=1, align="C", fill=True)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.cell(148, 7, _safe(row_title[:95]), border=1, fill=True)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(18, 7, score_str, border=1, align="C", fill=True)
    return y + 7


def _draw_subtotal_row(pdf: FPDF, subtotal: int, max_score: int, y: float) -> float:
    """Draw the light-gray SUBTOTAL footer row. Returns y after."""
    pdf.set_fill_color(*LIGHT_GRAY)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*INK)
    pdf.set_xy(14, y)
    pdf.cell(12, 7, "", border=1, fill=True)
    pdf.cell(148, 7, f"SUBTOTAL (out of {max_score})", border=1, fill=True)
    pdf.cell(18, 7, str(subtotal), border=1, align="C", fill=True)
    return y + 7


def _draw_section_table(pdf: FPDF, title: str, objectives: list, start_y: float, subtotal: int, max_score: int) -> float:
    """Draw a section table (Essential/Advanced/Delivery) with numbered objective rows and a subtotal footer. Returns the Y position after the table for layout flow."""
    y = _draw_section_title_and_legend(pdf, title, start_y)
    y = _draw_table_header_row(pdf, y)

    pdf.set_text_color(*INK)
    pdf.set_font("Helvetica", "", 8.5)
    for i, (obj_id, obj_data) in enumerate(objectives):
        if y > 270:
            pdf.add_page()
            y = 20
        y = _draw_objective_row(pdf, i, obj_id, obj_data, y)

    return _draw_subtotal_row(pdf, subtotal, max_score, y)


def _draw_summary_score_table(pdf: FPDF, data: dict, y: float) -> float:
    """Draw the section-by-section score table plus the gold TOTAL row. Returns the y position after the table."""
    pdf.set_fill_color(*ROYAL)
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_xy(14, y)
    pdf.cell(100, 8, "SECTION", border=1, fill=True)
    pdf.cell(30, 8, "SCORE", border=1, align="C", fill=True)
    pdf.cell(30, 8, "POSSIBLE", border=1, align="C", fill=True)
    y += 8

    pdf.set_text_color(*INK)
    pdf.set_font("Helvetica", "", 10)
    rows = [
        ("Essential Design", data.get("essential_subtotal", 0), 40),
        ("Advanced Design", data.get("advanced_subtotal", 0), 30),
        ("Course Delivery", data.get("delivery_subtotal", 0), 30),
    ]
    for label, score, possible in rows:
        pdf.set_xy(14, y)
        pdf.cell(100, 8, label, border=1)
        pdf.cell(30, 8, str(score), border=1, align="C")
        pdf.cell(30, 8, str(possible), border=1, align="C")
        y += 8

    pdf.set_fill_color(*GOLD)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_xy(14, y)
    pdf.cell(100, 8, "TOTAL", border=1, fill=True)
    pdf.cell(30, 8, str(data.get("total_score", 0)), border=1, align="C", fill=True)
    pdf.cell(30, 8, str(data.get("total_max", 100)), border=1, align="C", fill=True)
    return y + 14


def _draw_summary_metadata(pdf: FPDF, data: dict, y: float) -> float:
    """Draw the overall percentage/tier line and course metadata lines (course name, ID, reviewer, date). Returns the y position after."""
    total = data.get("total_score", 0)
    total_max = data.get("total_max", 100)
    pct = round(total / total_max * 100) if total_max else 0
    tier = "Exemplary" if pct >= 85 else "Accomplished" if pct >= 60 else "Developing"

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*INK)
    pdf.set_xy(14, y)
    pdf.cell(0, 6, f"Overall: {pct}% - {tier}")
    y += 10

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GRAY)
    for line in [
        f"Course: {data.get('course_name', '')}",
        f"Course ID: {data.get('course_id', '')}",
        f"Reviewer: {data.get('reviewer', '')}",
        f"Review Date: {data.get('review_date', '')}",
    ]:
        pdf.set_xy(14, y)
        pdf.cell(0, 5, _safe(line))
        y += 5
    return y


def _draw_improvement_plan(pdf: FPDF, objectives: dict, y: float):
    """Draw the improvement-plan list of Developing (score=0) objectives with
    their suggestions, paginating if the list runs past the page bottom."""
    developing = [(oid, o) for oid, o in objectives.items() if o.get("score") == 0]

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*INK)
    pdf.set_xy(14, y)
    pdf.cell(0, 6, "Improvement Plan")
    y += 8

    if not developing:
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY)
        pdf.set_xy(16, y)
        pdf.cell(0, 5, "No developing objectives - course meets all standards.")
        return

    pdf.set_font("Helvetica", "", 8.5)
    for obj_id, obj in developing:
        if y > 270:
            pdf.add_page()
            y = 20
        pdf.set_text_color(*INK)
        pdf.set_xy(16, y)
        pdf.cell(0, 4, _safe(f"* {obj.get('title', obj_id)}"))
        y += 5
        suggestion = obj.get("improvement_suggestions", "")
        if suggestion:
            pdf.set_text_color(*GRAY)
            pdf.set_xy(20, y)
            pdf.multi_cell(168, 3.5, _safe(suggestion))
            y = pdf.get_y() + 2


def _draw_summary(pdf: FPDF, data: dict):
    """Draw the final summary page: score table, overall percentage/tier,
    course metadata, and the improvement plan for developing objectives."""
    y = 20
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*INK)
    pdf.set_xy(14, y)
    pdf.cell(0, 8, "Scorecard Summary")
    y += 12

    y = _draw_summary_score_table(pdf, data, y)
    y = _draw_summary_metadata(pdf, data, y) + 8
    _draw_improvement_plan(pdf, data.get("objectives", {}), y)