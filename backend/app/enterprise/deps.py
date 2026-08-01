"""
Enterprise FastAPI dependencies.

Policy-based authorization: routes declare the `Permission` or feature they need;
these dependencies resolve the org context and enforce it. Handlers never inspect
role names directly.
"""

from __future__ import annotations

from typing import Annotated, Callable

from fastapi import Depends, HTTPException, status

from typing import Optional

from app.core.auth import CurrentRecruiter, require_recruiter
from app.enterprise.context import OrgContext, current_org_id, org_id_for, resolve_org_context
from app.enterprise.rbac import Permission
from app.enterprise.repositories import ApiKeyRepository, AuditRepository, OrgRepository, UsageRepository


def get_org_context(recruiter: Annotated[CurrentRecruiter, Depends(require_recruiter)]) -> OrgContext:
    return resolve_org_context(recruiter)


OrgContextDep = Annotated[OrgContext, Depends(get_org_context)]


def get_org_id(recruiter: Annotated[CurrentRecruiter, Depends(require_recruiter)]) -> Optional[str]:
    """Lightweight: resolve just the org id (1 read) and set it request-scoped so AI
    calls in this request attribute usage + retrieve organizational memory."""
    oid = org_id_for(recruiter)
    current_org_id.set(oid)
    return oid


OrgIdDep = Annotated[Optional[str], Depends(get_org_id)]


def require_permission(permission: Permission) -> Callable[..., OrgContext]:
    """Dependency factory: 403 unless the member's role grants `permission`."""
    def _dep(ctx: OrgContextDep) -> OrgContext:
        ctx.require(permission)
        return ctx
    return _dep


def require_entitlement(feature: str, *, action: str = "") -> Callable[..., OrgContext]:
    """Dependency factory: 402 unless the ORGANIZATION's plan includes `feature`.

    The entitlement counterpart to `require_permission`. The two are deliberately
    different status codes and different messages — 403 means "your role may
    not", 402 means "your plan does not" — because the remedies are opposite:
    ask an admin vs upgrade the organization. Collapsing them tells a paying
    owner they lack permission, which is the worst message a monetized product
    can show.

    `action`, when given, writes an audit row for the gated call (the behaviour
    the old `feature_gate` had). Auditing is best-effort and never fails the
    request.
    """
    def _dep(ctx: OrgContextDep) -> OrgContext:
        ctx.plan_service().feature(feature).raise_for_denied()
        if action:
            try:
                AuditRepository(ctx.organization_id).record(
                    user_id=ctx.recruiter.id, user_email=ctx.recruiter.email,
                    action=action, resource_type="ai", workspace_id=ctx.workspace_id,
                )
            except Exception:  # pragma: no cover — audit is best-effort
                pass
        return ctx
    return _dep


def require_quota(metric: str, amount: int = 1) -> Callable[..., OrgContext]:
    """Dependency factory: 402 unless consuming `amount` of `metric` fits the plan.

    Use for fixed-size consumption (one member, one campaign). Variable-size
    consumption — a batch of N résumés — must be checked in the handler with
    `ctx.plan_service().can_upload_resume(len(files))`, because the size is not
    known until the request body is parsed.
    """
    def _dep(ctx: OrgContextDep) -> OrgContext:
        ctx.plan_service().quota(metric, amount).raise_for_denied()
        return ctx
    return _dep


def feature_gate(feature: str, *, action: str) -> Callable[..., OrgContext]:
    """DEPRECATED alias for `require_entitlement`.

    Kept so the seven pre-monetization call sites could migrate one at a time
    rather than in a single sweep. Identical behaviour, including the audit row —
    with one deliberate change: a denial is now **402**, not 403. A capability
    the organization has not bought is a billing answer, and the client
    distinguishes the two codes to decide between "upgrade" and "ask an admin".

    New routes should use `require_entitlement` (or `require_quota`).
    """
    return require_entitlement(feature, action=action)


# ── Ready-made permission gates ──────────────────────────────────────────────
# Applied through a route decorator's `dependencies=[...]`, which enforces the
# permission without touching the handler's signature or body. Prefer these to
# re-deriving `Depends(require_permission(...))` per call site, so the product
# permissions actually in use stay greppable from one place.
#
# Added 28 Jul 2026 after an RBAC audit: the policy engine was correct but only
# wired to the org-administration surface. 19 of 103 endpoints enforced a
# permission, and the entire product surface — campaigns, candidates, notes,
# AI, analytics, export, prediction, search — accepted any authenticated caller
# regardless of role. Roles were observable only in Settings, which is exactly
# why they looked cosmetic.
RequireCampaignView = Depends(require_permission(Permission.CAMPAIGN_VIEW))
RequireCampaignManage = Depends(require_permission(Permission.CAMPAIGN_MANAGE))
RequireCampaignDelete = Depends(require_permission(Permission.CAMPAIGN_DELETE))
RequireCandidateView = Depends(require_permission(Permission.CANDIDATE_VIEW))
RequireCandidateManage = Depends(require_permission(Permission.CANDIDATE_MANAGE))
RequireAiUse = Depends(require_permission(Permission.AI_USE))
RequireAgentManage = Depends(require_permission(Permission.AGENT_MANAGE))
RequireUsageView = Depends(require_permission(Permission.USAGE_VIEW))
RequireExport = Depends(require_permission(Permission.EXPORT))


# Repo dependencies (org-scoped; used after authorization).
def get_org_repo(ctx: OrgContextDep) -> OrgRepository:
    return OrgRepository(ctx.organization_id)


def get_audit_repo(ctx: OrgContextDep) -> AuditRepository:
    return AuditRepository(ctx.organization_id)


def get_usage_repo(ctx: OrgContextDep) -> UsageRepository:
    return UsageRepository(ctx.organization_id)


def get_apikey_repo(ctx: OrgContextDep) -> ApiKeyRepository:
    return ApiKeyRepository(ctx.organization_id)


OrgRepoDep = Annotated[OrgRepository, Depends(get_org_repo)]
AuditRepoDep = Annotated[AuditRepository, Depends(get_audit_repo)]
UsageRepoDep = Annotated[UsageRepository, Depends(get_usage_repo)]
ApiKeyRepoDep = Annotated[ApiKeyRepository, Depends(get_apikey_repo)]
