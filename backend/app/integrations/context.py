"""
Integration context — the recruiter/org-scoped handle providers execute against.

Carries the organization's connected providers and gives providers access to their
decrypted credentials only in-process (never returned to callers/frontend).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.integrations.crypto import decrypt


@dataclass
class IntegrationContext:
    organization_id: str
    #: provider name → connection row ({status, credentials(encrypted), scopes, ...})
    connections: dict[str, dict] = field(default_factory=dict)

    def is_connected(self, provider: str) -> bool:
        conn = self.connections.get(provider)
        return bool(conn and conn.get("status") == "connected")

    def credentials(self, provider: str) -> dict:
        """Decrypted credentials for a provider (in-process only)."""
        conn = self.connections.get(provider) or {}
        blob = conn.get("credentials_encrypted")
        if not blob:
            return {}
        import json
        raw = decrypt(blob)
        try:
            return json.loads(raw) if raw else {}
        except Exception:
            return {}
