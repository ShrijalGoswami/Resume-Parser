"""
Structured AI response contracts.

The product prefers predictable JSON over free-form text. These Pydantic models
are the typed contracts the orchestrator validates against. The **active**
capabilities reuse the existing schemas (single source of truth):

    * Resume analysis  → app.schemas.analysis.GroqExplanation
    * Job matching     → app.schemas.match_analysis.GroqMatchAnalysis
    * Batch candidate  → app.llm.batch_analyzer.GroqBatchAnalysis

The models below are **forward-looking contracts** for capabilities that are
intentionally NOT built in this sprint (interview generation, candidate
comparison, hiring recommendation, resume summarization). They define the shape
those features will return so the frontend can rely on predictable objects.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class InterviewQuestion(BaseModel):
    question: str
    category: str = ""
    rationale: str = ""


class InterviewPackResponse(BaseModel):
    """Contract for Capability.INTERVIEW_GENERATION (not built yet)."""

    title: str = "Interview Pack"
    questions: list[InterviewQuestion] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)


class CandidateSummaryResponse(BaseModel):
    """Contract for Capability.RESUME_SUMMARIZATION (not built yet)."""

    summary: str = ""
    highlights: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)


class ComparisonRow(BaseModel):
    candidate_id: str
    verdict: str = ""
    rationale: str = ""


class CandidateComparisonResponse(BaseModel):
    """Contract for Capability.CANDIDATE_COMPARISON (not built yet)."""

    winner_candidate_id: str = ""
    ranking: list[ComparisonRow] = Field(default_factory=list)
    summary: str = ""


class HiringRecommendationResponse(BaseModel):
    """Contract for a structured hiring recommendation (not built yet)."""

    recommendation: str = ""  # e.g. Strong Hire / Hire / Maybe / Reject
    confidence: int = 0  # 0–100
    rationale: str = ""
    risks: list[str] = Field(default_factory=list)
