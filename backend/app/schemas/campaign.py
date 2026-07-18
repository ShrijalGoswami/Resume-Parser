"""
Pydantic schemas for the persistence layer (campaigns, candidates, notes,
conversations, activity). These mirror the Supabase tables in migration 0001
and provide strong typing at the API boundary.

The heavy AI output shapes (CandidateResult, CopilotResponse) are NOT redefined
here — they already live in schemas.batch / schemas.copilot and are stored
verbatim as jsonb. This module only models the persistence metadata around them.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.batch import RankingWeights


class CampaignStatus(str, Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    archived = "archived"


class PipelineStage(str, Enum):
    sourced = "sourced"
    screening = "screening"
    shortlisted = "shortlisted"
    interview = "interview"
    offer = "offer"
    hired = "hired"
    rejected = "rejected"


# ── Campaigns ────────────────────────────────────────────────────────────────
class CampaignCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    company: Optional[str] = Field(default=None, max_length=200)
    role_title: Optional[str] = Field(default=None, max_length=200)
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    job_description: str = ""
    ranking_weights: Optional[RankingWeights] = None
    status: CampaignStatus = CampaignStatus.draft


class CampaignUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    company: Optional[str] = None
    role_title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    job_description: Optional[str] = None
    ranking_weights: Optional[RankingWeights] = None
    status: Optional[CampaignStatus] = None


class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    recruiter_id: str
    title: str
    company: Optional[str] = None  # stored in metadata.company (no dedicated column)
    role_title: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    job_description: str = ""
    jd_storage_path: Optional[str] = None
    ranking_weights: dict[str, Any] = Field(default_factory=dict)
    status: CampaignStatus = CampaignStatus.draft
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Aggregates hydrated on demand (not columns).
    candidate_count: Optional[int] = None
    total_candidates: Optional[int] = None
    awaiting_analysis: Optional[int] = None
    average_match_score: Optional[float] = None
    last_activity_at: Optional[datetime] = None


# ── Candidates ───────────────────────────────────────────────────────────────
class Candidate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    campaign_id: str
    recruiter_id: str
    full_name: str = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    resume_path: Optional[str] = None
    resume_filename: Optional[str] = None
    source_batch_id: Optional[str] = None
    stage: PipelineStage = PipelineStage.sourced
    is_favorite: bool = False
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Latest analysis, hydrated on demand.
    latest_analysis: Optional[dict[str, Any]] = None


class CandidateStageUpdate(BaseModel):
    stage: PipelineStage


# ── Notes ────────────────────────────────────────────────────────────────────
class NoteCreate(BaseModel):
    body: str = Field(..., min_length=1)
    pinned: bool = False


class RecruiterNote(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    candidate_id: str
    campaign_id: str
    recruiter_id: str
    body: str
    pinned: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ── Copilot conversations ────────────────────────────────────────────────────
class ConversationCreate(BaseModel):
    candidate_id: str
    title: str = "New conversation"


class CopilotConversation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    candidate_id: str
    campaign_id: str
    recruiter_id: str
    title: str = "New conversation"
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CopilotMessageRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    conversation_id: str
    recruiter_id: str
    role: str
    content: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None


# ── Persistence request wrappers ─────────────────────────────────────────────
class PersistBatchRequest(BaseModel):
    """Attach a completed batch analysis to a campaign for storage."""

    campaign_id: str


class BulkCandidateIds(BaseModel):
    """Payload for bulk candidate actions (delete, etc.)."""

    candidate_ids: list[str] = Field(default_factory=list)


class ActivityEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    recruiter_id: str
    campaign_id: Optional[str] = None
    candidate_id: Optional[str] = None
    type: str
    summary: str = ""
    payload: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
