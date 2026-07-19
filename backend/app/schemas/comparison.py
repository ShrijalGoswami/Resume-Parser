"""
Schemas for AI Candidate Comparison (V5 / Sprint 5).

The comparison engine synthesises stored candidate data (resume, analysis, ATS,
match, notes) + the job description into an executive hiring report. The model
fills `ComparisonLLMOutput`; the server wraps it into `CandidateComparisonReport`
with the compared roster and the authoritative `sources_used` (attribution is
never fabricated by the model).
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.copilot import CopilotSource


class ComparisonRequest(BaseModel):
    """A recruiter's request to compare 2–5 candidates in one campaign."""
    candidate_ids: list[str] = Field(min_length=2, max_length=5)


class ExecutiveSummary(BaseModel):
    overall_recommendation: str = ""
    hiring_confidence: int = Field(default=0, ge=0, le=100)
    best_candidate_id: str = ""
    best_candidate_name: str = ""
    runner_up_id: str = ""
    runner_up_name: str = ""
    comparison_confidence: int = Field(default=0, ge=0, le=100)
    summary: str = ""


class RankingRow(BaseModel):
    candidate_id: str = ""
    name: str = ""
    rank: int = 0
    overall_score: float = 0
    ai_match: float = 0
    ats_score: float = 0
    experience_summary: str = ""
    strength_summary: str = ""
    weakness_summary: str = ""


class SkillMatrixRow(BaseModel):
    candidate_id: str = ""
    name: str = ""
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    unique_skills: list[str] = Field(default_factory=list)
    transferable_skills: list[str] = Field(default_factory=list)


class StrengthProfile(BaseModel):
    candidate_id: str = ""
    name: str = ""
    technical_strengths: list[str] = Field(default_factory=list)
    domain_strengths: list[str] = Field(default_factory=list)
    communication_indicators: list[str] = Field(default_factory=list)
    leadership_indicators: list[str] = Field(default_factory=list)


class RiskItem(BaseModel):
    category: str = ""
    detail: str = ""


class RiskProfile(BaseModel):
    candidate_id: str = ""
    name: str = ""
    risks: list[RiskItem] = Field(default_factory=list)


class HiringVerdict(BaseModel):
    candidate_id: str = ""
    name: str = ""
    recommendation: str = ""  # Strong Hire | Hire | Maybe | Reject
    rationale: str = ""


class InterviewFocus(BaseModel):
    candidate_id: str = ""
    name: str = ""
    technical_topics: list[str] = Field(default_factory=list)
    behavioral_topics: list[str] = Field(default_factory=list)
    weak_areas_to_verify: list[str] = Field(default_factory=list)
    suggested_questions: list[str] = Field(default_factory=list)


class TradeoffScenario(BaseModel):
    scenario: str = ""  # e.g. "If this role prioritizes system architecture"
    choose_candidate_id: str = ""
    choose_name: str = ""
    reasoning: str = ""


class ComparisonLLMOutput(BaseModel):
    """The structured object the orchestrated LLM returns for a comparison."""
    executive_summary: ExecutiveSummary = Field(default_factory=ExecutiveSummary)
    rankings: list[RankingRow] = Field(default_factory=list)
    skill_matrix: list[SkillMatrixRow] = Field(default_factory=list)
    strengths: list[StrengthProfile] = Field(default_factory=list)
    risks: list[RiskProfile] = Field(default_factory=list)
    hiring_recommendations: list[HiringVerdict] = Field(default_factory=list)
    interview_focus: list[InterviewFocus] = Field(default_factory=list)
    tradeoffs: list[TradeoffScenario] = Field(default_factory=list)


class ComparedCandidate(BaseModel):
    candidate_id: str
    name: str


class CandidateComparisonReport(ComparisonLLMOutput):
    """The full comparison report returned to the frontend / Copilot."""
    campaign_id: str = ""
    candidates: list[ComparedCandidate] = Field(default_factory=list)
    sources_used: list[CopilotSource] = Field(default_factory=list)
    degraded: bool = False
