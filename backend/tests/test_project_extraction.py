"""
D1 — project extraction survives icon-font title markers and titled tech stacks.

THE DEFECT THE VISIBLE-CHROME AUDIT FOUND: a real résumé's Projects section was
detected (2,759 chars) yet `extract_projects()` returned ZERO entries, so the
candidate scored 0/15 on the Projects dimension of every JD and his
`relevant_projects` were empty even on the role he led.

The cause was NOT the "Ð" (U+00D0) icon-font prefix failing bullet detection —
that glyph is not a bullet, so the line was correctly read as a TITLE. The cause
was the title carrying its own tech stack:

    Ð Hackathon Management Dashboard | Python, Flask, NLP, PostgreSQL, REST APIs

`is_title_tech_list` counts a separator plus 3+ known skills and discards the
line as "nothing but a list of technologies" — taking the whole project with it.
A second, compounding bug then swallowed the *next* project as a tech-stack
lookahead line of the first.

All deterministic — no Groq, no network.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from app.nlp.extractor import extract_projects, detect_sections
from app.nlp.ranking_engine import compute_candidate_score
from app.schemas.analysis import ScoreBreakdown
from app.schemas.batch import RankingWeights

MARKER = "\u00d0"          # Ð — what the real template emits
PUA_MARKER = "\uf0d8"      # a private-use icon-font glyph


# ── 1. U+00D0-prefixed project titles are recognised ─────────────────────────
def test_icon_font_marker_titles_are_extracted():
    section = "\n".join([
        f"{MARKER} Hackathon Management Dashboard | Python, Flask, NLP, PostgreSQL",
        "\u2022 Architected a 4-tier role-based platform with an approval pipeline.",
        f"{MARKER} Parental Control & Monitoring System | Python, Flask, SQLite",
        "\u2022 Built activity monitoring with rate limiting and IP blocking.",
    ])
    entries = extract_projects(section)

    assert len(entries) == 2, "both marker-prefixed projects must survive"
    titles = [e.title for e in entries]
    assert titles == [
        "Hackathon Management Dashboard",
        "Parental Control & Monitoring System",
    ]
    # The marker must not leak into the stored name.
    assert not any(t.startswith(MARKER) for t in titles)
    # The stack lifted off the title is preserved as evidence, not discarded.
    assert any("Technologies:" in d for d in entries[0].description)


def test_private_use_icon_glyph_is_also_stripped():
    section = "\n".join([
        f"{PUA_MARKER} Telemetry Pipeline | Python, Kafka, PostgreSQL",
        "\u2022 Streams 1M events/day into a warehouse.",
    ])
    entries = extract_projects(section)
    assert len(entries) == 1
    assert entries[0].title == "Telemetry Pipeline"


# ── 2. Existing bullet/prefix formats still work ─────────────────────────────
@pytest.mark.parametrize("bullet", ["\u2022", "-", "*", chr(149)])
def test_existing_bullet_formats_still_parse(bullet):
    """The classic shape: bare title, bullets beneath it."""
    section = "\n".join([
        "Resume Intelligence Platform",
        f"{bullet} Parses PDFs and ranks candidates against a job description.",
        f"{bullet} Serves an async API under load.",
    ])
    entries = extract_projects(section)
    assert len(entries) == 1
    assert entries[0].title == "Resume Intelligence Platform"
    assert len(entries[0].description) == 2


@pytest.mark.parametrize("bullet", ["•", "-", "*"])
def test_bullet_glyph_is_stripped_from_description_text(bullet):
    """Pre-existing behaviour, pinned so the D1 change cannot alter it.

    NOTE — KNOWN PRE-EXISTING GAP, deliberately not fixed here (out of D1's
    scope): the description cleanup regex is `^[•\\-*\\s]+`, which omits
    chr(149). A chr(149) bullet is therefore recognised as a bullet but its
    glyph survives into the description text. Recorded rather than changed.
    """
    section = "\n".join([
        "Resume Intelligence Platform",
        f"{bullet} Parses PDFs and ranks candidates against a job description.",
    ])
    entries = extract_projects(section)
    assert not entries[0].description[0].startswith(bullet)


def test_inline_dash_title_split_is_unchanged():
    """"Name - what it does" on one line keeps its existing behaviour."""
    section = "\n".join([
        "Payment Reconciliation Engine - event-sourced ledger reconciling gateway "
        "and bank statements nightly.",
        "\u2022 Cut manual reconciliation time by 80%.",
    ])
    entries = extract_projects(section)
    assert len(entries) == 1
    assert entries[0].title == "Payment Reconciliation Engine"
    assert any("event-sourced ledger" in d for d in entries[0].description)


def test_pipe_that_is_not_a_tech_stack_is_left_intact():
    """A subtitle after "|" is part of the name — only a real stack is split."""
    section = "\n".join([
        "Bharat Samachar AI | AI-Powered News Intelligence Platform",
        "\u2022 Clusters and summarises regional news.",
    ])
    entries = extract_projects(section)
    assert len(entries) == 1
    assert entries[0].title == "Bharat Samachar AI | AI-Powered News Intelligence Platform"


def test_pure_tech_list_line_is_still_rejected():
    """The guard must keep doing its job: a bare stack is not a project."""
    section = "\n".join([
        "Python, Flask, PostgreSQL, Docker, Redis",
        "\u2022 stray line",
    ])
    assert extract_projects(section) == []


# ── 3. Extracted projects flow through to the score ──────────────────────────
_SRC = Path(r"E:\Resume-Parser\Test Resume")


def test_real_resume_projects_reach_resume_data():
    """End-to-end: PDF → parser → ResumeData.projects (the audit's regression)."""
    pdf = _SRC / "Shubh-tyagi_resume.pdf"
    if not pdf.exists():
        pytest.skip("cohort résumé missing")
    from app.services.resume_service import ResumeService

    resume = ResumeService.process_resume(pdf)
    titles = [p.title for p in resume.projects]
    assert len(resume.projects) == 2, f"expected 2 projects, got {titles}"
    assert "Hackathon Management Dashboard" in titles
    assert "Parental Control & Monitoring System" in titles


def test_projects_section_is_detected_and_non_empty():
    pdf = _SRC / "Shubh-tyagi_resume.pdf"
    if not pdf.exists():
        pytest.skip("cohort résumé missing")
    import fitz

    text = "".join(page.get_text() for page in fitz.open(pdf))
    section = detect_sections(text).get("projects", "")
    assert len(section) > 1000          # section detection was never the bug
    assert len(extract_projects(section)) == 2   # extraction was


def test_relevant_projects_are_credited_in_the_score():
    """`relevant_projects` drives the Projects component, so recovering the
    parse genuinely moves Fit rather than only the displayed list."""
    W = RankingWeights()
    bd = ScoreBreakdown(technical_skills=30, projects=20, experience=20,
                        education=10, impact=12)
    jd = ("Cybersecurity Engineer: penetration testing, cryptography, OWASP ZAP, "
          "Wireshark, network traffic analysis, anomaly detection, SIEM, secure coding.")
    skills = ["Wireshark", "OWASP ZAP", "Cryptography", "Anomaly Detection",
              "Network Traffic Analysis"]

    def fit(relevant):
        return compute_candidate_score(
            ats_score=75, ats_breakdown=bd, matching_skills=[], missing_skills=[],
            relevant_projects=list(relevant), less_relevant_projects=[],
            semantic=0.21, weights=W, resume_skills=skills, job_description=jd,
        )

    without = fit([])
    with_projects = fit(["Hackathon Management Dashboard",
                         "Parental Control & Monitoring System"])

    assert with_projects.overall > without.overall
    earned = next(c for c in with_projects.components if c.key == "projects").earned
    assert earned > 0.0


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
