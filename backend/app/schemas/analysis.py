from pydantic import BaseModel, Field


class ScoreBreakdown(BaseModel):
    """
    Deterministic ATS score breakdown by category.
    All values are computed by the rule engine, not the LLM.
    """
    technical_skills: int = Field(default=0, ge=0, le=30, description="Score for technical skills (max 30)")
    projects: int = Field(default=0, ge=0, le=25, description="Score for projects (max 25)")
    experience: int = Field(default=0, ge=0, le=20, description="Score for experience (max 20)")
    education: int = Field(default=0, ge=0, le=10, description="Score for education (max 10)")
    impact: int = Field(default=0, ge=0, le=15, description="Score for measurable impact (max 15)")


class GroqExplanation(BaseModel):
    """
    Internal schema to validate only the textual fields returned by Groq.
    Scores are intentionally excluded so the LLM cannot override them.
    """
    candidate_summary: str = Field(description="2-3 sentence recruiter-grade candidate summary")
    strengths: list[str] = Field(description="Top candidate strengths (3-5 items)")
    areas_for_improvement: list[str] = Field(description="Specific actionable gaps (2-4 items)")
    career_recommendations: list[str] = Field(description="Actionable next-step career advice (2-4 items)")
    interview_readiness: str = Field(description="Assessment of interview preparedness")
    recommended_roles: list[str] = Field(description="Suitable job titles (3-5 items)")


class AnalysisResponse(BaseModel):
    """
    Final resume analysis response combining deterministic ATS scoring
    with Groq-generated recruiter intelligence.
    """
    analysis_version: str = Field(default="v1.0", description="Version of the analysis engine")
    confidence_score: int = Field(default=0, ge=0, le=100, description="Parsing completeness score (0-100)")
    ats_score: int = Field(default=0, ge=0, le=100, description="Overall ATS compatibility score (rule-based)")
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)

    # Groq-generated explanation fields
    candidate_summary: str = Field(default="", description="Recruiter-grade candidate summary")
    strengths: list[str] = Field(default_factory=list, description="Top candidate strengths")
    areas_for_improvement: list[str] = Field(default_factory=list, description="Areas to improve")
    career_recommendations: list[str] = Field(default_factory=list, description="Actionable career advice")
    interview_readiness: str = Field(default="", description="Interview preparedness assessment")
    recommended_roles: list[str] = Field(default_factory=list, description="Recommended job roles")
