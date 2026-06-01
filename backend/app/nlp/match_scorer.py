"""
Deterministic match score calculator.

Computes a 0-100 job match score from Groq's qualitative analysis outputs.
The score formula is fully deterministic — given the same inputs, it always
produces the same output.

Scoring Rubric:
    Skill Match         : 40 pts  (matching / total required skills)
    Hiring Alignment    : 25 pts  (based on recommendation category)
    Project Relevance   : 15 pts  (relevant / total projects)
    Strengths Balance   : 20 pts  (strengths / total observations)
    ─────────────────────────────
    Total               : 100 pts

Match Categories:
    85-100 : Excellent Match
    70-84  : Strong Match
    50-69  : Moderate Match
    0-49   : Weak Match
"""

import logging

logger = logging.getLogger(__name__)

_RECOMMENDATION_SCORES: dict[str, int] = {
    "strongly recommend interview": 25,
    "recommend interview": 20,
    "consider for further review": 10,
    "not recommended": 0,
}


def _match_recommendation(raw: str) -> int:
    """Fuzzy-match the hiring recommendation string to a score value."""
    normalized = raw.lower().strip()

    # Exact prefix match first
    for key, score in _RECOMMENDATION_SCORES.items():
        if key in normalized or normalized in key:
            return score

    # Fallback: keyword matching
    if "strongly" in normalized:
        return 25
    if "recommend" in normalized and "not" not in normalized:
        return 20
    if "consider" in normalized or "review" in normalized:
        return 10
    if "not" in normalized:
        return 0

    return 5  # unknown recommendation — small default


def calculate_match_score(
    matching_skills: list[str],
    missing_skills: list[str],
    relevant_projects: list[str],
    less_relevant_projects: list[str],
    candidate_strengths: list[str],
    areas_for_improvement: list[str],
    hiring_recommendation: str,
) -> tuple[int, str]:
    """
    Compute a deterministic job match score from Groq's qualitative outputs.

    Args:
        matching_skills:        Skills found in both JD and resume.
        missing_skills:         Skills required by JD but absent from resume.
        relevant_projects:      Projects that support JD requirements.
        less_relevant_projects: Projects with limited JD relevance.
        candidate_strengths:    Recruiter-identified strengths.
        areas_for_improvement:  Identified gaps.
        hiring_recommendation:  One of the four recommendation categories.

    Returns:
        (score, category) — score is 0-100, category is a human label.
    """
    # ── Skill Match: 40 points ────────────────────────────────────────────
    total_skills = len(matching_skills) + len(missing_skills)
    if total_skills > 0:
        skill_score = round(len(matching_skills) / total_skills * 40)
    else:
        skill_score = 20  # neutral when no skills identified

    # ── Hiring Alignment: 25 points ───────────────────────────────────────
    rec_score = _match_recommendation(hiring_recommendation)

    # ── Project Relevance: 15 points ──────────────────────────────────────
    total_projects = len(relevant_projects) + len(less_relevant_projects)
    if total_projects > 0:
        project_score = round(len(relevant_projects) / total_projects * 15)
    else:
        project_score = 0  # no projects → no points

    # ── Strengths Balance: 20 points ──────────────────────────────────────
    total_observations = len(candidate_strengths) + len(areas_for_improvement)
    if total_observations > 0:
        strength_score = round(len(candidate_strengths) / total_observations * 20)
    else:
        strength_score = 10  # neutral

    total = min(100, skill_score + rec_score + project_score + strength_score)

    # ── Category ──────────────────────────────────────────────────────────
    if total >= 85:
        category = "Excellent Match"
    elif total >= 70:
        category = "Strong Match"
    elif total >= 50:
        category = "Moderate Match"
    else:
        category = "Weak Match"

    logger.info(
        f"Match Score | skills={skill_score}/40 rec={rec_score}/25 "
        f"projects={project_score}/15 strengths={strength_score}/20 "
        f"total={total} category={category}"
    )

    return total, category
