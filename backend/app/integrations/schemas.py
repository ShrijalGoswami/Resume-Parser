"""Pydantic schemas for the integration platform (API boundary)."""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class IntegrationConnection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    organization_id: str
    provider: str
    status: str = "disconnected"
    scopes: list[str] = Field(default_factory=list)
    health: str = "unknown"
    last_sync_at: Optional[str] = None
    created_at: Optional[str] = None
    # credentials_encrypted is intentionally NEVER exposed to the API.


class WorkflowStepModel(BaseModel):
    action: str
    provider: str
    params: dict[str, Any] = Field(default_factory=dict)


class AutomationRuleModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    organization_id: str
    name: str
    trigger_event: str
    steps: list[WorkflowStepModel] = Field(default_factory=list)
    enabled: bool = True
    created_at: Optional[str] = None


class ExecutionModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    rule_id: Optional[str] = None
    rule_name: str = ""
    event: str
    status: str
    steps: list[dict[str, Any]] = Field(default_factory=list)
    latency_ms: int = 0
    error: Optional[str] = None
    created_at: Optional[str] = None


class WebhookEndpointModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    provider: str = "webhook"
    enabled: bool = True
    created_at: Optional[str] = None


# ── Requests ────────────────────────────────────────────────────────────────
class AutomationRuleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    trigger_event: str
    steps: list[WorkflowStepModel] = Field(default_factory=list)
    enabled: bool = True


class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    trigger_event: Optional[str] = None
    steps: Optional[list[WorkflowStepModel]] = None
    enabled: Optional[bool] = None


class ConnectRequest(BaseModel):
    redirect_uri: str


class ConnectResponse(BaseModel):
    authorize_url: str
    state: str


class OAuthCallbackRequest(BaseModel):
    provider: str
    code: str
    redirect_uri: str
