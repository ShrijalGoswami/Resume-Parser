"""
Event dispatcher + webhook manager.

The dispatcher matches an event to the org's enabled automation rules and runs each
through the workflow engine. It is pure (rules + context supplied by the caller) so
it is testable and free of DB/network concerns.

The Autonomous Agent NEVER calls integrations: it emits an event, the dispatcher
matches rules, the workflow engine calls the Integration Layer — Agent → Workflow →
Integration → External Service.
"""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

from app.integrations.events import Event
from app.integrations.workflow import AutomationRule, ExecutionRecord, workflow_engine


class EventDispatcher:
    def dispatch(self, event: Event, rules: list[AutomationRule], ictx: Any) -> list[ExecutionRecord]:
        matched = [r for r in rules if r.enabled and r.trigger_event == event.type.value]
        return [workflow_engine.execute_rule(rule, event, ictx) for rule in matched]


dispatcher = EventDispatcher()


# ── Webhook manager ─────────────────────────────────────────────────────────
def verify_webhook_signature(secret: str, body: bytes, signature: str) -> bool:
    """HMAC-SHA256 signature verification for inbound webhooks."""
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    provided = signature.split("=", 1)[-1].strip()  # tolerate "sha256=..." form
    return hmac.compare_digest(expected, provided)


class _Idempotency:
    """In-memory idempotency guard for at-least-once webhook delivery."""
    def __init__(self, capacity: int = 4096):
        self._seen: dict[str, bool] = {}
        self._order: list[str] = []
        self._cap = capacity

    def seen(self, key: str) -> bool:
        if not key:
            return False
        if key in self._seen:
            return True
        self._seen[key] = True
        self._order.append(key)
        if len(self._order) > self._cap:
            old = self._order.pop(0)
            self._seen.pop(old, None)
        return False


idempotency = _Idempotency()
