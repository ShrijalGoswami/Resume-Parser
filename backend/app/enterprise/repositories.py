"""
Enterprise repositories (organization-scoped).

Reads/writes over the org tables. Authorization happens BEFORE these are used (via
the RBAC dependencies), so they use the service client scoped EXPLICITLY to the
authorized `organization_id` — RLS still applies to any user-client path
(OrgContext resolution). Every query is filtered by organization_id (defence in
depth) so cross-org access is impossible.
"""

from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import HTTPException, status

from app.db.supabase_client import get_service_client
from app.enterprise.plans import limits_for
from app.enterprise.schemas import (
    ApiKey, AuditLog, OrgMember, Organization, Subscription, UsageCounter, Workspace,
)

logger = logging.getLogger(__name__)


def _period() -> str:
    now = datetime.now(timezone.utc)
    return f"{now.year:04d}-{now.month:02d}"


class _Base:
    def __init__(self, organization_id: str):
        self._c = get_service_client()
        self.org_id = organization_id

    @staticmethod
    def _rows(resp: Any) -> list[dict]:
        data = getattr(resp, "data", None)
        return data if isinstance(data, list) else ([] if data is None else [data])

    def _t(self, name: str):
        return self._c.table(name)


class OrgRepository(_Base):
    def get(self) -> Organization:
        rows = self._rows(self._t("organizations").select("*").eq("id", self.org_id).limit(1).execute())
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
        return Organization(**rows[0])

    def update(self, *, name: Optional[str] = None, settings: Optional[dict] = None) -> Organization:
        patch: dict[str, Any] = {}
        if name is not None:
            patch["name"] = name
        if settings is not None:
            patch["settings"] = settings
        if patch:
            self._t("organizations").update(patch).eq("id", self.org_id).execute()
        return self.get()

    # Workspaces
    def list_workspaces(self) -> list[Workspace]:
        rows = self._rows(self._t("workspaces").select("*").eq("organization_id", self.org_id).order("created_at").execute())
        return [Workspace(**r) for r in rows]

    def create_workspace(self, name: str, description: str = "") -> Workspace:
        rows = self._rows(self._t("workspaces").insert(
            {"organization_id": self.org_id, "name": name, "description": description}).execute())
        return Workspace(**rows[0])

    def count_workspaces(self) -> int:
        return len(self.list_workspaces())

    # Members
    def list_members(self) -> list[OrgMember]:
        rows = self._rows(self._t("organization_members").select("*").eq("organization_id", self.org_id).execute())
        return [OrgMember(**r) for r in rows]

    def count_members(self) -> int:
        return len(self.list_members())

    def add_member_by_email(self, email: str, role: str) -> OrgMember:
        found = self._rows(self._t("recruiters").select("id").eq("email", email).limit(1).execute())
        if not found:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="No user with that email yet. Ask them to sign up first, then invite.")
        user_id = found[0]["id"]
        rows = self._rows(self._t("organization_members").upsert(
            {"organization_id": self.org_id, "user_id": user_id, "role": role, "status": "active",
             "invited_email": email}, on_conflict="organization_id,user_id").execute())
        return OrgMember(**rows[0])

    def set_member_role(self, member_id: str, role: str) -> OrgMember:
        rows = self._rows(self._t("organization_members").update({"role": role})
                          .eq("organization_id", self.org_id).eq("id", member_id).execute())
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
        return OrgMember(**rows[0])

    def remove_member(self, member_id: str) -> None:
        self._t("organization_members").delete().eq("organization_id", self.org_id).eq("id", member_id).execute()

    # Subscription
    def get_subscription(self) -> Subscription:
        rows = self._rows(self._t("subscriptions").select("*").eq("organization_id", self.org_id).limit(1).execute())
        if rows:
            return Subscription(**rows[0])
        return Subscription(organization_id=self.org_id, plan="free", limits=limits_for("free"))

    def update_subscription(self, plan: str) -> Subscription:
        limits = limits_for(plan)
        self._t("subscriptions").upsert(
            {"organization_id": self.org_id, "plan": plan, "limits": limits, "status": "active"},
            on_conflict="organization_id").execute()
        self._t("organizations").update({"plan": plan}).eq("id", self.org_id).execute()
        return self.get_subscription()

    # Feature flags
    def list_feature_flags(self) -> dict[str, bool]:
        rows = self._rows(self._t("org_feature_flags").select("flag,enabled").eq("organization_id", self.org_id).execute())
        return {r["flag"]: bool(r["enabled"]) for r in rows if r.get("flag")}

    def set_feature_flag(self, flag: str, enabled: bool) -> None:
        self._t("org_feature_flags").upsert(
            {"organization_id": self.org_id, "flag": flag, "enabled": enabled},
            on_conflict="organization_id,flag").execute()


class AuditRepository(_Base):
    def record(self, *, user_id: Optional[str], user_email: Optional[str], action: str,
               resource_type: str = "", resource_id: str = "", metadata: Optional[dict] = None,
               workspace_id: Optional[str] = None) -> None:
        """Immutable, best-effort — auditing must never break the request."""
        try:
            self._t("audit_logs").insert({
                "organization_id": self.org_id, "workspace_id": workspace_id, "user_id": user_id,
                "user_email": user_email, "action": action, "resource_type": resource_type,
                "resource_id": resource_id, "metadata": metadata or {},
            }).execute()
        except Exception as exc:  # pragma: no cover
            logger.info("Audit record failed (%s): %s", action, exc)

    def list(self, *, action: Optional[str] = None, limit: int = 100) -> list[AuditLog]:
        q = self._t("audit_logs").select("*").eq("organization_id", self.org_id).order("created_at", desc=True).limit(limit)
        if action:
            q = q.eq("action", action)
        return [AuditLog(**r) for r in self._rows(q.execute())]


class UsageRepository(_Base):
    def increment(self, metric: str, delta: int = 1, period: Optional[str] = None) -> None:
        """Best-effort read-modify-write increment for one org/period/metric."""
        p = period or _period()
        try:
            rows = self._rows(self._t("org_usage_counters").select("value")
                              .eq("organization_id", self.org_id).eq("period", p).eq("metric", metric).limit(1).execute())
            current = rows[0]["value"] if rows else 0
            self._t("org_usage_counters").upsert(
                {"organization_id": self.org_id, "period": p, "metric": metric, "value": current + delta},
                on_conflict="organization_id,period,metric").execute()
        except Exception as exc:  # pragma: no cover
            logger.info("Usage increment failed (%s): %s", metric, exc)

    def summary(self, period: Optional[str] = None) -> list[UsageCounter]:
        p = period or _period()
        rows = self._rows(self._t("org_usage_counters").select("metric,period,value")
                          .eq("organization_id", self.org_id).eq("period", p).execute())
        return [UsageCounter(**r) for r in rows]


class ApiKeyRepository(_Base):
    def list(self) -> list[ApiKey]:
        rows = self._rows(self._t("api_keys").select("id,organization_id,name,prefix,scope,revoked,last_used_at,created_at")
                          .eq("organization_id", self.org_id).order("created_at", desc=True).execute())
        return [ApiKey(**r) for r in rows]

    def create(self, name: str, scope: str, created_by: str) -> tuple[ApiKey, str]:
        secret = "hl_" + secrets.token_urlsafe(32)
        prefix = secret[:11]
        key_hash = hashlib.sha256(secret.encode()).hexdigest()
        rows = self._rows(self._t("api_keys").insert(
            {"organization_id": self.org_id, "name": name, "prefix": prefix, "key_hash": key_hash,
             "scope": scope, "created_by": created_by}).execute())
        return ApiKey(**{k: rows[0][k] for k in ("id", "organization_id", "name", "prefix", "scope", "revoked", "created_at") if k in rows[0]}), secret

    def revoke(self, key_id: str) -> None:
        self._t("api_keys").update({"revoked": True}).eq("organization_id", self.org_id).eq("id", key_id).execute()
