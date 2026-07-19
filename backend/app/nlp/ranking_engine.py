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
    """Cosine similarity of bag-of-words term frequencies. Returns 0.0-1.0."""
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

    overall = int(round(min(100.0, total_earned)))
    return CandidateScore(overall=overall, components=components, missing_skills=missing_skills)
