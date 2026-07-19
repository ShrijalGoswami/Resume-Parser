"""
Organization context resolution.

Resolves the authenticated recruiter's active organization, workspace, role, plan,
and feature flags into an `OrgContext` — the object every authorization decision
reads from. Resolution uses the user-scoped Supabase client (RLS: a user only sees
their own membership/org), so it is trusted. Privileged mutations then use the
service client scoped explicitly to this resolved organization_id.
"""

from __future__ import annotations

import contextvars
import logging
from dataclasses import dataclass, field
from typing import Optional

from fastapi import HTTPException, status

from app.core.auth import CurrentRecruiter
from app.db.supabase_client import get_user_client
from app.enterprise.feature_flags import resolve_all
from app.enterprise.plans import limits_for
from app.enterprise.rbac import Permission, has_permission, permissions_for_role

logger = logging.getLogger(__name__)

# Request-scoped org id so cross-cutting concerns (usage/audit) can attribute
# activity to an organization without threading it through every call.
current_org_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_org_id", default=None)


@dataclass
class OrgContext:
    recruiter: CurrentRecruiter
    organization_id: str
    organization_name: str
    plan: str
    role: str
    workspace_id: Optional[str] = None
    settings: dict = field(default_factory=dict)
    feature_overrides: dict[str, bool] = field(default_factory=dict)

    def has(self, permission: Permission) -> bool:
        return has_permission(self.role, permission)

    def require(self, permission: Permission) -> None:
        if not self.has(permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail=f"Your role ('{self.role}') lacks permission '{permission.value}'.")

    def features(self) -> dict[str, bool]:
        return resolve_all(self.plan, self.feature_overrides)

    def feature_enabled(self, feature: str) -> bool:
        return self.features().get(feature, False)

    def permissions(self) -> list[str]:
        return sorted(p.value for p in permissions_for_role(self.role))

    def limits(self) -> dict[str, int]:
        return limits_for(self.plan)


def org_id_for(recruiter: CurrentRecruiter) -> Optional[str]:
    """Cheap resolution of just the recruiter's organization_id (1 RLS-scoped read)."""
    try:
        client = get_user_client(recruiter.access_token)
        resp = client.table("recruiters").select("organization_id").eq("id", recruiter.id).limit(1).execute()
        data = getattr(resp, "data", None) or []
        return data[0].get("organization_id") if data else None
    except Exception:  # pragma: no cover
        return None


def resolve_org_context(recruiter: CurrentRecruiter) -> OrgContext:
    """Resolve the recruiter's org context (RLS-scoped reads). Raises 409 if none."""
    client = get_user_client(recruiter.access_token)

    def _rows(resp):
        data = getattr(resp, "data", None)
        return data if isinstance(data, list) else ([] if data is None else [data])

    try:
        rec = _rows(client.table("recruiters").select("organization_id,active_workspace_id").eq("id", recruiter.id).limit(1).execute())
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Organization lookup failed.") from exc
    if not rec or not rec[0].get("organization_id"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail="No organization for this account. Re-run onboarding provisioning.")
    org_id = rec[0]["organization_id"]
    workspace_id = rec[0].get("active_workspace_id")

    org = _rows(client.table("organizations").select("name,plan,settings").eq("id", org_id).limit(1).execute())
    member = _rows(client.table("organization_members").select("role").eq("organization_id", org_id).eq("user_id", recruiter.id).limit(1).execute())
    sub = _rows(client.table("subscriptions").select("plan").eq("organization_id", org_id).limit(1).execute())
    flags = _rows(client.table("org_feature_flags").select("flag,enabled").eq("organization_id", org_id).execute())

    org_row = org[0] if org else {}
    plan = (sub[0].get("plan") if sub else None) or org_row.get("plan") or "free"
    role = (member[0].get("role") if member else None) or "viewer"
    overrides = {f["flag"]: bool(f["enabled"]) for f in flags if f.get("flag")}

    current_org_id.set(org_id)
    return OrgContext(
        recruiter=recruiter, organization_id=org_id, organization_name=org_row.get("name", ""),
        plan=plan, role=role, workspace_id=workspace_id, settings=org_row.get("settings", {}),
        feature_overrides=overrides,
    )
