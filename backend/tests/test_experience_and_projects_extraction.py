"""
Experience headings and project boundaries (M-3.3, M-3.4).

Two defects from the audit, both on the same fixture:

  role:    "Senior Backend Engineer, Razorpay ()"     company: ""
  projects: ONE entry, where the second project had become the FIRST one's
            description — the résumé simply lost a project.

The heading defect had two causes: comma was not a role/company separator, so
"Role, Company" never split; and the date was removed with `.replace()` using a
match found in a lowercased copy, leaving the emptied brackets behind, stored
verbatim in every record.

The project defect was an inverted heuristic: a line ENDING in a full stop was
treated as a continuation, when a full stop is precisely the evidence that a
line stands alone.
"""

from __future__ import annotations

import pytest

from app.nlp.extractor import extract_experience, extract_projects


# ── experience headings ──────────────────────────────────────────────────────

def test_audit_case_role_comma_company_with_dates():
    entries = extract_experience(
        "Senior Backend Engineer, Razorpay (2021-2025)\n"
        "- Built the payment reconciliation engine.\n"
        "Backend Engineer, Freshworks (2018-2021)\n"
        "- Designed the multi-tenant billing service.\n"
    )
    assert len(entries) == 2
    assert entries[0].role == "Senior Backend Engineer"
    assert entries[0].company == "Razorpay"
    assert entries[1].role == "Backend Engineer"
    assert entries[1].company == "Freshworks"


def test_no_empty_brackets_survive_in_the_role():
    """The exact string the audit found stored: 'Senior Backend Engineer, Razorpay ()'."""
    e = extract_experience("Senior Backend Engineer, Razorpay (2021-2025)\n- Did work.")[0]
    for field in (e.role, e.company):
        assert "()" not in field and "( )" not in field
        assert not field.strip().endswith("(")


@pytest.mark.parametrize(
    "heading,role,company",
    [
        ("Software Engineer at Acme Corp (2020-2023)", "Software Engineer", "Acme Corp"),
        ("Data Analyst | Globex (2019-2021)", "Data Analyst", "Globex"),
        ("Senior Backend Engineer, Razorpay (2021-2025)", "Senior Backend Engineer", "Razorpay"),
        ("Consultant, Deloitte (2017-2019)", "Consultant", "Deloitte"),
        ("Solutions Architect, Infosys (2015-2018)", "Solutions Architect", "Infosys"),
    ],
)
def test_heading_forms(heading, role, company):
    e = extract_experience(f"{heading}\n- Did the work.")[0]
    assert e.role == role
    assert e.company == company


def test_comma_inside_a_company_name_is_not_a_split():
    """'Acme, Inc.' must survive — the explicit separator wins first."""
    e = extract_experience("Software Engineer at Acme, Inc. (2020-2023)\n- Shipped.")[0]
    assert e.role == "Software Engineer"
    assert e.company == "Acme, Inc."


def test_company_and_location_are_not_split_into_role_and_company():
    """No role keyword on either side, so the comma is left alone."""
    e = extract_experience("Razorpay, Bengaluru (2021-2025)\n- Did things.")[0]
    assert e.company == "Razorpay, Bengaluru"
    assert e.role == ""


def test_bullets_are_still_captured():
    e = extract_experience(
        "Senior Backend Engineer, Razorpay (2021-2025)\n"
        "- Built the reconciliation engine.\n"
        "- Cut p99 latency from 840ms to 190ms.\n"
    )[0]
    assert len(e.description) == 2
    assert "reconciliation engine" in e.description[0]


def test_duration_is_extracted_and_not_left_in_the_names():
    e = extract_experience("Senior Backend Engineer, Razorpay (2021-2025)\n- Work.")[0]
    assert "2021" in e.duration and "2025" in e.duration
    assert "2021" not in e.role and "2021" not in e.company


# ── project boundaries ───────────────────────────────────────────────────────

def test_audit_case_two_single_line_projects_stay_separate():
    projects = extract_projects(
        "Payment Reconciliation Engine - event-sourced ledger reconciling gateway and bank statements.\n"
        "Realtime Fraud Detector - streaming feature pipeline scoring transactions in under 50ms.\n"
    )
    assert len(projects) == 2, "the second project was absorbed as the first's description"
    assert projects[0].title == "Payment Reconciliation Engine"
    assert projects[1].title == "Realtime Fraud Detector"


def test_inline_summary_becomes_the_description_not_the_title():
    p = extract_projects(
        "Payment Reconciliation Engine - event-sourced ledger reconciling gateway and bank statements.\n"
    )[0]
    assert p.title == "Payment Reconciliation Engine"
    assert p.description and "event-sourced" in p.description[0]


def test_classic_title_plus_bullets_still_works():
    p = extract_projects(
        "Fraud Detector\n- Streaming pipeline scoring transactions.\n- Cut false positives by 30%.\n"
    )[0]
    assert p.title == "Fraud Detector"
    assert len(p.description) == 2


def test_hyphenated_project_name_is_not_split():
    p = extract_projects("E-Commerce Platform\n- Built checkout and cart.")[0]
    assert p.title == "E-Commerce Platform"


def test_three_single_line_projects():
    projects = extract_projects(
        "Alpha Service - a distributed queue for high throughput jobs.\n"
        "Beta Pipeline - a streaming feature store for online models.\n"
        "Gamma Gateway - an edge router handling millions of requests.\n"
    )
    assert [p.title for p in projects] == ["Alpha Service", "Beta Pipeline", "Gamma Gateway"]


def test_lowercase_continuation_still_merges():
    """Wrapped text must not become a new project."""
    projects = extract_projects(
        "Payment Reconciliation Engine - an event-sourced ledger that reconciles\n"
        "gateway statements against bank settlement files nightly.\n"
    )
    assert len(projects) == 1
    assert "bank settlement" in " ".join(projects[0].description)


def test_empty_section_returns_nothing():
    assert extract_projects("") == []
