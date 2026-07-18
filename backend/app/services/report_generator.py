"""
PDF Report Generator for ATS Analysis Results.

Uses reportlab to produce a professional, branded PDF containing
the complete ATS analysis: scores, breakdowns, and AI insights.
"""

import io
import logging
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable,
)
from reportlab.graphics.shapes import Drawing, Rect, String

logger = logging.getLogger(__name__)

# ── Brand Colours ─────────────────────────────────────────────────────────────

BRAND_PRIMARY   = colors.HexColor("#2563EB")
BRAND_DARK      = colors.HexColor("#0F172A")
BRAND_GREY      = colors.HexColor("#64748B")
BRAND_LIGHT_BG  = colors.HexColor("#F8FAFC")
BRAND_BORDER    = colors.HexColor("#E2E8F0")
BRAND_GREEN     = colors.HexColor("#22C55E")
BRAND_AMBER     = colors.HexColor("#F59E0B")
BRAND_RED       = colors.HexColor("#EF4444")
BRAND_PURPLE    = colors.HexColor("#8B5CF6")
BRAND_BLUE_LIGHT = colors.HexColor("#EFF6FF")
WHITE           = colors.HexColor("#FFFFFF")


def _score_color(score: int) -> colors.HexColor:
    if score >= 90:
        return BRAND_GREEN
    elif score >= 75:
        return BRAND_AMBER
    return BRAND_RED


def _score_label(score: int) -> str:
    if score >= 90:
        return "Excellent Match"
    elif score >= 75:
        return "Good Match"
    return "Needs Work"


def _build_styles():
    """Create custom paragraph styles used throughout the report."""
    base = getSampleStyleSheet()

    styles = {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=BRAND_DARK,
            alignment=TA_CENTER,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "ReportSubtitle",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=BRAND_GREY,
            alignment=TA_CENTER,
            spaceAfter=16,
        ),
        "section": ParagraphStyle(
            "SectionHeading",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=20,
            textColor=BRAND_PRIMARY,
            spaceBefore=18,
            spaceAfter=8,
        ),
        "subsection": ParagraphStyle(
            "SubSectionHeading",
            parent=base["Heading3"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=16,
            textColor=BRAND_DARK,
            spaceBefore=10,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "BodyText_Custom",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=BRAND_DARK,
        ),
        "body_grey": ParagraphStyle(
            "BodyGrey",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=BRAND_GREY,
        ),
        "bullet": ParagraphStyle(
            "BulletItem",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=BRAND_DARK,
            leftIndent=16,
            bulletIndent=4,
        ),
        "label": ParagraphStyle(
            "Label",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=BRAND_GREY,
        ),
        "value": ParagraphStyle(
            "Value",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=BRAND_DARK,
        ),
        "big_score": ParagraphStyle(
            "BigScore",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=36,
            leading=42,
            textColor=BRAND_DARK,
            alignment=TA_CENTER,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=12,
            textColor=BRAND_GREY,
            alignment=TA_CENTER,
        ),
        "score_value": ParagraphStyle(
            "ScoreValue",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=28,
            leading=36,
            textColor=BRAND_DARK,
        ),
    }
    return styles


def _draw_score_bar(label: str, value: int, max_value: int, bar_color: colors.HexColor) -> Drawing:
    """Draw a single horizontal score bar with label and value."""
    d = Drawing(460, 22)
    pct = (value / max_value * 100) if max_value else 0

    # Label
    d.add(String(0, 6, label, fontName="Helvetica", fontSize=9, fillColor=BRAND_GREY))

    # Track background
    bar_x, bar_w, bar_h = 120, 280, 10
    d.add(Rect(bar_x, 4, bar_w, bar_h, fillColor=BRAND_LIGHT_BG, strokeColor=BRAND_BORDER, strokeWidth=0.5, rx=4, ry=4))

    # Filled portion
    fill_w = max(bar_w * pct / 100, 0)
    if fill_w > 0:
        d.add(Rect(bar_x, 4, fill_w, bar_h, fillColor=bar_color, strokeColor=None, strokeWidth=0, rx=4, ry=4))

    # Value text
    d.add(String(bar_x + bar_w + 10, 6, f"{value}/{max_value}", fontName="Helvetica-Bold", fontSize=9, fillColor=BRAND_DARK))

    return d


def generate_report(analysis_data: dict, resume_data: dict) -> bytes:
    """
    Generate a professional PDF report from analysis and resume data.

    Args:
        analysis_data: The AnalysisResponse dict (scores, AI insights).
        resume_data:   The ResumeData dict (candidate info).

    Returns:
        PDF file content as bytes.
    """
    buf = io.BytesIO()
    styles = _build_styles()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        title="ATS Analysis Report",
        author="AI Resume Intelligence Platform",
    )

    story: list = []

    # ── Header ────────────────────────────────────────────────────────────────

    story.append(Paragraph("✦ ATS Analysis Report", styles["title"]))
    story.append(Paragraph(
        f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        styles["subtitle"],
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BORDER, spaceAfter=12))

    # ── Candidate Information ─────────────────────────────────────────────────

    story.append(Paragraph("👤  Candidate Information", styles["section"]))

    name  = resume_data.get("name", "—")
    email = resume_data.get("email", "—")
    phone = resume_data.get("phone", "—")

    info_data = [
        [Paragraph("<b>Name</b>", styles["label"]),  Paragraph(name, styles["value"])],
        [Paragraph("<b>Email</b>", styles["label"]), Paragraph(email, styles["value"])],
        [Paragraph("<b>Phone</b>", styles["label"]), Paragraph(phone, styles["value"])],
    ]
    info_table = Table(info_data, colWidths=[90, 380])
    info_table.setStyle(TableStyle([
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6))

    # ── ATS Score Overview ────────────────────────────────────────────────────

    story.append(Paragraph("📊  ATS Score Overview", styles["section"]))

    ats_score       = analysis_data.get("ats_score", 0)
    confidence      = analysis_data.get("confidence_score", 0)
    version         = analysis_data.get("analysis_version", "v1.0")
    score_clr       = _score_color(ats_score)
    score_lbl       = _score_label(ats_score)

    # Score hero table
    score_info = [
        [
            Paragraph(f'<font size="28"><b>{ats_score}</b></font><font size="12" color="#{BRAND_GREY.hexval()[2:]}">&nbsp;/ 100</font>', styles["score_value"]),
            Paragraph(f'<font color="#{score_clr.hexval()[2:]}"><b>{score_lbl}</b></font>', styles["body"]),
        ],
        [
            Paragraph(f'<b>Confidence Score:</b> {confidence}%', styles["body"]),
            Paragraph(f'<b>Analysis Version:</b> {version}', styles["body"]),
        ],
    ]
    score_table = Table(score_info, colWidths=[235, 235])
    score_table.setStyle(TableStyle([
        ("VALIGN",     (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_LIGHT_BG),
        ("BOX",        (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 10))

    # ── Score Breakdown ───────────────────────────────────────────────────────

    story.append(Paragraph("📈  Score Breakdown", styles["section"]))

    bd = analysis_data.get("score_breakdown", {})
    breakdown_items = [
        ("Technical Skills", bd.get("technical_skills", 0), 30, BRAND_PRIMARY),
        ("Projects",         bd.get("projects", 0),         25, BRAND_PRIMARY),
        ("Experience",       bd.get("experience", 0),       20, BRAND_GREEN),
        ("Education",        bd.get("education", 0),        10, BRAND_GREEN),
        ("Impact",           bd.get("impact", 0),           15, BRAND_AMBER),
    ]
    for label, val, mx, clr in breakdown_items:
        story.append(_draw_score_bar(label, val, mx, clr))
        story.append(Spacer(1, 4))

    story.append(Spacer(1, 6))

    # ── AI Analysis ───────────────────────────────────────────────────────────

    story.append(Paragraph("🤖  AI Analysis", styles["section"]))

    # Candidate Summary
    summary = analysis_data.get("candidate_summary", "")
    if summary:
        story.append(Paragraph("Candidate Summary", styles["subsection"]))
        story.append(Paragraph(summary, styles["body_grey"]))
        story.append(Spacer(1, 6))

    # Strengths
    strengths = analysis_data.get("strengths", [])
    if strengths:
        story.append(Paragraph("✅  Strengths", styles["subsection"]))
        for s in strengths:
            story.append(Paragraph(f"•  {s}", styles["bullet"]))
        story.append(Spacer(1, 6))

    # Areas for Improvement
    areas = analysis_data.get("areas_for_improvement", [])
    if areas:
        story.append(Paragraph("⚠️  Areas for Improvement", styles["subsection"]))
        for a in areas:
            story.append(Paragraph(f"•  {a}", styles["bullet"]))
        story.append(Spacer(1, 6))

    # Career Recommendations
    recs = analysis_data.get("career_recommendations", [])
    if recs:
        story.append(Paragraph("🎯  Career Recommendations", styles["subsection"]))
        for r in recs:
            story.append(Paragraph(f"•  {r}", styles["bullet"]))
        story.append(Spacer(1, 6))

    # Interview Readiness
    readiness = analysis_data.get("interview_readiness", "")
    if readiness:
        story.append(Paragraph("💬  Interview Readiness", styles["subsection"]))
        story.append(Paragraph(readiness, styles["body_grey"]))
        story.append(Spacer(1, 6))

    # Recommended Roles
    roles = analysis_data.get("recommended_roles", [])
    if roles:
        story.append(Paragraph("🏷️  Recommended Roles", styles["subsection"]))
        roles_text = " &nbsp;|&nbsp; ".join(f"<b>{r}</b>" for r in roles)
        story.append(Paragraph(roles_text, styles["body"]))
        story.append(Spacer(1, 12))

    # ── Footer ────────────────────────────────────────────────────────────────

    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_BORDER, spaceBefore=12, spaceAfter=8))
    story.append(Paragraph(
        "Generated by AI Resume Intelligence Platform  •  Powered by Groq LLM  •  Confidential",
        styles["footer"],
    ))

    # Build PDF
    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()

    logger.info(f"PDF report generated: {len(pdf_bytes)} bytes")
    return pdf_bytes


# ══════════════════════════════════════════════════════════════════════════════
#  Match Report Generator
# ══════════════════════════════════════════════════════════════════════════════

def _match_score_color(score: int) -> colors.HexColor:
    """Color for match score display."""
    if score >= 85:
        return BRAND_GREEN
    elif score >= 70:
        return BRAND_PRIMARY
    elif score >= 50:
        return BRAND_AMBER
    return BRAND_RED


def generate_match_report(match_data: dict, resume_data: dict) -> bytes:
    """
    Generate a professional PDF recruiter match report.

    Args:
        match_data:  The MatchAnalysisResponse dict.
        resume_data: The candidate info dict (name, email, phone).

    Returns:
        PDF file content as bytes.
    """
    buf = io.BytesIO()
    styles = _build_styles()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        title="AI Recruiter Match Report",
        author="AI Resume Intelligence Platform",
    )

    story: list = []

    # ── Header ────────────────────────────────────────────────────────────────

    story.append(Paragraph("✦ AI Recruiter Match Report", styles["title"]))
    story.append(Paragraph(
        f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        styles["subtitle"],
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BORDER, spaceAfter=12))

    # ── Candidate Information ─────────────────────────────────────────────────

    story.append(Paragraph("👤  Candidate Information", styles["section"]))

    name  = resume_data.get("name", "—")
    email = resume_data.get("email", "—")
    phone = resume_data.get("phone", "—")

    info_data = [
        [Paragraph("<b>Name</b>", styles["label"]),  Paragraph(name, styles["value"])],
        [Paragraph("<b>Email</b>", styles["label"]), Paragraph(email, styles["value"])],
        [Paragraph("<b>Phone</b>", styles["label"]), Paragraph(phone, styles["value"])],
    ]
    info_table = Table(info_data, colWidths=[90, 380])
    info_table.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6))

    # ── Job Match Score ───────────────────────────────────────────────────────

    story.append(Paragraph("📊  Job Match Score", styles["section"]))

    score    = match_data.get("job_match_score", 0)
    category = match_data.get("match_category", "Weak Match")
    version  = match_data.get("analysis_version", "v1.1")
    clr      = _match_score_color(score)

    score_info = [
        [
            Paragraph(
                f'<font size="28"><b>{score}</b></font>'
                f'<font size="12" color="#{BRAND_GREY.hexval()[2:]}">&nbsp;/ 100</font>',
                styles["score_value"],
            ),
            Paragraph(f'<font color="#{clr.hexval()[2:]}"><b>{category}</b></font>', styles["body"]),
        ],
        [
            Paragraph(f'<b>Analysis Version:</b> {version}', styles["body"]),
            Paragraph("", styles["body"]),
        ],
    ]
    score_table = Table(score_info, colWidths=[235, 235])
    score_table.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND",    (0, 0), (-1, -1), BRAND_LIGHT_BG),
        ("BOX",           (0, 0), (-1, -1), 0.5, BRAND_BORDER),
        ("ROUNDEDCORNERS", [6, 6, 6, 6]),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 10))

    # ── Skill Match Analysis ──────────────────────────────────────────────────

    matching = match_data.get("matching_skills", [])
    missing  = match_data.get("missing_skills", [])

    if matching or missing:
        story.append(Paragraph("⚡  Skill Match Analysis", styles["section"]))

        if matching:
            story.append(Paragraph("Matching Skills", styles["subsection"]))
            for s in matching:
                story.append(Paragraph(f"<font color='#15803D'>✓</font>  {s}", styles["bullet"]))
            story.append(Spacer(1, 6))

        if missing:
            story.append(Paragraph("Missing Skills", styles["subsection"]))
            for s in missing:
                story.append(Paragraph(f"<font color='#DC2626'>✗</font>  {s}", styles["bullet"]))
            story.append(Spacer(1, 6))

    # ── Experience Relevance ──────────────────────────────────────────────────

    exp_rel = match_data.get("experience_relevance", "")
    if exp_rel:
        story.append(Paragraph("💼  Experience Relevance", styles["section"]))
        story.append(Paragraph(exp_rel, styles["body_grey"]))
        story.append(Spacer(1, 6))

    # ── Project Relevance ─────────────────────────────────────────────────────

    rel_proj  = match_data.get("relevant_projects", [])
    less_proj = match_data.get("less_relevant_projects", [])

    if rel_proj or less_proj:
        story.append(Paragraph("🚀  Project Relevance", styles["section"]))

        if rel_proj:
            story.append(Paragraph("Most Relevant Projects", styles["subsection"]))
            for p in rel_proj:
                story.append(Paragraph(f"•  {p}", styles["bullet"]))
            story.append(Spacer(1, 6))

        if less_proj:
            story.append(Paragraph("Less Relevant Projects", styles["subsection"]))
            for p in less_proj:
                story.append(Paragraph(f"•  {p}", styles["bullet"]))
            story.append(Spacer(1, 6))

    # ── Candidate Strengths ───────────────────────────────────────────────────

    strengths = match_data.get("candidate_strengths", [])
    if strengths:
        story.append(Paragraph("💪  Candidate Strengths", styles["section"]))
        for s in strengths:
            story.append(Paragraph(f"•  {s}", styles["bullet"]))
        story.append(Spacer(1, 6))

    # ── Areas for Improvement ─────────────────────────────────────────────────

    areas = match_data.get("areas_for_improvement", [])
    if areas:
        story.append(Paragraph("⚠️  Areas for Improvement", styles["section"]))
        for a in areas:
            story.append(Paragraph(f"•  {a}", styles["bullet"]))
        story.append(Spacer(1, 6))

    # ── Hiring Recommendation ─────────────────────────────────────────────────

    rec     = match_data.get("hiring_recommendation", "")
    rec_exp = match_data.get("recommendation_explanation", "")

    if rec:
        story.append(Paragraph("🏆  Hiring Recommendation", styles["section"]))
        story.append(Paragraph(f"<b>{rec}</b>", styles["body"]))
        if rec_exp:
            story.append(Spacer(1, 4))
            story.append(Paragraph(rec_exp, styles["body_grey"]))
        story.append(Spacer(1, 12))

    # ── Footer ────────────────────────────────────────────────────────────────

    story.append(HRFlowable(width="100%", thickness=0.5, color=BRAND_BORDER, spaceBefore=12, spaceAfter=8))
    story.append(Paragraph(
        "Generated by AI Resume Intelligence Platform  •  Powered by Groq LLM  •  Confidential",
        styles["footer"],
    ))

    # Build PDF
    doc.build(story)
    pdf_bytes = buf.getvalue()
    buf.close()

    logger.info(f"Match PDF report generated: {len(pdf_bytes)} bytes")
    return pdf_bytes

