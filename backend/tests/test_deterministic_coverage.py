"""
Deterministic core-requirement coverage (multi-JD calibration follow-up).

Core coverage must no longer depend on whether the LLM happened to list a skill:
it is anchored on the deterministic `resume.skills ∩ JD` intersection, augmented
(not replaced) by the LLM's matching/missing lists, and it stays JD-sensitive
when the LLM is down. These fixtures pin the exact failures the multi-JD audit
found. All deterministic — no Groq, no network.

Runnable without pytest:  python -m tests.test_deterministic_coverage
"""
from __future__ import annotations

from pathlib import Path

import pytest

from app.nlp.ranking_engine import (
    compute_candidate_score, extract_jd_skills, semantic_similarity, resume_to_text,
    CORE_COVERAGE_FLOOR,
)
from app.nlp.ats_scorer import calculate_ats_score
from app.services.reconciliation import reconcile_analysis
from app.schemas.analysis import ScoreBreakdown
from app.schemas.batch import RankingWeights
from app.schemas.resume import ResumeData

W = RankingWeights()
_STRUCT = ScoreBreakdown(technical_skills=30, projects=20, experience=20, education=10, impact=12)

BACKEND_JAVA_JD = (
    "Backend Engineer: build services with Java and Spring Boot; model data in "
    "MySQL and PostgreSQL; expose REST APIs and microservices; containerise with "
    "Docker. Required: Java, Spring Boot, relational databases, REST API design.")
FULLSTACK_JD = (
    "Full-Stack Engineer: build UIs in React and Next.js with TypeScript and "
    "Tailwind CSS; implement REST APIs; deploy with Docker. Required: JavaScript, "
    "TypeScript, React, Next.js, HTML, CSS, REST API design, Node.")
AIML_JD = (
    "AI/ML Engineer: build models with PyTorch and scikit-learn; design RAG "
    "pipelines over vector stores; use embeddings and semantic search; deploy "
    "with Docker. Required: Python, machine learning, embeddings, PyTorch, XGBoost.")


def _score(resume_skills, jd, matching=(), missing=(), breakdown=_STRUCT, ats=80):
    return compute_candidate_score(
        ats_score=ats, ats_breakdown=breakdown,
        matching_skills=list(matching), missing_skills=list(missing),
        relevant_projects=[], less_relevant_projects=[],
        semantic=0.15, weights=W,
        resume_skills=list(resume_skills), job_description=jd,
    )


# ── A. Dev + Backend: Spring Boot/Java/MySQL survive an LLM omission ──────────
def test_resume_skills_in_jd_count_even_when_llm_omits_them():
    dev_like = ["Java", "Spring Boot", "MySQL", "PostgreSQL", "REST APIs", "Docker", "Git", "Python"]
    # LLM returned NOTHING (omission / degraded) — deterministic path must still fire.
    has = _score(dev_like, BACKEND_JAVA_JD, matching=[], missing=[])
    lacks = _score(["Python", "Git", "Excel", "PowerPoint"], BACKEND_JAVA_JD, matching=[], missing=[])
    assert has.core_coverage is not None and lacks.core_coverage is not None
    assert has.core_coverage > lacks.core_coverage          # Spring Boot/MySQL/Docker recovered
    assert has.overall > lacks.overall
    # Spring Boot itself must be in the JD skill set (deterministic extraction works).
    assert "springboot" in extract_jd_skills(BACKEND_JAVA_JD, dev_like)


# ── B. Shrijal + Full-Stack: compound JavaScript/TypeScript claim ─────────────
def test_compound_or_missing_claim_is_reconciled_and_not_penalised():
    shrijal_like = ["Typescript", "React", "Next.Js", "Html", "Docker", "REST Apis", "Python"]
    resume = ResumeData(name="X", skills=shrijal_like)
    # 1) The compound OR-claim is dropped because the résumé has TypeScript.
    missing, _, report = reconcile_analysis(
        resume_data=resume, missing_skills=["JavaScript/TypeScript"], weaknesses=[])
    assert "JavaScript/TypeScript" in report.removed_missing_skills
    assert missing == []
    # 2) Even if it survived upstream, coverage still credits React/Next.js
    #    deterministically, so the candidate is not penalised into the floor.
    s = _score(shrijal_like, FULLSTACK_JD, matching=["React", "Next.js"],
               missing=["JavaScript/TypeScript", "Tailwind CSS", "Node"])
    assert s.core_coverage is not None and s.core_coverage >= 0.5
    assert s.core_factor == 1.0


@pytest.mark.parametrize("claim,have,dropped", [
    ("PyTorch/TensorFlow", "PyTorch", True),     # OR: one alternative present → drop
    ("React/Next.js", "React", True),            # OR: one present → drop
    ("JavaScript/TypeScript", "TypeScript", True),
    ("CI/CD", "Python", False),                  # single token w/ slash → NOT split, survives
    ("Kubernetes/Terraform", "Docker", False),   # OR but candidate has neither → survives
])
def test_or_vs_single_slash_tokens(claim, have, dropped):
    resume = ResumeData(name="X", skills=[have, "Git"])
    missing, _, report = reconcile_analysis(
        resume_data=resume, missing_skills=[claim], weaknesses=[])
    assert (claim in report.removed_missing_skills) is dropped
    assert (claim not in missing) is dropped


# ── C. LLM-down: coverage is still deterministic and JD-sensitive ─────────────
def test_llm_down_coverage_is_jd_sensitive_not_blind():
    strong = ["Python", "PyTorch", "scikit-learn", "XGBoost", "Embeddings", "RAG", "Docker"]
    generic = ["Python", "Git", "REST APIs", "Excel"]
    # matching/missing both empty == LLM unavailable.
    s_strong = _score(strong, AIML_JD, matching=[], missing=[])
    s_generic = _score(generic, AIML_JD, matching=[], missing=[])
    assert s_strong.core_coverage is not None      # NOT None/blind anymore
    assert s_generic.core_coverage is not None
    assert s_strong.core_coverage > s_generic.core_coverage
    assert s_strong.overall > s_generic.overall
    assert s_generic.core_factor >= CORE_COVERAGE_FLOOR


# ── D. Four-resume cohort: the specialist tops core coverage per JD, even
#       in fully-degraded (LLM-down) mode — proves no ranking regression. ──────
_SRC = Path(r"E:\Resume-Parser\Test Resume")
_FILES = {
    "Shrijal": "Shrijal_Goswami_Resume.pdf", "Narendra": "Narendra_Bishnoi_Resume.pdf",
    "Dev": "Dev_pathak_resume.pdf", "Shubh": "Shubh-tyagi_resume.pdf",
}


def _cohort_coverage(jd):
    from app.services.resume_service import ResumeService
    out = {}
    for name, f in _FILES.items():
        p = _SRC / f
        if not p.exists():
            pytest.skip(f"cohort résumé missing: {f}")
        rd = ResumeService.process_resume(p)
        ats, bd, _ = calculate_ats_score(rd)
        s = compute_candidate_score(
            ats_score=ats, ats_breakdown=bd, matching_skills=[], missing_skills=[],
            relevant_projects=[], less_relevant_projects=[],
            semantic=semantic_similarity(jd, resume_to_text(rd)), weights=W,
            resume_skills=list(rd.skills), job_description=jd)
        out[name] = s.core_coverage or 0.0
    return out


def test_cohort_specialist_leads_coverage_ai_ml():
    cov = _cohort_coverage(AIML_JD)
    assert cov["Shrijal"] == max(cov.values())


def test_cohort_specialist_leads_coverage_data_science():
    cov = _cohort_coverage(
        "Data Scientist: pandas, NumPy, scikit-learn, XGBoost, statistics, "
        "feature engineering, machine learning, data visualization.")
    assert cov["Narendra"] == max(cov.values())


def test_cohort_specialist_leads_coverage_cybersecurity():
    cov = _cohort_coverage(
        "Cybersecurity Engineer: penetration testing, cryptography, OWASP ZAP, "
        "Wireshark, network traffic analysis, anomaly detection, SIEM, secure coding.")
    assert cov["Shubh"] == max(cov.values())


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
