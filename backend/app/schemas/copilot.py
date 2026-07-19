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
    job_description: str = Field(default="", max_length=20000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=50, description="Recent prior turns")
    message: str = Field(max_length=4000, description="The recruiter's new question")


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


# ── V5 Recruiter Copilot (persisted, context-aware) ─────────────────────────

class CopilotLLMOutput(BaseModel):
    """
    The structured object the orchestrated LLM must return for the Recruiter
    Copilot. The model fills only the analytical sections — the authoritative
    "sources used" list is attached server-side by the context resolver so it
    can never be fabricated.
    """
    answer: str = Field(description="Primary recruiter-facing answer in markdown")
    summary: str = Field(default="", description="Short executive summary")
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    confidence: int = Field(default=0, ge=0, le=100)
    reasoning_summary: str = Field(default="")
    followups: list[str] = Field(default_factory=list)


class CopilotSource(BaseModel):
    """A context source the answer was grounded in (attributed by the server)."""
    source: str = Field(description="e.g. Current Campaign, Selected Candidate, Resume, Job Description, Recruiter Notes, Conversation History, Campaign Analytics")
    detail: str = Field(default="", description="What was drawn from this source")


class CopilotStructuredResponse(BaseModel):
    """The full, predictable Copilot response returned to the frontend."""
    answer: str = ""
    summary: str = ""
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    confidence: int = Field(default=0, ge=0, le=100)
    reasoning_summary: str = ""
    followups: list[str] = Field(default_factory=list)
    sources_used: list[CopilotSource] = Field(default_factory=list)
    degraded: bool = Field(default=False)


class CopilotPageContext(BaseModel):
    """Auto-detected page context the frontend sends with each Copilot message."""
    type: Literal["dashboard", "campaign", "candidate", "analytics", "global"] = "global"
    campaign_id: str | None = None
    candidate_id: str | None = None


class ConversationMessagePublic(BaseModel):
    """A persisted conversation message returned to the frontend."""
    id: str
    role: str
    content: str
    created_at: str | None = None
    structured: CopilotStructuredResponse | None = None


class PostMessageRequest(BaseModel):
    """A recruiter turn posted to a persisted conversation."""
    message: str = Field(description="The recruiter's new question")
    context: CopilotPageContext = Field(default_factory=CopilotPageContext)


class PostMessageResponse(BaseModel):
    """The persisted assistant turn plus its structured payload."""
    conversation_id: str
    user_message: ConversationMessagePublic
    assistant_message: ConversationMessagePublic
    response: CopilotStructuredResponse


class ConversationRenameRequest(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ConversationCreateRequest(BaseModel):
    title: str = Field(default="New conversation", max_length=200)
    context: CopilotPageContext = Field(default_factory=CopilotPageContext)


class SuggestionGroup(BaseModel):
    category: str
    questions: list[str]


class SuggestionsResponse(BaseModel):
    groups: list[SuggestionGroup]
