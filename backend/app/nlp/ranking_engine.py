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


def estimate_years_experience(resume_data: ResumeData) -> float:
    """
    Rough estimate of total years of experience from the year tokens present
    in experience durations. Falls back to a per-entry heuristic.
    """
    years: list[int] = []
    for exp in resume_data.experience:
        years.extend(int(m.group()) for m in _YEAR_RE.finditer(exp.duration))
    if len(years) >= 2:
        span = max(years) - min(years)
        # Clamp to something sane (0-45 years).
        return float(max(0, min(span, 45)))
    # Fallback: assume ~1 year per listed experience entry.
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
