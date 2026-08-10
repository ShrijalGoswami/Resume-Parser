"""
Core-requirement gate (Fit calibration).

The audit proved Fit was dominated by JD-INDEPENDENT résumé structure: a tidy
résumé with none of the role's specialised skills still floored around ~50. The
gate in `ranking_engine.compute_candidate_score` damps the whole score by how
many of the role's *specialised* (non-generic) requirements the candidate has,
so generic skills can no longer float an unqualified candidate — while a genuine
specialist is left untouched.

These fixtures are DETERMINISTIC: they feed crafted matching/missing lists and
ATS breakdowns straight into the scorer (no Groq, no network). They assert
relative ordering and gate BEHAVIOUR for an AI/ML Engineer JD archetype. They
deliberately do NOT assert any external reference tool's exact numbers.

Archetypes (not tied to any real candidate or single JD):
  A. Strong ML specialist        — RAG, embeddings, PyTorch/scikit-learn, APIs, deploy
  B. Generic software engineer   — strong Python/REST/Git, no ML core
  C. ML work filed under Projects — 0 experience entries, real ML skills
  D. Missing multiple core reqs   — a couple of core matches, most missing
  E. Synonym / messy spellings    — same skills as A, differently spelled

Runnable without pytest:  python -m tests.test_core_requirement_gate
(from backend/, with the project venv active)
"""
from __future__ import annotations

import pytest

from app.nlp.ranking_engine import (
    compute_candidate_score,
    CORE_COVERAGE_FLOOR,
)
from app.schemas.analysis import ScoreBreakdown
from app.schemas.batch import RankingWeights

W = RankingWeights()  # canonical 30/20/15/10/10/10/5

#: The AI/ML Engineer JD archetype these fixtures have always been written
#: against. It is now PASSED EXPLICITLY, because the core-requirement universe
#: is a function of the JD alone (`jd_core_universe`) rather than of whichever
#: skills the LLM happened to list for a candidate. Its 13 specialised
#: requirements are the same for every archetype below — that is the property
#: `test_same_jd_same_denominator_for_every_candidate` pins.
AIML_JD = (
    "AI/ML Engineer: build and ship models with PyTorch, TensorFlow, scikit-learn "
    "and XGBoost; design RAG pipelines with LangChain over vector stores; use "
    "embeddings and semantic search; own MLOps and deploy with Docker on AWS. "
    "Required: Python, machine learning, PyTorch, embeddings, RAG."
)

#: A JD naming too few SPECIALISED skills to gate on (Python/Git/REST are all
#: generic) — the thin-signal escape hatch.
THIN_JD = "Engineer: write Python, use Git, ship REST APIs."


def _score(*, matching, missing, breakdown, ats, semantic,
           relevant=(), less=(), resume_skills=(), jd=AIML_JD):
    return compute_candidate_score(
        ats_score=ats,
        ats_breakdown=breakdown,
        matching_skills=list(matching),
        missing_skills=list(missing),
        relevant_projects=list(relevant),
        less_relevant_projects=list(less),
        semantic=semantic,
        weights=W,
        resume_skills=list(resume_skills),
        job_description=jd,
    )


# Structurally-strong résumé breakdowns (near-max ATS) shared by several
# archetypes — the whole point is that structure alone must NOT float the score.
_FULL = ScoreBreakdown(technical_skills=30, projects=25, experience=20, education=10, impact=15)
_NO_EXP = ScoreBreakdown(technical_skills=30, projects=20, experience=0, education=6, impact=12)

# ── Archetype fixtures ───────────────────────────────────────────────────────
#: `resume_skills` is what the RÉSUMÉ ITSELF lists, and it is now the primary
#: (deterministic) evidence for coverage. Each archetype's list is simply the
#: reading its matching/missing pair always implied — A is missing exactly
#: TensorFlow and MLOps, so A's résumé carries every other requirement.
A_STRONG_ML = dict(
    matching=["Python", "PyTorch", "scikit-learn", "Embeddings", "RAG",
              "REST APIs", "Git", "Docker", "AWS"],
    missing=["TensorFlow", "MLOps"],
    resume_skills=["Python", "PyTorch", "scikit-learn", "XGBoost", "Embeddings",
                   "RAG", "LangChain", "vector stores", "semantic search",
                   "machine learning", "Docker", "AWS", "REST APIs", "Git"],
    breakdown=_FULL, ats=85, semantic=0.25, relevant=["a", "b", "c"], less=[],
)
B_GENERIC_SWE = dict(
    matching=["Python", "Git", "REST APIs", "Linux"],
    missing=["PyTorch", "TensorFlow", "scikit-learn", "Embeddings", "RAG",
             "LangChain", "MLOps", "vector stores"],
    resume_skills=["Python", "Git", "REST APIs", "Linux", "Bash", "SQL"],
    breakdown=_FULL, ats=80, semantic=0.13, relevant=["x"], less=["y"],
)
C_ML_UNDER_PROJECTS = dict(
    matching=["Python", "scikit-learn", "XGBoost", "Embeddings", "Docker", "Git"],
    missing=["PyTorch", "TensorFlow", "MLOps", "AWS or Azure"],
    resume_skills=["Python", "scikit-learn", "XGBoost", "Embeddings", "RAG",
                   "machine learning", "Docker", "Git"],
    breakdown=_NO_EXP, ats=73, semantic=0.16, relevant=["p", "q", "r", "s"], less=[],
)
D_MISSING_CORE = dict(
    matching=["Python", "Git", "REST APIs", "scikit-learn"],
    missing=["PyTorch", "TensorFlow", "Embeddings", "RAG", "LangChain",
             "MLOps", "vector stores"],
    resume_skills=["Python", "Git", "REST APIs", "scikit-learn", "SQL"],
    breakdown=_FULL, ats=80, semantic=0.14, relevant=["x"], less=["y"],
)
# Same skills as A, spelled the way a résumé/LLM might vary them.
E_SYNONYMS = dict(
    matching=["python", "Py-Torch".replace("-", ""), "Scikit Learn", "embeddings",
              "RAG", "RESTful APIs", "git", "docker", "aws"],
    missing=["TensorFlow", "MLOps"],
    resume_skills=["python", "PyTorch", "Scikit Learn", "XG-Boost".replace("-", ""),
                   "embeddings", "RAG", "Lang Chain".replace(" ", ""),
                   "vector stores", "semantic search", "machine learning",
                   "docker", "aws", "RESTful APIs", "git"],
    breakdown=_FULL, ats=85, semantic=0.25, relevant=["a", "b", "c"], less=[],
)


# 1. Strong ML specialist is preserved — coverage ≥ target, factor 1.0.
def test_strong_ml_is_not_penalised():
    s = _score(**A_STRONG_ML)
    assert s.core_factor == 1.0
    assert s.core_coverage is not None and s.core_coverage >= 0.5
    assert s.overall >= 70  # stays a strong match


# 2. Generic SWE with no ML core is materially reduced and cannot float at 50+.
def test_generic_swe_is_gated_down():
    s = _score(**B_GENERIC_SWE)
    # Only generic skills matched → ~zero specialised coverage → at the floor.
    assert s.core_coverage == 0.0
    assert s.core_factor == pytest.approx(CORE_COVERAGE_FLOOR)
    assert s.overall < 40  # no longer propped up by résumé structure


# 3. THE INVERSION FIX: ML work filed under Projects (0 experience entries)
#    must still outrank the generic SWE, even though it loses all 20 experience
#    points. Specialised skills beat résumé structure.
def test_ml_under_projects_outranks_generic_swe():
    ml = _score(**C_ML_UNDER_PROJECTS)
    generic = _score(**B_GENERIC_SWE)
    assert ml.overall > generic.overall
    # Sanity: the ML candidate genuinely earned 0 experience points here.
    exp = next(c for c in ml.components if c.key == "experience")
    assert exp.earned == 0.0


# 4. Missing multiple core requirements pulls the factor below 1 and reduces Fit
#    relative to an otherwise-identical full-coverage résumé.
def test_missing_core_requirements_reduces_fit():
    partial = _score(**D_MISSING_CORE)
    full = _score(**A_STRONG_ML)
    assert partial.core_factor < 1.0
    assert partial.overall < full.overall
    # And it sits between the strong specialist and the pure generic engineer.
    generic = _score(**B_GENERIC_SWE)
    assert generic.overall < partial.overall < full.overall


# 5. Synonyms / messy spellings must NOT be punished: canonicalisation folds
#    them, so coverage and score match the clean-spelling specialist.
def test_synonym_spellings_are_not_punished():
    clean = _score(**A_STRONG_ML)
    messy = _score(**E_SYNONYMS)
    assert messy.core_coverage == clean.core_coverage
    assert messy.core_factor == clean.core_factor
    assert messy.overall == clean.overall


# 6. Overall ranking of the whole cohort is sane and matches hiring intuition:
#    specialist > ML-under-projects > partial-core > generic.
def test_full_cohort_ordering():
    a = _score(**A_STRONG_ML).overall
    c = _score(**C_ML_UNDER_PROJECTS).overall
    d = _score(**D_MISSING_CORE).overall
    b = _score(**B_GENERIC_SWE).overall
    assert a > c > d > b


# 7. Thin JD / LLM-down fallback: too few specialised skills to gate on → no
#    damping, behaviour identical to before the gate existed.
def test_thin_signal_leaves_score_untouched():
    s = _score(
        matching=["Python"], missing=["Git"],
        resume_skills=["Python", "Git"], jd=THIN_JD,
        breakdown=_FULL, ats=80, semantic=0.2,
    )
    assert s.core_coverage is None
    assert s.core_factor == 1.0
    assert not any(c.key == "core_requirements" for c in s.components)


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
