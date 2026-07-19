"""
Integration provider interface.

Every external service (Gmail, Slack, Zoom, an ATS, a webhook, …) is a provider
plugin implementing this ONE interface. No product feature ever calls an external
API directly — it goes Feature → Workflow → Integration Layer → provider.execute().

Providers run in DRY-RUN (simulated) mode until an organization connects them via
OAuth; the interface, workflow engine, dispatcher, and admin surface are identical
whether the call is simulated or live, so wiring a real SDK is a single `_perform`
override with no ripple effect.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional


class ProviderCategory(str, Enum):
    email = "email"
    calendar = "calendar"
    messaging = "messaging"
    meeting = "meeting"
    ats = "ats"
    webhook = "webhook"


class IntegrationAction(str, Enum):
    send_email = "send_email"
    create_calendar_event = "create_calendar_event"
    send_message = "send_message"
    create_meeting = "create_meeting"
    create_candidate = "create_candidate"
    post_webhook = "post_webhook"


@dataclass(frozen=True)
class OAuthConfig:
    authorize_url: str
    token_url: str
    scopes: tuple[str, ...]
    client_id_setting: str
    client_secret_setting: str


@dataclass(frozen=True)
class ProviderSpec:
    name: str
    display_name: str
    category: ProviderCategory
    actions: tuple[IntegrationAction, ...]
    oauth: Optional[OAuthConfig] = None
    requires_oauth: bool = True


@dataclass
class IntegrationResult:
    ok: bool
    provider: str
    action: str
    detail: str = ""
    external_id: Optional[str] = None
    latency_ms: int = 0
    simulated: bool = False
    error: Optional[str] = None

    def as_dict(self) -> dict:
        return {
            "ok": self.ok, "provider": self.provider, "action": self.action,
            "detail": self.detail, "external_id": self.external_id,
            "latency_ms": self.latency_ms, "simulated": self.simulated, "error": self.error,
        }


class IntegrationProvider(ABC):
    spec: ProviderSpec

    @abstractmethod
    def _perform(self, action: IntegrationAction, ctx: Any, params: dict) -> IntegrationResult:
        """Perform ONE action. Real providers call their SDK here; raise on failure."""

    def execute(self, action: IntegrationAction, ctx: Any, params: dict) -> IntegrationResult:
        start = time.time()
        if action not in self.spec.actions:
            return IntegrationResult(ok=False, provider=self.spec.name, action=action.value,
                                     error=f"'{self.spec.name}' does not support '{action.value}'.")
        try:
            res = self._perform(action, ctx, params or {})
        except Exception as exc:  # never let a provider error escape the layer
            res = IntegrationResult(ok=False, provider=self.spec.name, action=action.value, error=str(exc))
        res.latency_ms = round((time.time() - start) * 1000)
        return res

    def test_connection(self, ctx: Any) -> IntegrationResult:
        connected = bool(ctx and ctx.is_connected(self.spec.name))
        return IntegrationResult(
            ok=True, provider=self.spec.name, action="test",
            detail="connected" if connected else "not connected (dry-run ready)",
            simulated=not connected,
        )


class SimulatedProvider(IntegrationProvider):
    """Default behaviour: execute actions deterministically in dry-run mode.

    A live provider overrides `_perform` to call its SDK using the decrypted
    credentials from `ctx.credentials(name)`. Everything else is unchanged.
    """

    def _perform(self, action: IntegrationAction, ctx: Any, params: dict) -> IntegrationResult:
        connected = bool(ctx and ctx.is_connected(self.spec.name))
        return IntegrationResult(
            ok=True, provider=self.spec.name, action=action.value,
            detail=f"{'Executed' if connected else '[simulated]'} {action.value} via {self.spec.display_name}",
            external_id=f"{self.spec.name}_{action.value}", simulated=not connected,
        )
