"""
Years of experience must count EMPLOYMENT dates only (M-3, issue 5).

The audit fixture reported 11 years for someone with 7. `years_of_experience_from_text`
unions every dated range it is given — correct, so concurrent jobs never
double-count — but it was given the whole document, and a degree reading
"(2014-2018)" is a date range like any other. Studied 2014-2018, worked
2018-2025, credited with 2014-2025.

The inflation scales with the length of the degree, and the number feeds ATS
scoring and seniority judgement, so it decides whether someone reads as a senior
hire.

This module also brings `tests/test_experience_years.py` into the suite. That
file defines `run()` and executes only under `__main__`, so pytest collected
nothing from it and its 18 scenarios had never run in CI — part of how this
survived. The cases are imported rather than copied, so the two cannot drift.
"""

from __future__ import annotations

import pytest

from app.nlp.extractor import extract_resume_data, years_of_experience_from_text
from tests.test_experience_years import CASES


# ── the bug ──────────────────────────────────────────────────────────────────

def test_degree_dates_are_not_counted_as_employment():
    """The audit fixture, reduced to the two sections that mattered."""
    text = (
        "Priya Raghunathan\n"
        "EXPERIENCE\n"
        "Senior Backend Engineer, Razorpay (2021-2025)\n"
        "Backend Engineer, Freshworks (2018-2021)\n"
        "EDUCATION\n"
        "B.Tech Computer Science and Engineering, IIT Madras (2014-2018)\n"
    )
    assert extract_resume_data(text).total_experience_years == 7.0


def test_a_longer_degree_does_not_inflate_further():
    """A PhD would have added five more years under the old behaviour."""
    text = (
        "EXPERIENCE\n"
        "Research Engineer, Acme (2020-2024)\n"
        "EDUCATION\n"
        "PhD Computer Science, Some University (2012-2020)\n"
    )
    assert extract_resume_data(text).total_experience_years == 4.0


def test_education_only_resume_reports_zero_not_a_degree_length():
    """A fresher must read as 0 years, not as the length of their course."""
    text = (
        "Sneha Patel\n"
        "EDUCATION\n"
        "B.Sc Computer Science, Some College (2020-2024)\n"
        "SKILLS\nPython, SQL\n"
    )
    assert extract_resume_data(text).total_experience_years == 0.0


def test_certification_dates_do_not_count_as_employment():
    text = (
        "EXPERIENCE\nBackend Engineer, Foo (2022-2024)\n"
        "CERTIFICATIONS\nAWS Solutions Architect (2015-2018)\n"
    )
    assert extract_resume_data(text).total_experience_years == 2.0


# ── the fallback path ────────────────────────────────────────────────────────

def test_no_experience_heading_still_counts_employment():
    """Unusual headings must not zero out a real work history.

    With no EXPERIENCE section the scan falls back to the document minus
    education — under-narrowing beats reporting 0 years for someone employed.
    """
    text = (
        "Priya Raghunathan\n"
        "Senior Backend Engineer, Razorpay (2021-2025)\n"
        "Backend Engineer, Freshworks (2018-2021)\n"
    )
    assert extract_resume_data(text).total_experience_years == 7.0


def test_no_experience_heading_but_education_present_still_excludes_the_degree():
    text = (
        "Priya Raghunathan\n"
        "Senior Backend Engineer, Razorpay (2021-2025)\n"
        "EDUCATION\n"
        "B.Tech, IIT Madras (2014-2018)\n"
    )
    assert extract_resume_data(text).total_experience_years == 4.0


# ── no regression: the pre-existing scenarios, now actually running ──────────

@pytest.mark.parametrize("label,text,expected", CASES, ids=[c[0][:45] for c in CASES])
def test_preexisting_scenarios_still_pass(label, text, expected):
    """The 18 dormant cases from `test_experience_years.py`.

    Imported, not copied: if that file gains a case, it runs here too.
    """
    got = years_of_experience_from_text(text)
    assert got is not None and abs(got - expected) <= 0.5, f"{label}: expected ~{expected}, got {got}"


@pytest.mark.parametrize(
    "text,expected",
    [
        ("EXPERIENCE\nSenior Engineer, Baz Ltd (2019 - 2024)\nLed backend services.", 5.0),
        ("EXPERIENCE\nSoftware Intern, Acme (Jun 2022 - Aug 2022)\nShadowed team.", 0.0),
        ("EXPERIENCE\nEngineer, A (2018 - 2022)\nConsultant, B (2020 - 2023)", 5.0),
    ],
)
def test_preexisting_end_to_end_scenarios_still_pass(text, expected):
    got = extract_resume_data(text).total_experience_years
    assert got is not None and abs(got - expected) <= 0.5
