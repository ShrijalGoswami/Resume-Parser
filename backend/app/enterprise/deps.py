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


def require_feature(feature: str) -> Callable[..., OrgContext]:
    """Dependency factory: 403 unless `feature` is enabled for the organization."""
    def _dep(ctx: OrgContextDep) -> OrgContext:
        if not ctx.feature_enabled(feature):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"The '{feature}' capability is not enabled for your organization.")
        return ctx
    return _dep


def feature_gate(feature: str, *, action: str) -> Callable[..., OrgContext]:
    """Router-level gate: enforce a feature flag AND record an audit trail entry.

    Setting `current_org_id` (done during context resolution) also makes every AI
    call in the request roll its usage up to the organization automatically.
    """
    def _dep(ctx: OrgContextDep) -> OrgContext:
        if not ctx.feature_enabled(feature):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"The '{feature}' capability is not enabled for your organization.")
        try:
            AuditRepository(ctx.organization_id).record(
                user_id=ctx.recruiter.id, user_email=ctx.recruiter.email,
                action=action, resource_type="ai", workspace_id=ctx.workspace_id,
            )
        except Exception:  # pragma: no cover — audit is best-effort
            pass
        return ctx
    return _dep


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
