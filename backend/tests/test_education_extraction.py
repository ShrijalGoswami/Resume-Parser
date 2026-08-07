"""
Education must yield degree, institution AND duration (M-3.1/3.2).

The audit fixture returned the whole line as `institution` with degree and
duration empty:

    institution: "B.Tech Computer Science and Engineering, IIT Madras (2014-2018)"
    degree:      ""
    duration:    ""

The parser is line-oriented and tested institution BEFORE degree in an elif
chain, so a line naming both was filed entirely as the institution. Résumés
routinely write the whole qualification on one line, so this was the common case
rather than an edge one.

It also matters beyond display: `reconciliation` treats extracted degrees as
facts the model may not call missing, so an empty degree quietly weakens M-4.
"""

from __future__ import annotations

import pytest

from app.nlp.extractor import extract_education


def _one(text):
    entries = extract_education(text)
    assert len(entries) == 1, f"expected a single entry, got {len(entries)}: {entries}"
    return entries[0]


# ── the audit case ───────────────────────────────────────────────────────────

def test_single_line_entry_is_split_into_its_parts():
    e = _one("B.Tech Computer Science and Engineering, Indian Institute of Technology Madras (2014-2018)")
    assert e.degree == "B.Tech Computer Science and Engineering"
    assert e.institution == "Indian Institute of Technology Madras"
    assert "2014" in e.duration and "2018" in e.duration


# ── layouts that must all work ───────────────────────────────────────────────

def test_multi_line_degree_then_institution_is_one_entry():
    """Used to fragment into a degree with no institution and vice versa."""
    e = _one("B.Tech Computer Science\nIndian Institute of Technology Madras\n2014 - 2018\nCGPA: 9.1")
    assert e.degree == "B.Tech Computer Science"
    assert e.institution == "Indian Institute of Technology Madras"
    assert "2014" in e.duration
    assert "9.1" in e.gpa


def test_institution_before_degree():
    e = _one("Stanford University\nMaster of Science in Computer Science\n2019 - 2021")
    assert e.institution == "Stanford University"
    assert e.degree == "Master of Science in Computer Science"


def test_single_line_without_parentheses():
    e = _one("M.Sc Physics, University of Delhi, 2018 - 2020")
    assert e.degree == "M.Sc Physics"
    assert e.institution == "University of Delhi"
    assert "2018" in e.duration


def test_institution_line_carrying_its_own_dates():
    e = _one("B.Sc Mathematics\nSt. Xavier's College 2015 - 2018")
    assert e.degree == "B.Sc Mathematics"
    assert "2015" in e.duration


# ── multiple qualifications must not collapse or overwrite ───────────────────

def test_two_qualifications_multi_line():
    """The higher degree used to be silently overwritten by the lower one."""
    entries = extract_education(
        "M.Tech Data Science\nIIT Bombay\n2020 - 2022\n"
        "B.Tech Computer Science\nVIT Vellore\n2016 - 2020"
    )
    assert len(entries) == 2
    assert entries[0].degree == "M.Tech Data Science"
    assert entries[0].institution == "IIT Bombay"
    assert entries[1].degree == "B.Tech Computer Science"
    assert entries[1].institution == "VIT Vellore"


def test_two_qualifications_single_line_each():
    entries = extract_education(
        "M.Tech Data Science, IIT Bombay (2020-2022)\n"
        "B.Tech Computer Science, VIT Vellore (2016-2020)"
    )
    assert len(entries) == 2
    assert [e.degree for e in entries] == ["M.Tech Data Science", "B.Tech Computer Science"]
    assert [e.institution for e in entries] == ["IIT Bombay", "VIT Vellore"]


# ── no regression / degenerate input ─────────────────────────────────────────

def test_empty_section_returns_nothing():
    assert extract_education("") == []


def test_institution_only_still_extracts():
    e = _one("Indian Institute of Technology Madras")
    assert e.institution == "Indian Institute of Technology Madras"
    assert e.degree == ""


def test_degree_only_still_extracts():
    e = _one("B.Tech Computer Science")
    assert e.degree == "B.Tech Computer Science"
    assert e.institution == ""


@pytest.mark.parametrize(
    "line,expect_degree",
    [
        ("B.Tech Computer Science, IIT Madras (2014-2018)", "B.Tech Computer Science"),
        ("Bachelor of Engineering, Anna University (2013-2017)", "Bachelor of Engineering"),
        ("PhD Machine Learning, Carnegie Mellon University (2018-2023)", "PhD Machine Learning"),
        ("MCA, Pune University (2019-2022)", "MCA"),
    ],
)
def test_degree_is_never_swallowed_by_the_institution(line, expect_degree):
    assert _one(line).degree == expect_degree


def test_duration_is_stripped_out_of_the_stored_names():
    """The date must not remain inside institution or degree text."""
    e = _one("B.Tech Computer Science, IIT Madras (2014-2018)")
    assert "2014" not in e.institution and "2014" not in e.degree
    assert "(" not in e.institution and ")" not in e.institution
