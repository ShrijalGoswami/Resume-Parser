"""
D2 — the JD defines ONE authoritative core-requirement universe.

THE DEFECT THE CALIBRATION AUDITS FOUND: the universe was
`llm_matched ∪ llm_missing ∪ (résumé ∩ JD)` — rebuilt per candidate. One AI/ML
JD produced denominators of 6, 8 and 5 for three candidates; one Cybersecurity
JD produced 8, 7 and 8. "0 / n" for two candidates was not the same
measurement, yet the ranking compared them directly. The model also controlled
the denominator: a requirement its prose acknowledged but its lists omitted
vanished from that one candidate's universe.

NOW: `jd_core_universe(jd)` is a pure function of the JOB DESCRIPTION. The LLM
may only AUGMENT the numerator; it can neither widen nor narrow the denominator.

Nothing about the factor curve, the 0.35 floor or the Fit weights changed.
All deterministic — no Groq, no network.
"""
from __future__ import annotations

from pathlib import Path

import pytest

from app.nlp.ranking_engine import (
    compute_candidate_score, jd_core_universe, semantic_similarity,
    resume_to_text, CORE_COVERAGE_FLOOR, MIN_CORE_SKILLS,
)
from app.nlp.ats_scorer import calculate_ats_score
from app.services.reconciliation import reconcile_analysis
from app.schemas.analysis import ScoreBreakdown
from app.schemas.batch import RankingWeights
from app.schemas.resume import ResumeData

W = RankingWeights()
_STRUCT = ScoreBreakdown(technical_skills=30, projects=20, experience=20,
                         education=10, impact=12)

AIML_JD = (
    "AI/ML Engineer: build models with PyTorch and scikit-learn; design RAG "
    "pipelines over vector stores; use embeddings and semantic search; deploy "
    "with Docker. Required: Python, machine learning, embeddings, PyTorch, XGBoost.")
CYBER_JD = (
    "Cybersecurity Engineer: penetration testing, cryptography, OWASP ZAP, "
    "Wireshark, network traffic analysis, anomaly detection, SIEM, secure coding.")


def _score(resume_skills, jd, matching=(), missing=(), breakdown=_STRUCT,
           ats=80, semantic=0.15):
    return compute_candidate_score(
        ats_score=ats, ats_breakdown=breakdown,
        matching_skills=list(matching), missing_skills=list(missing),
        relevant_projects=[], less_relevant_projects=[],
        semantic=semantic, weights=W,
        resume_skills=list(resume_skills), job_description=jd,
    )


def _denominator(score):
    return next(c for c in score.components if c.key == "core_requirements").max


# ── 1. One JD ⇒ one denominator, for every candidate ─────────────────────────
def test_same_jd_same_denominator_for_every_candidate():
    cohort = [
        ["Python", "PyTorch", "scikit-learn", "XGBoost", "Embeddings", "RAG", "Docker"],
        ["Python", "pandas", "NumPy", "scikit-learn"],
        ["Java", "Spring Boot", "MySQL"],
        [],                                   # empty résumé
        ["Wireshark", "OWASP ZAP", "Cryptography"],
    ]
    scores = [_score(skills, AIML_JD) for skills in cohort]
    denominators = {_denominator(s) for s in scores}
    assert len(denominators) == 1, f"denominator varied across candidates: {denominators}"
    assert denominators.pop() == float(len(jd_core_universe(AIML_JD)))


def test_denominator_is_independent_of_llm_output():
    """Same résumé, wildly different LLM lists ⇒ identical denominator."""
    skills = ["Python", "PyTorch", "scikit-learn", "Docker"]
    a = _score(skills, AIML_JD, matching=[], missing=[])
    b = _score(skills, AIML_JD, matching=["PyTorch"], missing=["Kubernetes", "Terraform"])
    c = _score(skills, AIML_JD,
               matching=["PyTorch", "scikit-learn", "Docker", "Rust", "COBOL"],
               missing=["Haskell"])
    assert _denominator(a) == _denominator(b) == _denominator(c)


def test_two_different_jds_have_their_own_universes():
    assert jd_core_universe(AIML_JD) != jd_core_universe(CYBER_JD)
    assert len(jd_core_universe(AIML_JD)) >= MIN_CORE_SKILLS
    assert len(jd_core_universe(CYBER_JD)) >= MIN_CORE_SKILLS


# ── 2. An LLM omission cannot remove a requirement ───────────────────────────
def test_llm_omission_cannot_shrink_the_denominator():
    """The visible-Chrome audit's exact case: the model's prose acknowledged
    'secure coding' but listed it in neither matched nor missing, and the
    requirement silently left that candidate's universe."""
    skills = ["Python", "Wireshark"]
    full = _score(skills, CYBER_JD, matching=["Wireshark"],
                  missing=["penetration testing", "cryptography", "OWASP ZAP",
                           "network traffic analysis", "anomaly detection",
                           "SIEM", "secure coding"])
    omitted = _score(skills, CYBER_JD, matching=["Wireshark"],
                     missing=["penetration testing", "cryptography", "OWASP ZAP",
                              "network traffic analysis", "anomaly detection",
                              "SIEM"])          # 'secure coding' dropped
    assert _denominator(full) == _denominator(omitted)
    assert full.core_coverage == omitted.core_coverage
    assert full.core_factor == omitted.core_factor
    # Fit itself may still differ slightly: `missing_skills` remains an input to
    # the SKILLS dimension (matched/(matched+missing)), which is deliberate and
    # unchanged. What D2 guarantees is that the omission cannot move the
    # core-requirement denominator, the coverage, or the gate's damping factor.


def test_total_llm_silence_does_not_shrink_the_denominator():
    skills = ["Python", "PyTorch", "Docker"]
    spoken = _score(skills, AIML_JD, matching=["PyTorch"], missing=["XGBoost"])
    silent = _score(skills, AIML_JD, matching=[], missing=[])
    assert _denominator(spoken) == _denominator(silent)


# ── 3. An LLM hallucination cannot add a requirement ─────────────────────────
def test_llm_hallucination_cannot_grow_the_denominator():
    skills = ["Python", "PyTorch"]
    clean = _score(skills, AIML_JD, matching=["PyTorch"], missing=["XGBoost"])
    hallucinated = _score(
        skills, AIML_JD,
        matching=["PyTorch", "Kubernetes", "Terraform", "Elixir"],
        missing=["XGBoost", "Blockchain", "Quantum Computing", "SAP", "Fortran"])
    assert _denominator(clean) == _denominator(hallucinated)
    # Invented skills the JD never named cannot be credited either.
    assert clean.core_coverage == hallucinated.core_coverage


def test_hallucinated_match_cannot_inflate_coverage():
    """A model claiming skills the JD never asked for must not raise coverage."""
    skills = ["Python"]
    honest = _score(skills, CYBER_JD, matching=[], missing=[])
    inflated = _score(skills, CYBER_JD,
                      matching=["Rust", "Kafka", "Kubernetes", "GraphQL"])
    assert honest.core_coverage == inflated.core_coverage == 0.0
    assert inflated.core_factor == pytest.approx(CORE_COVERAGE_FLOOR)


# ── 4. Résumé-present + JD-present is always credited ────────────────────────
def test_resume_and_jd_overlap_is_always_credited():
    """Deterministic evidence stands on its own — even against an LLM that
    calls the skill MISSING."""
    skills = ["Python", "PyTorch", "scikit-learn", "XGBoost", "Docker", "Embeddings"]
    # The model wrongly reports everything missing and matches nothing.
    s = _score(skills, AIML_JD, matching=[],
               missing=["PyTorch", "scikit-learn", "XGBoost", "Docker", "embeddings"])
    universe = jd_core_universe(AIML_JD)
    assert s.core_coverage is not None and s.core_coverage > 0.0
    matched = next(c for c in s.components if c.key == "core_requirements").earned
    assert matched >= 5, "every résumé∩JD skill must count"
    assert s.core_factor == 1.0
    assert len(universe) == _denominator(s)


def test_llm_match_augments_beyond_the_vocabulary_scan():
    """The LLM may ADD numerator entries the deterministic scan phrased
    differently — it just cannot touch the denominator."""
    skills = ["Python"]                     # résumé scan finds nothing specialised
    without = _score(skills, AIML_JD, matching=[])
    with_llm = _score(skills, AIML_JD, matching=["PyTorch", "embeddings", "RAG"])
    assert with_llm.core_coverage > without.core_coverage
    assert _denominator(with_llm) == _denominator(without)


# ── 5. Synonym / compound reconciliation still works ─────────────────────────
def test_synonym_spellings_are_canonicalised_into_coverage():
    clean = _score(["PyTorch", "scikit-learn", "XGBoost", "Docker"], AIML_JD)
    messy = _score(["Py Torch".replace(" ", ""), "Scikit Learn", "XG Boost".replace(" ", ""),
                    "docker"], AIML_JD)
    assert messy.core_coverage == clean.core_coverage
    assert messy.core_factor == clean.core_factor
    assert messy.overall == clean.overall


@pytest.mark.parametrize("claim,have,dropped", [
    ("PyTorch/TensorFlow", "PyTorch", True),      # OR-claim, one present → drop
    ("React/Next.js", "React", True),
    ("JavaScript/TypeScript", "TypeScript", True),
    ("CI/CD", "Python", False),                   # single token with a slash
    ("Kubernetes/Terraform", "Docker", False),    # OR-claim, neither present
])
def test_or_slash_reconciliation_is_preserved(claim, have, dropped):
    """The OR/slash fix is untouched by the universe refactor."""
    resume = ResumeData(name="X", skills=[have, "Git"])
    missing, _, report = reconcile_analysis(
        resume_data=resume, missing_skills=[claim], weaknesses=[])
    assert (claim in report.removed_missing_skills) is dropped
    assert (claim not in missing) is dropped


def test_compound_claim_does_not_depress_coverage():
    skills = ["Typescript", "React", "Next.Js", "Html", "Docker", "Python"]
    jd = ("Full-Stack Engineer: build UIs in React and Next.js with TypeScript and "
          "Tailwind CSS; implement REST APIs; deploy with Docker.")
    s = _score(skills, jd, matching=["React", "Next.js"],
               missing=["JavaScript/TypeScript", "Tailwind CSS"])
    assert s.core_coverage is not None and s.core_coverage >= 0.5
    assert s.core_factor == 1.0


# ── 6. LLM-down still yields meaningful, JD-specific coverage ────────────────
def test_llm_down_coverage_is_jd_specific():
    strong = ["Python", "PyTorch", "scikit-learn", "XGBoost", "Embeddings", "RAG", "Docker"]
    generic = ["Python", "Git", "REST APIs", "Excel"]
    s_strong = _score(strong, AIML_JD, matching=[], missing=[])
    s_generic = _score(generic, AIML_JD, matching=[], missing=[])
    assert s_strong.core_coverage is not None
    assert s_generic.core_coverage is not None
    assert s_strong.core_coverage > s_generic.core_coverage
    assert s_strong.overall > s_generic.overall
    assert s_generic.core_factor >= CORE_COVERAGE_FLOOR


def test_llm_down_same_resume_scores_differently_per_jd():
    """JD-sensitivity, not a constant fallback."""
    sec = ["Wireshark", "OWASP ZAP", "Cryptography", "Anomaly Detection",
           "Network Traffic Analysis", "Python"]
    on_cyber = _score(sec, CYBER_JD, matching=[], missing=[])
    on_aiml = _score(sec, AIML_JD, matching=[], missing=[])
    assert on_cyber.core_coverage > on_aiml.core_coverage
    assert on_cyber.overall > on_aiml.overall


def test_thin_jd_still_disables_the_gate():
    s = _score(["Python", "Git"], "Engineer: write Python, use Git, ship REST APIs.")
    assert s.core_coverage is None
    assert s.core_factor == 1.0
    assert not any(c.key == "core_requirements" for c in s.components)


# ── 7. The audited cohort orderings do not regress ───────────────────────────
_SRC = Path(r"E:\Resume-Parser\Test Resume")
_FILES = {
    "Shrijal": "Shrijal_Goswami_Resume.pdf",
    "Narendra": "Narendra_Bishnoi_Resume.pdf",
    "Shubh": "Shubh-tyagi_resume.pdf",
}


def _cohort_fit(jd):
    """Deterministic (LLM-down) Fit for the three audited résumés."""
    from app.services.resume_service import ResumeService

    out = {}
    for name, filename in _FILES.items():
        path = _SRC / filename
        if not path.exists():
            pytest.skip(f"cohort résumé missing: {filename}")
        resume = ResumeService.process_resume(path)
        ats, breakdown, _ = calculate_ats_score(resume)
        out[name] = compute_candidate_score(
            ats_score=ats, ats_breakdown=breakdown,
            matching_skills=[], missing_skills=[],
            relevant_projects=[], less_relevant_projects=[],
            semantic=semantic_similarity(jd, resume_to_text(resume)),
            weights=W, resume_skills=list(resume.skills), job_description=jd,
        )
    return out


def test_aiml_ordering_does_not_regress():
    fits = _cohort_fit(AIML_JD)
    assert fits["Shrijal"].overall > fits["Narendra"].overall > fits["Shubh"].overall


def test_cybersecurity_ordering_does_not_regress():
    fits = _cohort_fit(CYBER_JD)
    assert fits["Shubh"].overall > fits["Shrijal"].overall > fits["Narendra"].overall


def test_specialist_leads_and_shares_the_cohort_denominator():
    for jd, leader in ((AIML_JD, "Shrijal"), (CYBER_JD, "Shubh")):
        fits = _cohort_fit(jd)
        denominators = {_denominator(s) for s in fits.values()}
        assert len(denominators) == 1, f"denominator varied within one JD: {denominators}"
        best = max(fits, key=lambda n: fits[n].core_coverage or 0.0)
        assert best == leader


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-q"]))
