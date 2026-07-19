"""Integration persistence (organization-scoped, service client after RBAC)."""

from __future__ import annotations

from typing import Any, Optional

from app.db.supabase_client import get_service_client


class IntegrationRepository:
    def __init__(self, organization_id: str):
        self._c = get_service_client()
        self.org_id = organization_id

    @staticmethod
    def _rows(resp: Any) -> list[dict]:
        data = getattr(resp, "data", None)
        return data if isinstance(data, list) else ([] if data is None else [data])

    def _t(self, name: str):
        return self._c.table(name)

    # ── Connections ──────────────────────────────────────────────────────────
    def list_connections(self) -> list[dict]:
        return self._rows(self._t("integration_connections").select("*").eq("organization_id", self.org_id).execute())

    def get_connection(self, provider: str) -> Optional[dict]:
        rows = self._rows(self._t("integration_connections").select("*")
                          .eq("organization_id", self.org_id).eq("provider", provider).limit(1).execute())
        return rows[0] if rows else None

    def upsert_connection(self, provider: str, *, status: str, scopes: list[str],
                          credentials_encrypted: str, connected_by: Optional[str], health: str = "healthy") -> dict:
        row = {"organization_id": self.org_id, "provider": provider, "status": status,
               "scopes": scopes, "credentials_encrypted": credentials_encrypted,
               "connected_by": connected_by, "health": health}
        return self._rows(self._t("integration_connections").upsert(row, on_conflict="organization_id,provider").execute())[0]

    def disconnect(self, provider: str) -> None:
        self._t("integration_connections").update(
            {"status": "disconnected", "credentials_encrypted": None, "health": "unknown"}
        ).eq("organization_id", self.org_id).eq("provider", provider).execute()

    # ── Automation rules ─────────────────────────────────────────────────────
    def list_rules(self, *, trigger_event: Optional[str] = None, enabled_only: bool = False) -> list[dict]:
        q = self._t("automation_rules").select("*").eq("organization_id", self.org_id)
        if trigger_event:
            q = q.eq("trigger_event", trigger_event)
        if enabled_only:
            q = q.eq("enabled", True)
        return self._rows(q.order("created_at", desc=True).execute())

    def get_rule(self, rule_id: str) -> Optional[dict]:
        rows = self._rows(self._t("automation_rules").select("*")
                          .eq("organization_id", self.org_id).eq("id", rule_id).limit(1).execute())
        return rows[0] if rows else None

    def create_rule(self, *, name: str, trigger_event: str, steps: list[dict], enabled: bool, created_by: str) -> dict:
        row = {"organization_id": self.org_id, "name": name, "trigger_event": trigger_event,
               "steps": steps, "enabled": enabled, "created_by": created_by}
        return self._rows(self._t("automation_rules").insert(row).execute())[0]

    def update_rule(self, rule_id: str, patch: dict) -> dict:
        return self._rows(self._t("automation_rules").update(patch)
                          .eq("organization_id", self.org_id).eq("id", rule_id).execute())[0]

    def delete_rule(self, rule_id: str) -> None:
        self._t("automation_rules").delete().eq("organization_id", self.org_id).eq("id", rule_id).execute()

    # ── Executions ───────────────────────────────────────────────────────────
    def record_execution(self, *, rule_id: Optional[str], rule_name: str, event: str,
                         status: str, steps: list[dict], latency_ms: int, error: Optional[str]) -> dict:
        row = {"organization_id": self.org_id, "rule_id": rule_id, "rule_name": rule_name,
               "event": event, "status": status, "steps": steps, "latency_ms": latency_ms, "error": error}
        return self._rows(self._t("integration_executions").insert(row).execute())[0]

    def list_executions(self, *, status: Optional[str] = None, limit: int = 100) -> list[dict]:
        q = self._t("integration_executions").select("*").eq("organization_id", self.org_id)
        if status:
            q = q.eq("status", status)
        return self._rows(q.order("created_at", desc=True).limit(limit).execute())

    def get_execution(self, exec_id: str) -> Optional[dict]:
        rows = self._rows(self._t("integration_executions").select("*")
                          .eq("organization_id", self.org_id).eq("id", exec_id).limit(1).execute())
        return rows[0] if rows else None

    # ── Webhook endpoints ────────────────────────────────────────────────────
    def list_webhooks(self) -> list[dict]:
        return self._rows(self._t("webhook_endpoints").select("id,provider,enabled,created_at")
                          .eq("organization_id", self.org_id).execute())

    def create_webhook(self, provider: str, secret: str) -> dict:
        return self._rows(self._t("webhook_endpoints").insert(
            {"organization_id": self.org_id, "provider": provider, "secret": secret}).execute())[0]
