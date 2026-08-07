"""
The model may not contradict the parser (M-4).

Guarantee, not mitigation: a prompt lowers the odds of the model asserting an
absence its own input refutes; this layer makes it impossible. The two cases
from the audit are pinned first — `missing_skills: ["React and TypeScript…"]`
alongside `skills: [… React, Typescript …]`, and a weakness denying
high-throughput experience on a résumé that states "4M transactions per day".

The tests are written in both directions on purpose. Suppressing a REAL gap
would be the more dangerous bug of the two: a recruiter would never see it.
"""

from __future__ import annotations

import pytest

from app.schemas.resume import (
    EducationEntry,
    ExperienceEntry,
    ProjectEntry,
    ResumeData,
)
from app.services.reconciliation import (
    canonical_skill_key,
    reconcile_analysis,
)


def _resume(**overrides) -> ResumeData:
    base = dict(
        name="Priya Raghunathan",
        email="priya@example.com",
        phone="+91 98765 43210",
        skills=["Python", "FastAPI", "PostgreSQL", "React", "Typescript", "Redis"],
        education=[EducationEntry(degree="B.Tech Computer Science", institution="IIT Madras")],
        experience=[ExperienceEntry(role="Senior Backend Engineer", company="Razorpay")],
        projects=[ProjectEntry(title="Payment Reconciliation Engine")],
        certifications=["AWS Certified Solutions Architect - Associate"],
        total_experience_years=7,
    )
    base.update(overrides)
    return ResumeData(**base)


def _run(resume, missing=None, weaknesses=None):
    return reconcile_analysis(
        resume_data=resume, missing_skills=missing or [], weaknesses=weaknesses or []
    )


# ── the two audit findings ───────────────────────────────────────────────────

def test_audit_case_missing_skill_that_the_resume_lists():
    missing, _, report = _run(
        _resume(), missing=["React and TypeScript for internal tooling"]
    )
    assert missing == []
    assert report.removed_missing_skills == ["React and TypeScript for internal tooling"]


def test_audit_case_weakness_denying_an_extracted_project():
    _, weaknesses, report = _run(
        _resume(),
        weaknesses=["No mention of experience with Payment Reconciliation Engine"],
    )
    assert weaknesses == []
    assert len(report.removed_weaknesses) == 1


# ── parser says it exists → the model may not call it missing ────────────────

@pytest.mark.parametrize(
    "claim",
    ["React", "react", "  REACT  ", "React.js", "ReactJS", "react js", "Typescript", "TypeScript"],
)
def test_extracted_skill_can_never_be_reported_missing(claim):
    missing, _, _ = _run(_resume(), missing=[claim])
    assert missing == [], f"{claim!r} is in the résumé but survived as missing"


def test_postgres_alias_is_not_a_different_skill():
    missing, _, _ = _run(_resume(), missing=["Postgres"])
    assert missing == []


# ── parser did NOT extract it → a real gap must survive ──────────────────────

@pytest.mark.parametrize("claim", ["GraphQL", "Kubernetes", "Rust", "Terraform"])
def test_genuine_gaps_are_preserved(claim):
    missing, _, report = _run(_resume(), missing=[claim])
    assert missing == [claim], "suppressing a real gap hides it from the recruiter"
    assert report.removed_missing_skills == []


def test_partially_refuted_claim_survives():
    """"React and Kubernetes" — React is present, Kubernetes is not.

    The claim still carries a real gap, so it must not be deleted wholesale.
    """
    missing, _, _ = _run(_resume(), missing=["React and Kubernetes"])
    assert missing == ["React and Kubernetes"]


# ── normalization ────────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "a,b",
    [
        ("React", "react.js"), ("React", "ReactJS"), ("Node.js", "nodejs"),
        ("Node.js", "node js"), ("PostgreSQL", "postgres"), ("JavaScript", "javascript"),
        ("JavaScript", "JS"), ("TypeScript", "ts"), ("C++", "c plus plus"),
        ("C++", "cpp"), ("Kubernetes", "k8s"), ("Go", "golang"),
        ("  FastAPI  ", "fastapi"),
    ],
)
def test_equivalent_spellings_share_a_key(a, b):
    assert canonical_skill_key(a) == canonical_skill_key(b)


@pytest.mark.parametrize("a,b", [("C", "C++"), ("C", "C#"), ("Java", "JavaScript"), ("Go", "Google")])
def test_distinct_skills_do_not_collide(a, b):
    assert canonical_skill_key(a) != canonical_skill_key(b)


def test_duplicate_claims_are_all_removed():
    missing, _, report = _run(_resume(), missing=["React", "react", "React.js", "GraphQL"])
    assert missing == ["GraphQL"]
    assert len(report.removed_missing_skills) == 3


# ── weaknesses: absence claims only ──────────────────────────────────────────

def test_degree_judgements_are_not_touched():
    """"Limited experience with X" is an opinion about depth, not an absence.

    The model is entitled to it even for a skill the résumé lists; deleting it
    would be rewriting the model's reasoning rather than removing a falsehood.
    """
    weakness = "Limited experience with React at scale"
    _, weaknesses, _ = _run(_resume(), weaknesses=[weakness])
    assert weaknesses == [weakness]


@pytest.mark.parametrize(
    "weakness",
    [
        "No experience with React",
        "No clear experience with Typescript",
        "Lacks PostgreSQL exposure",
        "Missing FastAPI background",
        "Does not mention Redis",
        "No mention of Razorpay",
        "Not mentioned: AWS Certified Solutions Architect - Associate",
    ],
)
def test_absence_claims_about_extracted_facts_are_removed(weakness):
    _, weaknesses, _ = _run(_resume(), weaknesses=[weakness])
    assert weaknesses == []


@pytest.mark.parametrize(
    "weakness",
    [
        "No experience with Kubernetes",
        "Lacks Terraform exposure",
        "No mention of team leadership",
    ],
)
def test_absence_claims_about_genuinely_absent_things_survive(weakness):
    _, weaknesses, _ = _run(_resume(), weaknesses=[weakness])
    assert weaknesses == [weakness]


def test_short_skill_names_do_not_match_inside_words():
    """"Go" must not match "Google"; "C" must not match "Docker"."""
    resume = _resume(skills=["Go", "C"])
    weakness = "No mention of Google Cloud or Docker orchestration"
    _, weaknesses, _ = _run(resume, weaknesses=[weakness])
    assert weaknesses == [weakness]


# ── uncertainty → leave the model alone ──────────────────────────────────────

def test_empty_extraction_changes_nothing():
    """No structured facts is uncertainty, not evidence of absence."""
    blank = _resume(skills=[], education=[], experience=[], projects=[], certifications=[])
    missing, weaknesses, report = _run(
        blank, missing=["React"], weaknesses=["No experience with React"]
    )
    assert missing == ["React"]
    assert weaknesses == ["No experience with React"]
    assert not report.changed


def test_no_contradictions_is_a_no_op():
    """The common case must pass through byte-identical (no regression)."""
    missing_in = ["GraphQL", "Terraform"]
    weak_in = ["Limited depth in distributed systems", "No exposure to Rust"]
    missing, weaknesses, report = _run(_resume(), missing=missing_in, weaknesses=weak_in)
    assert missing == missing_in
    assert weaknesses == weak_in
    assert not report.changed


def test_inputs_are_never_mutated():
    missing_in = ["React"]
    weak_in = ["No experience with React"]
    _run(_resume(), missing=missing_in, weaknesses=weak_in)
    assert missing_in == ["React"], "caller's list was mutated in place"
    assert weak_in == ["No experience with React"]


def test_nothing_is_ever_added():
    missing, weaknesses, _ = _run(
        _resume(), missing=["React", "GraphQL"], weaknesses=["No exposure to Rust"]
    )
    assert set(missing).issubset({"React", "GraphQL"})
    assert set(weaknesses).issubset({"No exposure to Rust"})


# ── the score, not just the text ─────────────────────────────────────────────

def test_reconciliation_runs_before_scoring():
    """A phantom absence must not cost the candidate rank.

    `missing_skills` feeds `compute_candidate_score`, so reconciling only the
    displayed text would leave the penalty in place where it actually matters.
    """
    from app.nlp.ranking_engine import compute_candidate_score
    from app.schemas.analysis import ScoreBreakdown
    from app.schemas.batch import RankingWeights

    resume = _resume()
    breakdown = ScoreBreakdown(
        technical_skills=27, experience=20, education=6, projects=10, impact=9
    )
    common = dict(
        ats_score=72, ats_breakdown=breakdown, matching_skills=["Python", "FastAPI"],
        relevant_projects=["Payment Reconciliation Engine"], less_relevant_projects=[],
        semantic=0.36, weights=RankingWeights(),
    )
    phantom, _, _ = reconcile_analysis(
        resume_data=resume, missing_skills=["React", "Typescript"], weaknesses=[]
    )
    assert phantom == []
    with_phantom = compute_candidate_score(missing_skills=["React", "Typescript"], **common)
    reconciled = compute_candidate_score(missing_skills=phantom, **common)
    assert reconciled.overall >= with_phantom.overall
