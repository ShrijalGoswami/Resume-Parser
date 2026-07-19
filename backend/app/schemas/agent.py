"""
Schemas for the Autonomous Recruiting Agent (V5 / Sprint 9).

The agent is an ORCHESTRATOR: it observes the pipeline, detects situations
deterministically (grounded in stored data), and produces explainable,
evidence-backed `Recommendation`s that require human approval. It never modifies
production data and never fabricates evidence.

Every recommendation is fully explainable — why it fired, the evidence, a
confidence score, the tools/engines it would use, the data sources, and the
recommended next action.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class ApprovalStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    dismissed = "dismissed"
    executed = "executed"       # future — automatic execution is not enabled this sprint


class RecommendationCategory(str, Enum):
    action = "action"                 # recommended action
    urgent = "urgent"                 # urgent alert
    campaign_risk = "campaign_risk"
    candidate_alert = "candidate_alert"


class Severity(str, Enum):
    urgent = "urgent"
    high = "high"
    medium = "medium"
    low = "low"


class Recommendation(BaseModel):
    """A single explainable, evidence-backed agent recommendation."""
    model_config = ConfigDict(extra="ignore")

    id: str = ""
    workflow: str = ""                        # which workflow produced it
    dedupe_key: str = ""                       # workflow + entity — idempotent scans
    category: str = RecommendationCategory.action.value
    severity: str = Severity.medium.value
    confidence: int = Field(default=0, ge=0, le=100)
    title: str = ""
    # ── Explainability (never omitted) ──────────────────────────────────────
    why: str = ""                              # why this was generated
    evidence: list[str] = Field(default_factory=list)
    data_sources: list[str] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    recommended_action: str = ""
    # Which existing engine/tool can act on this (future execution), + params.
    suggested_tool: str = ""
    tool_params: dict[str, Any] = Field(default_factory=dict)
    campaign_id: Optional[str] = None
    campaign_title: Optional[str] = None
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    status: str = ApprovalStatus.pending.value
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AgentBriefing(BaseModel):
    """An optional AI-prioritised narrative over the current recommendations."""
    headline: str = ""
    priorities: list[str] = Field(default_factory=list)
    summary: str = ""


class AgentScanRequest(BaseModel):
    workflows: Optional[list[str]] = None      # limit to specific workflows (default: all)


class AgentScanResponse(BaseModel):
    generated: int = 0                          # newly created this scan
    total_open: int = 0
    recommendations: list[Recommendation] = Field(default_factory=list)
    briefing: Optional[AgentBriefing] = None


class RecommendationUpdate(BaseModel):
    status: ApprovalStatus
