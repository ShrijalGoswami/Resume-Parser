"""
Integration Hub routes (V6 / Sprint 11).

Providers, OAuth connections, automation rules, execution history + replay,
webhook endpoints, and connection health. Organization-scoped; management actions
require the INTEGRATION_MANAGE permission (policy-based RBAC). Provider secrets and
credentials are NEVER returned to the frontend.
"""

from __future__ import annotations

import secrets
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.enterprise.context import OrgContext
from app.enterprise.deps import OrgContextDep, require_permission
from app.enterprise.rbac import Permission
from app.enterprise.repositories import AuditRepository
from app.integrations import IntegrationEvent, provider_catalog
from app.integrations.repositories import IntegrationRepository
from app.integrations.schemas import (
    AutomationRuleCreate, AutomationRuleModel, AutomationRuleUpdate, ConnectRequest,
    ExecutionModel, IntegrationConnection, OAuthCallbackRequest, WebhookEndpointModel,
)
from app.services import integration_service as svc

router = APIRouter(prefix="/integrations", tags=["Integrations"])

ManageDep = Annotated[OrgContext, Depends(require_permission(Permission.INTEGRATION_MANAGE))]


def _audit(ctx: OrgContext, action: str, **kw) -> None:
    AuditRepository(ctx.organization_id).record(
        user_id=ctx.recruiter.id, user_email=ctx.recruiter.email, action=action,
        workspace_id=ctx.workspace_id, **kw,
    )


# ── Catalog / connections / events ──────────────────────────────────────────
@router.get("/providers")
async def providers(_: OrgContextDep):
    return provider_catalog()


@router.get("/events")
async def events(_: OrgContextDep):
    return [e.value for e in IntegrationEvent]


@router.get("/connections", response_model=list[IntegrationConnection])
async def connections(ctx: OrgContextDep):
    rows = await run_in_threadpool(IntegrationRepository(ctx.organization_id).list_connections)
    return [IntegrationConnection(**r) for r in rows]


@router.get("/health")
async def health(ctx: OrgContextDep):
    rows = await run_in_threadpool(IntegrationRepository(ctx.organization_id).list_connections)
    return [{"provider": r["provider"], "status": r.get("status"), "health": r.get("health"),
             "last_sync_at": r.get("last_sync_at")} for r in rows]


# ── Provider lifecycle ───────────────────────────────────────────────────────
@router.post("/{provider}/connect")
async def connect(provider: str, payload: ConnectRequest, ctx: ManageDep):
    try:
        result = await run_in_threadpool(svc.start_connect, ctx.organization_id, provider, payload.redirect_uri)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    _audit(ctx, "integration.connect_started", resource_type="integration", resource_id=provider)
    return result


@router.post("/oauth/callback")
async def oauth_callback(payload: OAuthCallbackRequest, ctx: ManageDep):
    result = await run_in_threadpool(
        svc.oauth_callback, ctx.organization_id, payload.provider, payload.code, payload.redirect_uri, ctx.recruiter.id)
    _audit(ctx, "integration.connected", resource_type="integration", resource_id=payload.provider)
    return result


@router.post("/{provider}/disconnect", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect(provider: str, ctx: ManageDep):
    await run_in_threadpool(svc.disconnect, ctx.organization_id, provider)
    _audit(ctx, "integration.disconnected", resource_type="integration", resource_id=provider)


@router.post("/{provider}/test")
async def test(provider: str, ctx: OrgContextDep):
    return await run_in_threadpool(svc.test_connection, ctx.organization_id, provider)


# ── Automation rules ─────────────────────────────────────────────────────────
@router.get("/rules", response_model=list[AutomationRuleModel])
async def list_rules(ctx: OrgContextDep):
    rows = await run_in_threadpool(IntegrationRepository(ctx.organization_id).list_rules)
    return [AutomationRuleModel(**r) for r in rows]


@router.post("/rules", response_model=AutomationRuleModel, status_code=status.HTTP_201_CREATED)
async def create_rule(payload: AutomationRuleCreate, ctx: ManageDep):
    row = await run_in_threadpool(
        IntegrationRepository(ctx.organization_id).create_rule,
        name=payload.name, trigger_event=payload.trigger_event,
        steps=[s.model_dump() for s in payload.steps], enabled=payload.enabled, created_by=ctx.recruiter.id)
    _audit(ctx, "automation_rule.created", resource_type="automation_rule", resource_id=row["id"],
           metadata={"name": payload.name, "event": payload.trigger_event})
    return AutomationRuleModel(**row)


@router.patch("/rules/{rule_id}", response_model=AutomationRuleModel)
async def update_rule(rule_id: str, payload: AutomationRuleUpdate, ctx: ManageDep):
    patch = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "steps" in patch:
        patch["steps"] = [s if isinstance(s, dict) else s.model_dump() for s in patch["steps"]]
    row = await run_in_threadpool(IntegrationRepository(ctx.organization_id).update_rule, rule_id, patch)
    _audit(ctx, "automation_rule.updated", resource_type="automation_rule", resource_id=rule_id)
    return AutomationRuleModel(**row)


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(rule_id: str, ctx: ManageDep):
    await run_in_threadpool(IntegrationRepository(ctx.organization_id).delete_rule, rule_id)
    _audit(ctx, "automation_rule.deleted", resource_type="automation_rule", resource_id=rule_id)


# ── Executions ───────────────────────────────────────────────────────────────
@router.get("/executions", response_model=list[ExecutionModel])
async def executions(ctx: OrgContextDep, status_filter: Optional[str] = None):
    rows = await run_in_threadpool(IntegrationRepository(ctx.organization_id).list_executions, status=status_filter)
    return [ExecutionModel(**r) for r in rows]


@router.post("/executions/{execution_id}/replay")
async def replay(execution_id: str, ctx: ManageDep):
    rec = await run_in_threadpool(svc.replay_execution, ctx.organization_id, execution_id)
    if rec is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Execution or its rule not found.")
    _audit(ctx, "integration.execution_replayed", resource_type="execution", resource_id=execution_id)
    return {"status": rec.status, "steps": [s.__dict__ for s in rec.steps]}


# ── Manual event emission (testing / API Events) ─────────────────────────────
@router.post("/emit/{event}")
async def emit(event: str, ctx: ManageDep):
    try:
        evt = IntegrationEvent(event)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown event '{event}'.")
    records = await run_in_threadpool(svc.emit_event, ctx.organization_id, evt, {"source": "manual"})
    return {"triggered_rules": len(records), "results": [{"rule": r.rule_name, "status": r.status} for r in records]}


# ── Webhooks ─────────────────────────────────────────────────────────────────
@router.get("/webhooks", response_model=list[WebhookEndpointModel])
async def list_webhooks(ctx: OrgContextDep):
    rows = await run_in_threadpool(IntegrationRepository(ctx.organization_id).list_webhooks)
    return [WebhookEndpointModel(**r) for r in rows]


@router.post("/webhooks", status_code=status.HTTP_201_CREATED)
async def create_webhook(ctx: ManageDep):
    secret = "whsec_" + secrets.token_urlsafe(24)
    row = await run_in_threadpool(IntegrationRepository(ctx.organization_id).create_webhook, "webhook", secret)
    _audit(ctx, "webhook.created", resource_type="webhook", resource_id=row["id"])
    # Secret shown once (like an API key).
    return {"id": row["id"], "secret": secret}
