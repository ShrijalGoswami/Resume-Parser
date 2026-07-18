"""Schemas for the AI Recruiter Copilot chat endpoint."""

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.batch import CandidateResult


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class CopilotRequest(BaseModel):
    """A single grounded question about one candidate."""
    candidate: CandidateResult
    job_description: str = ""
    history: list[ChatMessage] = Field(default_factory=list, description="Recent prior turns")
    message: str = Field(description="The recruiter's new question")


class CopilotEvidence(BaseModel):
    """A grounded reference supporting the answer."""
    category: str = Field(description="skill | project | experience | education | ats | ranking | recommendation | jd")
    detail: str = Field(description="The specific evidence drawn from the candidate context")


class CopilotResponse(BaseModel):
    """Explainable, grounded copilot answer."""
    answer: str = Field(description="Recruiter-facing answer in markdown")
    confidence: int = Field(default=0, ge=0, le=100, description="How well-grounded the answer is in available data")
    evidence: list[CopilotEvidence] = Field(default_factory=list)
    reasoning_summary: str = Field(default="", description="One or two sentences on how the answer was derived")
    followups: list[str] = Field(default_factory=list, description="Suggested follow-up questions")
    degraded: bool = Field(default=False, description="True if returned via graceful fallback (LLM unavailable)")


class SuggestionGroup(BaseModel):
    category: str
    questions: list[str]


class SuggestionsResponse(BaseModel):
    groups: list[SuggestionGroup]
