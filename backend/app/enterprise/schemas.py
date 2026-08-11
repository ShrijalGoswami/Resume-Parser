"""Pydantic schemas for the enterprise platform (orgs, members, audit, usage, …)."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.enterprise.rbac import Role


class Organization(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    slug: Optional[str] = None
    plan: str = "free"
    settings: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class Workspace(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    organization_id: str
    name: str
    description: str = ""
    created_at: Optional[str] = None


class OrgMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    organization_id: str
    user_id: str
    role: str = "recruiter"
    status: str = "active"
    invited_email: Optional[str] = None
    created_at: Optional[str] = None


class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    organization_id: str
    workspace_id: Optional[str] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    resource_type: str = ""
    resource_id: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None


class UsageCounter(BaseModel):
    model_config = ConfigDict(extra="ignore")
    metric: str
    period: str
    value: int = 0


class Subscription(BaseModel):
    """The organization's plan, as the client renders it.

    READ-ONLY, AND STILL NOT A BILLING MODEL. The three fields below were added
    so the checkout UI can tell "we are waiting for the gateway" apart from "you
    are on this plan", and so Settings can state a renewal date instead of
    implying one. They are projected straight from columns 0022 and 0027 already
    persist; nothing here imports `app.billing`, and the one-way dependency in
    BILLING_ARCHITECTURE §1.2 is intact.

    `status` remains the five-value vocabulary the entitlement resolver reads.
    `billing_state` is the eight-value enrichment 0027 added — an enrichment,
    never a contradiction — and is the only field that can distinguish
    `pending_activation` from `free`, which is exactly the distinction a
    customer watching a spinner after paying needs us to get right.

    Nothing provider-specific is exposed: no gateway subscription id, no
    customer id, no key. A plan, a state and a date are what the interface
    needs, and they are all it gets.
    """

    model_config = ConfigDict(extra="ignore")
    id: Optional[str] = None
    organization_id: str
    plan: str = "free"
    status: str = "active"
    limits: dict[str, Any] = Field(default_factory=dict)
    #: Eight-value billing state (0027). Null on rows written before it existed
    #: and on manually-set plans, so the client must treat absence as "unknown"
    #: rather than as any particular state.
    billing_state: Optional[str] = None
    #: End of the paid period — the renewal date, or the date access ends when
    #: `cancel_at_period_end` is set. Null for free and manual plans.
    current_period_end: Optional[datetime] = None
    #: Cancellation requested, access retained until `current_period_end`.
    cancel_at_period_end: bool = False
    #: A plan change queued for the end of the current period (migration 0029).
    #:
    #: A PROMISE, NOT AN ENTITLEMENT. `plan` above is what the organization has
    #: today and what the entitlement resolver reads; this is what it will have
    #: from `scheduled_plan_effective_at`. The client renders it so an upgrade
    #: that is already booked is not offered a second time — it must never be
    #: read as the current tier.
    scheduled_plan: Optional[str] = None
    scheduled_plan_effective_at: Optional[datetime] = None


class ApiKey(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    organization_id: str
    name: str
    prefix: str
    scope: str = "read_only"
    revoked: bool = False
    last_used_at: Optional[str] = None
    created_at: Optional[str] = None


# ── Request models ──────────────────────────────────────────────────────────
class OrgUpdateRequest(BaseModel):
    name: Optional[str] = None
    settings: Optional[dict[str, Any]] = None


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""


class MemberInviteRequest(BaseModel):
    email: str
    role: Role = Role.recruiter


class MemberRoleRequest(BaseModel):
    role: Role


class FeatureFlagRequest(BaseModel):
    flag: str
    enabled: bool


class SubscriptionUpdateRequest(BaseModel):
    plan: str


class ApiKeyCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    scope: str = "read_only"  # read_only | read_write | admin


class ApiKeyCreated(BaseModel):
    key: ApiKey
    secret: str  # shown ONCE — the full key is never stored


class PlanState(BaseModel):
    """The organization's commercial state, as the client needs to render it."""
    key: str = "free"
    label: str = "Free"
    status: str = "active"
    ruleset: str = "v1"
    #: Bumped on every plan change. A client holding a cached context can compare
    #: this against the value in a 402 body and know to refetch rather than
    #: showing a stale lock after an upgrade.
    version: int = 1


class OrgContextResponse(BaseModel):
    organization: Organization
    workspace_id: Optional[str] = None
    role: str
    plan: str
    permissions: list[str]
    features: dict[str, bool]
    # ── Monetization (Phase 1) ───────────────────────────────────────────────
    # Added to the context the client ALREADY fetches on every screen, rather
    # than as a new endpoint: gating that costs an extra request is gating that
    # arrives late, and a lock that appears after the control does is worse than
    # no lock. `entitlements` lists EVERY catalog feature — including the ones
    # this organization cannot use — because the UI has to render locked
    # features, not hide them.
    plan_state: PlanState = Field(default_factory=PlanState)
    entitlements: dict[str, dict] = Field(default_factory=dict)
    limits_usage: dict[str, dict] = Field(default_factory=dict)
