"""
Organization administration routes (V6 / Sprint 10).

The Admin Console surface: organization settings, workspaces, members & roles,
feature flags, usage, audit logs, subscription, and API keys. Every mutating
endpoint is guarded by a `Permission` (policy-based RBAC — no hardcoded role
checks in handlers) and writes an immutable audit record. All access is
organization-scoped (membership RLS + explicit org_id filtering).
"""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, status

from app.core.deps import RecruiterDep
from app.enterprise.context import OrgContext
from app.enterprise.deps import (
    ApiKeyRepoDep, AuditRepoDep, OrgContextDep, OrgRepoDep, UsageRepoDep, require_permission,
)
from app.enterprise.feature_flags import FEATURES
from app.enterprise.rbac import Permission, role_permission_matrix
from app.enterprise.repositories import AuditRepository
from app.enterprise.catalog import PLAN_LABELS
from app.enterprise.schemas import (
    ApiKeyCreateRequest, ApiKeyCreated, FeatureFlagRequest, MemberInviteRequest, MemberRoleRequest,
    OrgContextResponse, OrgUpdateRequest, Organization, PlanState, Subscription,
    WorkspaceCreateRequest,
)
from app.db.supabase_client import get_user_client
from pydantic import BaseModel

router = APIRouter(prefix="/org", tags=["Organization"])


class SwitchWorkspaceRequest(BaseModel):
    workspace_id: str


def _audit(ctx: OrgContext, action: str, **kw) -> None:
    AuditRepository(ctx.organization_id).record(
        user_id=ctx.recruiter.id, user_email=ctx.recruiter.email, action=action,
        workspace_id=ctx.workspace_id, **kw,
    )


# ── Context (current org, role, plan, permissions, features) ─────────────────
@router.get("/context", response_model=OrgContextResponse)
async def get_context(ctx: OrgContextDep, org_repo: OrgRepoDep):
    svc = ctx.plan_service()
    return OrgContextResponse(
        organization=org_repo.get(), workspace_id=ctx.workspace_id, role=ctx.role,
        plan=ctx.plan, permissions=ctx.permissions(), features=ctx.features(),
        plan_state=PlanState(
            key=svc.plan.value, label=PLAN_LABELS[svc.plan], status=ctx.plan_status,
            ruleset=ctx.plan_ruleset, version=ctx.plan_version,
        ),
        entitlements=svc.entitlements(),
        limits_usage=svc.limits(),
    )


# ── Organization settings ────────────────────────────────────────────────────
@router.get("", response_model=Organization)
async def get_org(org_repo: OrgRepoDep):
    return org_repo.get()


@router.patch("", response_model=Organization)
async def update_org(
    payload: OrgUpdateRequest,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.ORG_MANAGE))],
    org_repo: OrgRepoDep,
):
    org = org_repo.update(name=payload.name, settings=payload.settings)
    _audit(ctx, "org.updated", resource_type="organization", resource_id=org.id)
    return org


# ── Workspaces ───────────────────────────────────────────────────────────────
@router.get("/workspaces")
async def list_workspaces(org_repo: OrgRepoDep):
    return org_repo.list_workspaces()


@router.post("/switch-workspace")
async def switch_workspace(payload: SwitchWorkspaceRequest, ctx: OrgContextDep, org_repo: OrgRepoDep):
    """Switch the recruiter's active workspace (same account, no re-login)."""
    valid = {w.id for w in org_repo.list_workspaces()}
    if payload.workspace_id not in valid:
        return {"error": "Workspace not in your organization."}
    client = get_user_client(ctx.recruiter.access_token)
    client.table("recruiters").update({"active_workspace_id": payload.workspace_id}).eq("id", ctx.recruiter.id).execute()
    _audit(ctx, "workspace.switched", resource_type="workspace", resource_id=payload.workspace_id)
    return {"active_workspace_id": payload.workspace_id}


@router.post("/workspaces", status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreateRequest,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.WORKSPACE_MANAGE))],
    org_repo: OrgRepoDep,
):
    ws = org_repo.create_workspace(payload.name, payload.description)
    _audit(ctx, "workspace.created", resource_type="workspace", resource_id=ws.id, metadata={"name": ws.name})
    return ws


# ── Members & roles ──────────────────────────────────────────────────────────
@router.get("/members")
async def list_members(org_repo: OrgRepoDep):
    return org_repo.list_members()


@router.get("/roles")
async def roles(_: RecruiterDep):
    """Configurable role → permission matrix (policy-based RBAC).

    Authenticated as of 29 Jul 2026, closing audit finding O1 in
    `docs/AUDIT_LOG_V4.md`: this was the one `/org/*` route with no dependency at
    all, so it answered anonymous callers while the module's own contract says
    every route here is organization-scoped. The matrix is policy configuration
    rather than tenant data, so the exposure was the product's authorization
    model, not anyone's records — but an unauthenticated hole in an admin surface
    is not worth keeping for a payload only the Settings screen reads.

    Safe to gate: the sole caller (`getRoles` in `services/org-api.ts`) goes
    through the shared `api()` helper, which always attaches `authHeaders()` and
    throws when signed out. Callers were checked before changing this contract —
    silently gating a route with a header-less client is how `/batch-analysis`
    and `/copilot/suggestions` broke.

    `RecruiterDep`, not `OrgContextDep`: the matrix is static policy identical for
    every organization, so requiring authentication is the whole requirement.
    Resolving org context would add the four-query fan-out to a payload that does
    not vary by org.
    """
    return role_permission_matrix()


@router.post("/members", status_code=status.HTTP_201_CREATED)
async def invite_member(
    payload: MemberInviteRequest,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.MEMBER_MANAGE))],
    org_repo: OrgRepoDep,
):
    # Seats are a plan limit. Checked before the invite so an over-limit team is
    # told to upgrade rather than discovering the cap after the invitee signs up.
    # `add_member_by_email` upserts, so re-inviting an existing member is not a
    # new seat — but the quota check runs first and would refuse at the cap. That
    # is the correct trade: the alternative is resolving membership twice on
    # every invite to save a rare re-invite from an accurate message.
    ctx.plan_service().can_invite_member().raise_for_denied()

    member = org_repo.add_member_by_email(payload.email, payload.role.value)
    _audit(ctx, "member.invited", resource_type="member", resource_id=member.id,
           metadata={"email": payload.email, "role": payload.role.value})
    return member


@router.patch("/members/{member_id}")
async def set_member_role(
    member_id: str, payload: MemberRoleRequest,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.MEMBER_MANAGE))],
    org_repo: OrgRepoDep,
):
    member = org_repo.set_member_role(member_id, payload.role.value)
    _audit(ctx, "member.role_changed", resource_type="member", resource_id=member_id,
           metadata={"role": payload.role.value})
    return member


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    member_id: str,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.MEMBER_MANAGE))],
    org_repo: OrgRepoDep,
):
    org_repo.remove_member(member_id)
    _audit(ctx, "member.removed", resource_type="member", resource_id=member_id)


# ── Feature flags ────────────────────────────────────────────────────────────
@router.get("/feature-flags")
async def get_flags(ctx: OrgContextDep):
    return {"features": FEATURES, "resolved": ctx.features(), "overrides": ctx.feature_overrides}


@router.put("/feature-flags")
async def set_flag(
    payload: FeatureFlagRequest,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.FEATURE_FLAG_MANAGE))],
    org_repo: OrgRepoDep,
):
    org_repo.set_feature_flag(payload.flag, payload.enabled)
    _audit(ctx, "feature_flag.changed", resource_type="feature_flag", resource_id=payload.flag,
           metadata={"enabled": payload.enabled})
    return {"flag": payload.flag, "enabled": payload.enabled}


# ── Usage ────────────────────────────────────────────────────────────────────
@router.get("/usage")
async def usage(
    _: Annotated[OrgContext, Depends(require_permission(Permission.USAGE_VIEW))],
    usage_repo: UsageRepoDep,
    period: Optional[str] = None,
):
    return {"period": period, "metrics": usage_repo.summary(period)}


# ── Audit logs (searchable) ──────────────────────────────────────────────────
@router.get("/audit-logs")
async def audit_logs(
    _: Annotated[OrgContext, Depends(require_permission(Permission.AUDIT_VIEW))],
    audit_repo: AuditRepoDep,
    action: Optional[str] = None,
    limit: int = 100,
):
    return audit_repo.list(action=action, limit=min(limit, 500))


# ── Subscription (READ ONLY) ─────────────────────────────────────────────────
# The plan is server-authoritative. `PATCH /org/subscription` used to live here
# and let anyone holding ORG_MANAGE — i.e. every organization owner — set their
# own plan to 'enterprise' at no cost. That is not a billing foundation, it is a
# self-serve upgrade button, and it was reachable in production.
#
# Plan changes now have exactly two sanctioned paths:
#   1. `scripts/set_org_plan.py` — service-role, audited (operator action today)
#   2. the billing provider's webhook (Phase 3) — the only automated writer
#
# 0016 also revokes INSERT/UPDATE/DELETE on `subscriptions` from the client roles,
# so removing the route is not the only thing standing between a user and a free
# enterprise plan. Defence in depth: the API has no write path AND the database
# refuses one.
@router.get("/subscription", response_model=Subscription)
async def get_subscription(org_repo: OrgRepoDep):
    return org_repo.get_subscription()


# ── API keys (scoped; secret shown once) ─────────────────────────────────────
@router.get("/api-keys")
async def list_api_keys(
    _: Annotated[OrgContext, Depends(require_permission(Permission.API_KEY_MANAGE))],
    api_repo: ApiKeyRepoDep,
):
    return api_repo.list()


@router.post("/api-keys", response_model=ApiKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreateRequest,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.API_KEY_MANAGE))],
    api_repo: ApiKeyRepoDep,
):
    key, secret = api_repo.create(payload.name, payload.scope, ctx.recruiter.id)
    _audit(ctx, "api_key.created", resource_type="api_key", resource_id=key.id,
           metadata={"name": payload.name, "scope": payload.scope})
    return ApiKeyCreated(key=key, secret=secret)


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    ctx: Annotated[OrgContext, Depends(require_permission(Permission.API_KEY_MANAGE))],
    api_repo: ApiKeyRepoDep,
):
    api_repo.revoke(key_id)
    _audit(ctx, "api_key.revoked", resource_type="api_key", resource_id=key_id)
