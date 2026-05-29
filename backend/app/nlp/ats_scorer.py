"""
Deterministic rule-based ATS scoring engine.

Scoring Rubric:
    Technical Skills : 30 pts
    Projects         : 25 pts
    Experience       : 20 pts
    Education        : 10 pts
    Impact           : 15 pts
    ─────────────────────────
    Total            : 100 pts

Calibration target:
    Weak      : 40-60
    Average   : 60-75
    Good      : 75-85
    Strong    : 85-95
    Exceptional: 95-100
"""

import re
import logging
from app.schemas.resume import ResumeData
from app.schemas.analysis import ScoreBreakdown

logger = logging.getLogger(__name__)

# Regex that matches an isolated percentage or number-based metric
# e.g. "89.13%", "0.94 AUC", "2x", "$10k", "100+"
_IMPACT_PATTERN = re.compile(
    r"""
    (?:
        \d+(?:\.\d+)?%          # percentage  e.g. 89.13%
        | \d+(?:\.\d+)?\s*[xX]  # multiplier  e.g. 2x
        | \$\d+                  # currency    e.g. $10k
        | \d+\s*\+               # "100+" style
        | \b0\.\d+\b             # decimal metric e.g. 0.94 AUC
    )
    """,
    re.VERBOSE,
)


# ─── individual category scorers ──────────────────────────────────────────────

def _score_technical_skills(skills: list[str]) -> int:
    """
    Returns a score 0-30 based on number of normalized skills present.

    Breakpoints (calibrated):
        0        →  0
        1–4      → 10
        5–8      → 16
        9–12     → 22
        13–16    → 27
        17+      → 30
    """
    n = len(skills)
    if n == 0:
        return 0
    elif n <= 4:
        return 10
    elif n <= 8:
        return 16
    elif n <= 12:
        return 22
    elif n <= 16:
        return 27
    else:
        return 30


def _score_projects(projects) -> int:
    """
    Returns a score 0-25 based on project count and description quality.

    Breakpoints:
        0 projects                        →  0
        1 project, no bullets             →  5
        1 project, with bullets           → 10
        2 projects (basic)                → 18
        2 projects, both detailed (3+ bullets each) → 20
        2+ projects, any with metrics/outcomes       → 25
    """
    if not projects:
        return 0

    def _has_metric(desc_list: list[str]) -> bool:
        return any(_IMPACT_PATTERN.search(line) for line in desc_list)

    if len(projects) == 1:
        p = projects[0]
        return 10 if len(p.description) >= 1 else 5

    # 2+ projects
    both_detailed = all(len(p.description) >= 3 for p in projects[:2])
    any_metric = any(_has_metric(p.description) for p in projects)

    if any_metric:
        return 25
    elif both_detailed:
        return 20
    else:
        return 18


def _score_experience(experience) -> int:
    """
    Returns a score 0-20 based on experience entries and description richness.

    Breakpoints:
        0 entries                              →  0
        1 entry, < 2 bullets                   → 12
        1 entry, 2+ bullets                    → 16
        2+ entries                             → 20
    """
    if not experience:
        return 0

    if len(experience) >= 2:
        return 20

    # exactly 1 entry
    bullets = experience[0].description
    return 16 if len(bullets) >= 2 else 12


def _score_education(education) -> int:
    """
    Returns a score 0-10.

    Breakpoints:
        0 entries                                         →  0
        1 entry, no GPA                                   →  6
        1 entry, GPA present                              →  8
        1 entry, CGPA ≥ 7.5 (or GPA ≥ 3.3) + any degree → 10
        2+ entries                                        → 10
    """
    if not education:
        return 0

    if len(education) >= 2:
        return 10

    edu = education[0]
    gpa_str = edu.gpa.strip()

    if not gpa_str:
        return 6

    # Try to extract numeric GPA value
    gpa_match = re.search(r"(\d+(?:\.\d+)?)", gpa_str)
    if not gpa_match:
        return 8  # GPA text present but unparseable

    gpa_val = float(gpa_match.group(1))

    # Detect scale: CGPA/4-scale vs 10-scale
    is_ten_scale = "cgpa" in gpa_str.lower() or gpa_val > 5.0
    threshold = 7.5 if is_ten_scale else 3.3

    return 10 if gpa_val >= threshold else 8


def _score_impact(experience, projects) -> int:
    """
    Returns a score 0-15 based on quantified achievements across
    all project and experience descriptions.

    Breakpoints:
        No projects AND no experience           →  0
        Projects/experience present, no metrics →  5
        1 metric found                          →  9
        2-3 metrics found                       → 12
        4+ metrics found                        → 15
    """
    has_content = bool(experience or projects)
    if not has_content:
        return 0

    all_bullets: list[str] = []
    for exp in experience:
        all_bullets.extend(exp.description)
    for proj in projects:
        all_bullets.extend(proj.description)

    matches = sum(len(_IMPACT_PATTERN.findall(line)) for line in all_bullets)

    if matches == 0:
        return 5
    elif matches == 1:
        return 9
    elif matches <= 3:
        return 12
    else:
        return 15


# ─── confidence score ─────────────────────────────────────────────────────────

def _calculate_confidence(resume_data: ResumeData) -> int:
    """
    Returns 0-100 representing parsing completeness.
    Starts at 100 and applies penalties for missing critical fields.
    """
    score = 100
    if not resume_data.name or len(resume_data.name.split()) < 2:
        score -= 30
    if not resume_data.email:
        score -= 20
    if not resume_data.phone:
        score -= 15
    if not resume_data.skills:
        score -= 15
    if not resume_data.education:
        score -= 10
    if not resume_data.experience:
        score -= 10
    return max(0, score)


# ─── public interface ─────────────────────────────────────────────────────────

def calculate_ats_score(resume_data: ResumeData) -> tuple[int, ScoreBreakdown, int]:
    """
    Runs the full rule-based ATS scoring pipeline.

    Returns:
        ats_score       : int   – overall score (sum of breakdown, 0-100)
        score_breakdown : ScoreBreakdown
        confidence_score: int   – parsing completeness (0-100)
    """
    ts = _score_technical_skills(resume_data.skills)
    pr = _score_projects(resume_data.projects)
    ex = _score_experience(resume_data.experience)
    ed = _score_education(resume_data.education)
    im = _score_impact(resume_data.experience, resume_data.projects)

    breakdown = ScoreBreakdown(
        technical_skills=ts,
        projects=pr,
        experience=ex,
        education=ed,
        impact=im,
    )
    ats_score = ts + pr + ex + ed + im
    confidence = _calculate_confidence(resume_data)

    logger.info(
        f"ATS Rule Engine | skills={ts} projects={pr} "
        f"experience={ex} education={ed} impact={im} "
        f"total={ats_score} confidence={confidence}"
    )
    return ats_score, breakdown, confidence
