"""Event model for integration/workflow automation."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class IntegrationEvent(str, Enum):
    candidate_uploaded = "candidate_uploaded"
    candidate_shortlisted = "candidate_shortlisted"
    interview_scheduled = "interview_scheduled"
    interview_completed = "interview_completed"
    candidate_rejected = "candidate_rejected"
    candidate_hired = "candidate_hired"
    campaign_created = "campaign_created"
    agent_recommendation_approved = "agent_recommendation_approved"


@dataclass
class Event:
    type: IntegrationEvent
    organization_id: str
    payload: dict = field(default_factory=dict)
    #: For idempotent handling (webhooks / at-least-once delivery).
    idempotency_key: Optional[str] = None
