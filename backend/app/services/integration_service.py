"""
Integration platform orchestration (product layer).

Public API for the rest of the app:
  * emit_event(...)   — product actions & the agent emit events here; the dispatcher
    matches org automation rules and runs them through the Integration Layer.
  * connect / oauth_callback / disconnect / test — provider lifecycle.
  * rule CRUD, execution history + replay.

Features NEVER call an external API directly — only through this service → workflow
→ integration layer. `emit_event` is best-effort and safe to run off the request
path (a future queue can replace the in-process call unchanged).
"""

from __future__ import annotations

import json
import logging
import secrets
from dataclasses import asdict
from typing import Optional

from app.integrations.context import IntegrationContext
from app.integrations.crypto import encrypt
from app.integrations.dispatcher import dispatcher
from app.integrations.events import Event, IntegrationEvent
from app.integrations.oauth import authorize_url, exchange_code
from app.integrations.registry import get_provider
from app.integrations.repositories import IntegrationRepository
from app.integrations.workflow import AutomationRule, ExecutionRecord, WorkflowStep, workflow_engine

logger = logging.getLogger(__name__)


def _build_context(repo: IntegrationRepository) -> IntegrationContext:
    connections = {c["provider"]: c for c in repo.list_connections()}
    return IntegrationContext(organization_id=repo.org_id, connections=connections)


def _rule_from_row(row: dict) -> AutomationRule:
    steps = [WorkflowStep(action=s.get("action", ""), provider=s.get("provider", ""), params=s.get("params", {}))
             for s in (row.get("steps") or [])]
    return AutomationRule(id=row["id"], name=row.get("name", ""), trigger_event=row.get("trigger_event", ""),
                          steps=steps, enabled=bool(row.get("enabled", True)))


def _persist(repo: IntegrationRepository, rec: ExecutionRecord) -> None:
    repo.record_execution(
        rule_id=rec.rule_id, rule_name=rec.rule_name, event=rec.event, status=rec.status,
        steps=[asdict(s) for s in rec.steps], latency_ms=rec.latency_ms, error=rec.error,
    )


# ── Event emission (Agent/product → Workflow → Integration) ──────────────────
def emit_event(organization_id: str, event_type: IntegrationEvent, payload: Optional[dict] = None) -> list[ExecutionRecord]:
    repo = IntegrationRepository(organization_id)
    ictx = _build_context(repo)
    rules = [_rule_from_row(r) for r in repo.list_rules(trigger_event=event_type.value, enabled_only=True)]
    records = dispatcher.dispatch(Event(type=event_type, organization_id=organization_id, payload=payload or {}), rules, ictx)
    for rec in records:
        _persist(repo, rec)
    return records


def safe_emit_event(organization_id: Optional[str], event_type: IntegrationEvent, payload: Optional[dict] = None) -> None:
    """Never raises — event dispatch must not break the recruiter's action."""
    if not organization_id:
        return
    try:
        emit_event(organization_id, event_type, payload)
    except Exception as exc:  # pragma: no cover
        logger.info("Integration event %s skipped: %s", event_type.value, exc)


# ── Provider lifecycle ───────────────────────────────────────────────────────
def start_connect(organization_id: str, provider: str, redirect_uri: str) -> dict:
    p = get_provider(provider)
    if p is None:
        raise ValueError(f"Unknown provider '{provider}'.")
    if not p.spec.requires_oauth:
        # Non-OAuth providers (generic ATS, webhook) connect immediately.
        IntegrationRepository(organization_id).upsert_connection(
            provider, status="connected", scopes=[], credentials_encrypted="", connected_by=None, health="healthy")
        return {"connected": True}
    state = f"{provider}:{secrets.token_urlsafe(8)}"
    return {"authorize_url": authorize_url(provider, redirect_uri, state), "state": state}


def oauth_callback(organization_id: str, provider: str, code: str, redirect_uri: str, recruiter_id: str) -> dict:
    tokens = exchange_code(provider, code, redirect_uri)
    enc = encrypt(json.dumps(tokens))
    scopes = (tokens.get("scope", "") or "").split()
    conn = IntegrationRepository(organization_id).upsert_connection(
        provider, status="connected", scopes=scopes, credentials_encrypted=enc,
        connected_by=recruiter_id, health="healthy")
    return {"provider": provider, "status": conn.get("status"), "simulated": tokens.get("simulated", False)}


def disconnect(organization_id: str, provider: str) -> None:
    IntegrationRepository(organization_id).disconnect(provider)


def test_connection(organization_id: str, provider: str) -> dict:
    p = get_provider(provider)
    if p is None:
        return {"ok": False, "error": "unknown provider"}
    ictx = _build_context(IntegrationRepository(organization_id))
    return p.test_connection(ictx).as_dict()


# ── Executions ───────────────────────────────────────────────────────────────
def replay_execution(organization_id: str, execution_id: str) -> Optional[ExecutionRecord]:
    repo = IntegrationRepository(organization_id)
    ex = repo.get_execution(execution_id)
    if not ex or not ex.get("rule_id"):
        return None
    rule_row = repo.get_rule(ex["rule_id"])
    if not rule_row:
        return None
    try:
        event_type = IntegrationEvent(ex["event"])
    except ValueError:
        return None
    ictx = _build_context(repo)
    rec = workflow_engine.execute_rule(_rule_from_row(rule_row),
                                       Event(type=event_type, organization_id=organization_id, payload={}), ictx)
    _persist(repo, rec)
    return rec
