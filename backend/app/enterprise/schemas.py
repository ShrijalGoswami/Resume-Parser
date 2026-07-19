"""Pydantic schemas for the enterprise platform (orgs, members, audit, usage, …)."""

from __future__ import annotations

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
    model_config = ConfigDict(extra="ignore")
    id: Optional[str] = None
    organization_id: str
    plan: str = "free"
    status: str = "active"
    limits: dict[str, Any] = Field(default_factory=dict)


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


class OrgContextResponse(BaseModel):
    organization: Organization
    workspace_id: Optional[str] = None
    role: str
    plan: str
    permissions: list[str]
    features: dict[str, bool]
