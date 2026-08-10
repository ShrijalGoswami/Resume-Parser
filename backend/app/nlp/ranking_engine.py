"""
Candidate ranking engine.

Combines deterministic signals (ATS rule-engine breakdown, JD/resume text
similarity, LLM-identified matching/missing skills and project relevance)
into a single, explainable, weighted score. Fully deterministic — the same
inputs always produce the same score. No external dependencies.

Rubric (default weights, configurable via RankingWeights):
    Skills 30 | Experience 20 | Projects 15 | ATS 10 | Education 10 |
    Semantic 10 | Achievements 5   →   Total 100
"""

import math
import re
from collections import Counter

from app.schemas.resume import ResumeData
from app.schemas.analysis import ScoreBreakdown
from app.schemas.batch import RankingWeights, CandidateScore, ScoreComponent
from app.services.reconciliation import canonical_skill_key
from app.nlp.skills_vocab import GENERIC_SKILLS, SKILL_VOCAB

# ── Core-requirement gate ───────────────────────────────────────────────────
# The calibration audit found that 45 of the 100 Fit points are
# JD-INDEPENDENT (experience entry count, ATS structure, education,
# achievements). A candidate with a tidy résumé but ZERO of the role's
# specialised skills still floored around ~50 because those structural points
# carried them, while the flat `matching/(matching+missing)` skills ratio gave
# generic skills (Python, Git, REST — every engineer has them) exactly the same
# weight as the skills that actually define the job.
#
# The gate multiplies the whole Fit by how many of the role's SPECIALISED
# (non-generic) requirements the candidate demonstrates. It does NOT reweight the
# dimensions or the factor curve.
#
# Coverage source of truth (multi-JD calibration follow-up):
#   * DETERMINISTIC baseline — résumé skills whose canonical key appears in the
#     JD (`resume.skills ∩ JD`). This is guaranteed to count regardless of what
#     the LLM listed, so an LLM extraction OMISSION can never erase a real match.
#   * LLM matching/missing AUGMENT it (add specialised skills the vocabulary
#     scan missed, e.g. "MLOps", and confirm matches) — never the sole source.
#   * LLM DOWN → coverage falls back to the deterministic JD∩résumé scan, so it
#     stays JD-SENSITIVE instead of collapsing to the old JD-blind 0.6 fallback.
#
# GENERIC_SKILLS / SKILL_VOCAB live in app.nlp.skills_vocab (shared, leaf-safe).
GENERIC_SKILL_KEYS = {canonical_skill_key(s) for s in GENERIC_SKILLS if canonical_skill_key(s)}

#: A core requirement is "met" once the candidate matches at least this fraction
#: of the role's specialised skills — at or above it, no penalty applies.
CORE_COVERAGE_TARGET = 0.5
#: The gate never drops Fit below this fraction of the earned structural score.
#: A candidate missing every speciality still has a real, if unqualified, résumé.
CORE_COVERAGE_FLOOR = 0.35
#: Below this many identified specialised skills the JD gives too thin a signal
#: to gate on, so the score is left exactly as it was (backward compatible with
#: thin JDs).
MIN_CORE_SKILLS = 3

#: A real skill is a short noun phrase. Longer LLM "missing" entries ("Python as
#: a backend language is mentioned but not clearly utilised…") are commentary,
#: not skills, and must not become phantom unmet requirements.
_MAX_SKILL_WORDS = 5
_MAX_SKILL_CHARS = 40
#: Word-boundary-ish JD scan (mirrors reconciliation): `+`/`#` are part of the
#: token so C++/C# stay distinct; too-short tokens (C, R, Go, IP) are skipped to
#: avoid matching inside ordinary words.
_MIN_SCAN_LEN = 3


def _looks_like_skill(s: str) -> bool:
    s = (s or "").strip()
    return bool(s) and len(s) <= _MAX_SKILL_CHARS and len(s.split()) <= _MAX_SKILL_WORDS


def _core_key_set(skills) -> set[str]:
    """Canonical keys of `skills`, ubiquitous generics and non-skill commentary
    removed — the specialised skills that actually distinguish fit for the role."""
    out: set[str] = set()
    for s in skills or []:
        if not _looks_like_skill(s):
            continue
        key = canonical_skill_key(s)
        if key and key not in GENERIC_SKILL_KEYS:
            out.add(key)
    return out


def extract_jd_skills(jd_text: str, extra_skills=()) -> set[str]:
    """Canonical keys of the skills a JD names. Scans the curated vocabulary plus
    any `extra_skills` (résumé terms that appear verbatim in the JD, caught even
    when they are not in the vocab).

    Purely deterministic — no LLM. This is what makes `resume.skills ∩ JD` a
    minimum source of truth and keeps coverage JD-sensitive when the LLM is down.

    NOTE ON `extra_skills`: passing a CANDIDATE's skills here makes the result
    candidate-dependent, which is exactly what `jd_core_universe()` must avoid.
    The universe therefore calls this with no extras. The parameter is kept for
    callers that want a candidate-aware JD scan for display or diagnostics.
    """
    text = jd_text or ""
    if not text:
        return set()
    found: set[str] = set()
    for phrase in set(SKILL_VOCAB) | {str(s) for s in (extra_skills or [])}:
        p = str(phrase).strip()
        if len(p) < _MIN_SCAN_LEN:
            continue
        if re.search(rf"(?<![\w+#]){re.escape(p)}(?![\w+#])", text, re.IGNORECASE):
            key = canonical_skill_key(p)
            if key:
                found.add(key)
    return found


def jd_core_universe(job_description: str) -> set[str]:
    """THE AUTHORITATIVE CORE-REQUIREMENT UNIVERSE for a role.

    A function of the JOB DESCRIPTION ALONE. Given one JD, every candidate is
    graded against this identical set, so `core_coverage` is a comparable ratio
    across a shortlist rather than a per-candidate opinion.

    WHY THIS EXISTS (the multi-JD + visible-Chrome calibration audits):
    the universe used to be `llm_matched ∪ llm_missing ∪ (résumé ∩ JD)`, which
    was rebuilt per candidate. One AI/ML JD produced denominators of 6, 8 and 5
    for three candidates; one Cybersecurity JD produced 8, 7 and 8. Two
    candidates' "0 / n" were not the same measurement, yet the ranking compared
    them directly. Worse, the LLM decided the denominator: when its prose
    asserted a candidate had "secure coding" but the skill appeared in neither
    its matched nor its missing list, that requirement silently vanished from
    that candidate's universe alone.

    Generic skills are removed here for the same reason they are removed from a
    candidate's keys: "python" or "rest" appears in nearly every engineering JD
    and does not discriminate. Everything else about scoring is unchanged.
    """
    return {
        key for key in extract_jd_skills(job_description)
        if key not in GENERIC_SKILL_KEYS
    }


def _core_signals(resume_skills, universe, matching_skills):
    """Return (coverage|None, n_matched, n_universe).

    universe  = `jd_core_universe(jd)` — fixed for the role, identical for every
                candidate, and NEVER widened or narrowed by LLM output.
    matched   = the universe entries the candidate demonstrably has:
                  * DETERMINISTIC  résumé skills ∩ universe   (always counted,
                    so an LLM omission can never erase a real match), plus
                  * LLM AUGMENT    the model's matched skills ∩ universe (adds
                    matches the vocabulary scan phrased differently).
                Intersecting with `universe` is what makes an LLM hallucination
                unable to invent a requirement or credit one the JD never named.
    coverage  = matched / universe
    """
    resume_keys = _core_key_set(resume_skills)
    llm_matched = _core_key_set(matching_skills)

    # A JD too thin to name MIN_CORE_SKILLS specialised skills gives too weak a
    # signal to gate on; leave the score exactly as it was (unchanged behaviour).
    if len(universe) < MIN_CORE_SKILLS:
        return None, 0, 0

    matched = (resume_keys | llm_matched) & universe
    coverage = len(matched) / len(universe)
    return coverage, len(matched), len(universe)

# Small stopword set for the bag-of-words semantic similarity.
_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "for", "with", "on", "at",
    "by", "from", "as", "is", "are", "be", "will", "we", "you", "our", "your",
    "this", "that", "it", "they", "their", "have", "has", "must", "should",
    "who", "what", "which", "job", "role", "team", "work", "working", "years",
    "experience", "strong", "good", "ability", "skills", "knowledge",
}

_TOKEN_RE = re.compile(r"[A-Za-z][A-Za-z0-9+#.\-]{1,}")
_YEAR_RE = re.compile(r"(19|20)\d{2}")


def _tokens(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text) if t.lower() not in _STOPWORDS and len(t) > 1]


def resume_to_text(resume_data: ResumeData) -> str:
    """Flatten a structured resume into a text blob for similarity scoring."""
    parts: list[str] = list(resume_data.skills) + list(resume_data.certifications)
    for exp in resume_data.experience:
        parts.append(f"{exp.role} {exp.company}")
        parts.extend(exp.description)
    for proj in resume_data.projects:
        parts.append(proj.title)
        parts.extend(proj.description)
    for edu in resume_data.education:
        parts.append(f"{edu.degree} {edu.institution}")
    return " ".join(parts)


def semantic_similarity(jd_text: str, resume_text: str) -> float:
    """Cosine similarity of bag-of-words term frequencies. Returns 0.0-1.0.

    EMBEDDING INTEGRATION POINT (future work — not changed in this task):
    This bag-of-words cosine is the sole "Semantic Match" signal fed into
    `compute_candidate_score` (weight 10). It only fires on exact shared tokens,
    so it saturates low (~0.1–0.25 even for strong matches) and cannot see that
    "RAG" and "retrieval-augmented generation" mean the same thing. To upgrade to
    embeddings, replace ONLY this function body with a provider call
    (`embed(jd_text)`·`embed(resume_text)` cosine) behind the existing 0.0–1.0
    contract — every caller and the weight stay unchanged. The provider stack
    already reserves NVIDIA Nemotron for embeddings (see V1 provider notes);
    wire it here, keep this bag-of-words path as the offline/degraded fallback.
    """
    a = Counter(_tokens(jd_text))
    b = Counter(_tokens(resume_text))
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    dot = sum(a[t] * b[t] for t in common)
    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return round(dot / (norm_a * norm_b), 4)


_YEARS_PHRASE_RE = re.compile(r"(\d{1,2})\s*\+?\s*years?", re.IGNORECASE)
_PRESENT_RE = re.compile(r"present|current|now|till date|to date|ongoing", re.IGNORECASE)
_INTERN_RE = re.compile(r"\bintern|internship\b", re.IGNORECASE)


def estimate_years_experience(resume_data: ResumeData) -> float:
    """
    Estimate total years of experience. Scans ALL experience text (role, duration
    and bullet descriptions) — not just the `duration` field, which the parser
    frequently leaves empty — for both explicit "N years" phrases and date ranges
    (with 'present' resolved to the current year). Takes the strongest signal.

    This is more robust than reading `duration` alone, which previously produced
    badly wrong values (e.g. a 5-year engineer estimated at 1).
    """
    # Preferred: the authoritative figure computed from raw résumé text at parse
    # time (union of dated periods). Only fall back to the structured heuristic
    # when it is unavailable (e.g. older stored analyses).
    precomputed = getattr(resume_data, "total_experience_years", None)
    if precomputed is not None:
        return float(precomputed)

    import datetime

    texts: list[str] = []
    for exp in resume_data.experience:
        texts.append(exp.duration or "")
        texts.append(getattr(exp, "role", "") or "")
        texts.append(getattr(exp, "company", "") or "")
        texts.extend(exp.description or [])
    blob = " ".join(texts)

    # 1) Date-range span across all experience entries.
    years = [int(m.group()) for m in _YEAR_RE.finditer(blob)]
    if _PRESENT_RE.search(blob) and years:
        years.append(datetime.datetime.utcnow().year)
    span = (max(years) - min(years)) if len(years) >= 2 else 0
    span = max(0, min(span, 45))

    # 2) Explicit "N years" phrases (e.g. "8 years building…").
    explicit = [int(m.group(1)) for m in _YEARS_PHRASE_RE.finditer(blob)]
    explicit = [y for y in explicit if 0 < y <= 45]
    best_explicit = max(explicit) if explicit else 0

    candidates = [v for v in (span, best_explicit) if v > 0]
    if candidates:
        return float(max(candidates))

    # 3) Fallback: internship-only history with no multi-year span reads as
    # entry-level (0); otherwise assume ~1 year per listed entry.
    if resume_data.experience and _INTERN_RE.search(blob) and span == 0 and best_explicit == 0:
        return 0.0
    return float(len(resume_data.experience))


def _ratio(numerator: int, denominator: int, fallback: float) -> float:
    return (numerator / denominator) if denominator > 0 else fallback


def compute_candidate_score(
    *,
    ats_score: int,
    ats_breakdown: ScoreBreakdown,
    matching_skills: list[str],
    missing_skills: list[str],
    relevant_projects: list[str],
    less_relevant_projects: list[str],
    semantic: float,
    weights: RankingWeights,
    resume_skills: list[str] | None = None,
    job_description: str = "",
) -> CandidateScore:
    """
    Produce an explainable weighted score. Each dimension is expressed as a
    ratio (0-1) of its potential, then scaled by its configured weight.
    """
    # Skills: proportion of JD-required skills the candidate has.
    skills_ratio = _ratio(len(matching_skills), len(matching_skills) + len(missing_skills), fallback=0.6)
    # Experience: from the ATS rule engine (max 20 pts there).
    experience_ratio = min(1.0, ats_breakdown.experience / 20)
    # Projects: JD-relevance proportion; fall back to ATS project score (max 25).
    total_projects = len(relevant_projects) + len(less_relevant_projects)
    projects_ratio = _ratio(len(relevant_projects), total_projects, fallback=min(1.0, ats_breakdown.projects / 25))
    # ATS structural quality.
    ats_ratio = min(1.0, ats_score / 100)
    # Education (max 10 pts in ATS engine).
    education_ratio = min(1.0, ats_breakdown.education / 10)
    # Semantic similarity is already 0-1.
    semantic_ratio = max(0.0, min(1.0, semantic))
    # Achievements from ATS "impact" (max 15 pts).
    achievements_ratio = min(1.0, ats_breakdown.impact / 15)

    dimensions = [
        ("Skills", "skills", skills_ratio, weights.skills),
        ("Experience", "experience", experience_ratio, weights.experience),
        ("Projects", "projects", projects_ratio, weights.projects),
        ("ATS Structure", "ats", ats_ratio, weights.ats),
        ("Education", "education", education_ratio, weights.education),
        ("Semantic Match", "semantic", semantic_ratio, weights.semantic),
        ("Achievements", "achievements", achievements_ratio, weights.achievements),
    ]

    components: list[ScoreComponent] = []
    total_earned = 0.0
    for name, key, ratio, weight in dimensions:
        earned = round(ratio * weight, 1)
        total_earned += earned
        components.append(ScoreComponent(name=name, key=key, earned=earned, max=round(weight, 1)))

    # ── Core-requirement gate ────────────────────────────────────────────────
    # Damp the whole score by how many of the role's SPECIALISED skills the
    # candidate actually has, so structural résumé points can no longer float a
    # candidate who lacks the core of the job.
    #
    # The DENOMINATOR comes from the JD alone (`jd_core_universe`) and is therefore
    # identical for every candidate on this role. The NUMERATOR is the
    # deterministic résumé ∩ universe, augmented by the LLM's matched skills.
    # `missing_skills` is deliberately NOT an input here any more: letting the
    # model's omissions define the requirement set is what made coverage
    # candidate-specific. It still feeds the Skills dimension and the UI above.
    core_coverage, n_matched, n_universe = _core_signals(
        resume_skills, jd_core_universe(job_description), matching_skills)

    core_factor = 1.0
    if core_coverage is not None:
        # Linear ramp: full credit at/above TARGET, floored below it.
        reach = min(1.0, core_coverage / CORE_COVERAGE_TARGET)
        core_factor = CORE_COVERAGE_FLOOR + (1.0 - CORE_COVERAGE_FLOOR) * reach
        core_factor = max(CORE_COVERAGE_FLOOR, min(1.0, core_factor))
        # Explainable line item: how many specialised requirements were met.
        # `max > 0` so the confidence panel also reads it as a real signal.
        components.append(ScoreComponent(
            name="Core Requirements", key="core_requirements",
            earned=float(n_matched), max=float(n_universe),
        ))

    gated = total_earned * core_factor
    overall = int(round(min(100.0, gated)))
    return CandidateScore(
        overall=overall,
        components=components,
        missing_skills=missing_skills,
        core_coverage=round(core_coverage, 4) if core_coverage is not None else None,
        core_factor=round(core_factor, 4),
    )
