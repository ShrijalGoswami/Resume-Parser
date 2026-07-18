"""
Pydantic schemas for the recruiter batch analysis workflow.

A recruiter uploads one job description plus many resumes. Each resume is
scored with a configurable weighted rubric and ranked. The response also
carries aggregate analytics for the recruiter dashboard.
"""

from pydantic import BaseModel, Field

from app.schemas.resume import ResumeData
from app.schemas.analysis import ScoreBreakdown


class RankingWeights(BaseModel):
    """
    Configurable weights for the candidate ranking rubric. The values are the
    maximum points each dimension contributes; they should sum to 100.
    """
    skills: float = Field(default=30, ge=0, le=100)
    experience: float = Field(default=20, ge=0, le=100)
    projects: float = Field(default=15, ge=0, le=100)
    ats: float = Field(default=10, ge=0, le=100)
    education: float = Field(default=10, ge=0, le=100)
    semantic: float = Field(default=10, ge=0, le=100)
    achievements: float = Field(default=5, ge=0, le=100)

    @property
    def total(self) -> float:
        return (self.skills + self.experience + self.projects + self.ats
                + self.education + self.semantic + self.achievements)


class ScoreComponent(BaseModel):
    """One explainable line item of a candidate's overall score."""
    name: str = Field(description="Human label, e.g. 'Skills'")
    key: str = Field(description="Machine key, e.g. 'skills'")
    earned: float = Field(description="Points earned for this dimension")
    max: float = Field(description="Maximum points for this dimension")


class CandidateScore(BaseModel):
    """Explainable overall score for a single candidate."""
    overall: int = Field(default=0, ge=0, le=100, description="Weighted overall score 0-100")
    components: list[ScoreComponent] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list, description="JD skills absent from the resume")


class CandidateResult(BaseModel):
    """
    Complete per-candidate result. Successful candidates carry the full
    structured profile and AI insights; failed candidates carry an error.
    """
    candidate_id: str = Field(description="Stable id for this candidate within the batch")
    filename: str = Field(description="Original uploaded filename")
    status: str = Field(default="success", description="'success' or 'failed'")
    error: str | None = Field(default=None, description="Failure reason when status == 'failed'")

    # Ranking
    rank: int = Field(default=0, description="1-based rank among successful candidates")
    overall_score: int = Field(default=0, ge=0, le=100)
    score: CandidateScore | None = None

    # Identity
    name: str = ""
    email: str = ""
    phone: str = ""

    # Deterministic scoring
    ats_score: int = Field(default=0, ge=0, le=100)
    ats_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    semantic_similarity: float = Field(default=0.0, description="0-1 JD/resume text similarity")
    years_experience: float = Field(default=0.0, description="Estimated years of experience")

    # JD-aware qualitative (LLM)
    match_category: str = ""
    recommendation: str = ""
    recommendation_explanation: str = ""
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    top_skills: list[str] = Field(default_factory=list)
    relevant_projects: list[str] = Field(default_factory=list)
    experience_relevance: str = ""
    interview_questions: list[str] = Field(default_factory=list)

    # Full structured profile (powers the details view + PDF export)
    resume_data: ResumeData | None = None


class SkillCount(BaseModel):
    skill: str
    count: int


class BatchAnalytics(BaseModel):
    """Aggregate analytics for the recruiter dashboard."""
    total: int = 0
    succeeded: int = 0
    failed: int = 0
    average_score: float = 0.0
    average_years_experience: float = 0.0
    top_candidate_name: str = ""
    top_candidate_score: int = 0
    top_skills: list[SkillCount] = Field(default_factory=list)
    common_missing_skills: list[SkillCount] = Field(default_factory=list)
    score_distribution: dict[str, int] = Field(
        default_factory=lambda: {"Excellent Match": 0, "Strong Match": 0,
                                 "Moderate Match": 0, "Weak Match": 0}
    )
    recommendation_distribution: dict[str, int] = Field(default_factory=dict)


class BatchAnalysisResponse(BaseModel):
    """Top-level response for POST /api/v1/batch-analysis."""
    analysis_version: str = "v1.0"
    job_description: str = ""
    weights: RankingWeights = Field(default_factory=RankingWeights)
    candidates: list[CandidateResult] = Field(default_factory=list)
    analytics: BatchAnalytics = Field(default_factory=BatchAnalytics)
