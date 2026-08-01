"""
Guards on the org-context fan-out (app/enterprise/context.py).

`resolve_org_context` issues its org reads concurrently and converts any CRITICAL
failure into 503 "Organization lookup failed." That shape caused, and then hid,
the upload 503 in docs/rca/UPLOAD_503.md. These tests pin the properties that
made it diagnosable and keep it from silently reverting:

  F1  The fan-out is genuinely CONCURRENT. A barrier that only releases when all
      table branches have arrived — if the reads go back to being sequential, no
      branch ever gets past it and the test fails on timeout. Monetization
      (Phase 1) added `entitlement_grants` to the fan-out; it must join the
      concurrency, not append a serial read to a hot path.

  F2  A failure is LOGGED with per-branch attribution. The old code read the
      futures in a fixed order and let the first `.result()` raise, so a 503
      named neither the failing query nor how many failed. `failed_branches=1/4`
      vs `4/4` is the difference between a query/RLS fault and a transport fault
      — which is the entire diagnosis in the RCA.

  F4  Monetization branches DEGRADE rather than 503. Usage counters and grants
      refine an answer that can already be given, so a billing-table failure must
      not take the product down with it — it logs and falls back to zero usage
      and no grants.

  F3  Each branch runs in its OWN copy of the request context, so log lines from
      pool threads carry the request ID. One shared `Context` cannot be entered
      by two threads at once and kills three of the four branches with
      "cannot enter context" — the first draft of the instrumentation did
      exactly that, so this is a real regression, not a hypothetical.

Offline: no Supabase, no network, no credentials.
"""
from __future__ import annotations

import logging
import threading

import pytest
from fastapi import HTTPException

from app.core.auth import CurrentRecruiter
from app.core.observability import request_id_ctx
from app.enterprise import context as ctxmod

RECRUITER = CurrentRecruiter(id="rec-1", email="a@example.com", access_token="tok")
ORG_ID = "org-1"

# Rows the four fan-out branches read, keyed by table.
ROWS = {
    "recruiters": [{"organization_id": ORG_ID, "active_workspace_id": "ws-1"}],
    "organizations": [{"name": "Acme", "plan": "pro", "settings": {}}],
    "organization_members": [{"role": "admin"}],
    "subscriptions": [{"plan": "scale", "status": "active", "plan_ruleset": "v1",
                       "plan_version": 3, "limit_overrides": {}}],
    "org_feature_flags": [{"flag": "ask", "enabled": True}],
    "entitlement_grants": [],
}


class _Resp:
    def __init__(self, data):
        self.data = data


class _Query:
    """Chainable stand-in for a postgrest query builder."""

    def __init__(self, table: str, hooks: "_FakeClient"):
        self._table, self._hooks = table, hooks

    def select(self, *a, **k):
        return self

    def eq(self, *a, **k):
        return self

    def limit(self, *a, **k):
        return self

    def execute(self):
        self._hooks.on_execute(self._table)
        return _Resp(ROWS[self._table])


class _FakeClient:
    def __init__(self, on_execute=None):
        self.on_execute = on_execute or (lambda table: None)

    def table(self, name: str) -> _Query:
        return _Query(name, self)


def _install(monkeypatch, client: _FakeClient) -> None:
    monkeypatch.setattr(ctxmod, "get_user_client", lambda token: client)
    # The usage branch is an RPC through the SERVICE client, not the user client,
    # so it needs its own stub — without one this suite would reach the network
    # and lose the offline property stated in the module docstring. (It would
    # still pass: `read_snapshot` degrades to zero usage. Passing for the wrong
    # reason is exactly what these tests exist to prevent.)
    monkeypatch.setattr(ctxmod, "read_snapshot",
                        lambda org_id, period=None: ctxmod.UsageSnapshot(period="2026-07"))


def test_fanout_runs_concurrently(monkeypatch) -> None:
    """F1 — every table branch is in flight at the same time."""
    # The first read (recruiters) happens before the fan-out, so only the fan-out
    # branches meet at the barrier. The usage branch is an RPC rather than a
    # table read, so it does not pass through `on_execute`.
    barrier = threading.Barrier(5, timeout=10)
    arrived: list[str] = []
    lock = threading.Lock()

    def on_execute(table: str) -> None:
        if table == "recruiters":
            return
        with lock:
            arrived.append(table)
        # Sequential execution can never get five threads here at once.
        barrier.wait()

    _install(monkeypatch, _FakeClient(on_execute))
    ctx = ctxmod.resolve_org_context(RECRUITER)

    assert sorted(arrived) == [
        "entitlement_grants", "org_feature_flags", "organization_members",
        "organizations", "subscriptions",
    ]
    # Values still assemble correctly from the concurrent reads.
    assert ctx.organization_id == ORG_ID
    assert ctx.role == "admin"
    assert ctx.plan == "scale"           # subscription wins over the org's plan
    assert ctx.organization_name == "Acme"
    assert ctx.feature_overrides == {"ask": True}
    assert ctx.workspace_id == "ws-1"
    # Monetization state travels with the plan.
    assert ctx.plan_ruleset == "v1"
    assert ctx.plan_status == "active"
    assert ctx.plan_version == 3


def test_branch_failure_is_logged_with_attribution(monkeypatch, caplog) -> None:
    """F2 — a failing branch is named, counted, and its exception logged."""
    boom = RuntimeError("postgrest exploded")

    def on_execute(table: str) -> None:
        if table == "subscriptions":
            raise boom

    _install(monkeypatch, _FakeClient(on_execute))

    with caplog.at_level(logging.ERROR, logger="app.enterprise.context"):
        with pytest.raises(HTTPException) as excinfo:
            ctxmod.resolve_org_context(RECRUITER)

    assert excinfo.value.status_code == 503
    # The cause must be attached, not discarded.
    assert excinfo.value.__cause__ is boom

    records = [r for r in caplog.records if "org-context read failed" in r.getMessage()]
    assert records, "a 503 must never be raised without logging what threw"
    message = records[0].getMessage()
    assert "query=sub" in message, f"the failing branch must be named: {message}"
    assert "failed_branches=1/4" in message, (
        f"one failing branch is a query fault; 4/4 is a transport fault: {message}"
    )
    assert "postgrest exploded" in message, "the swallowed exception must appear"
    assert records[0].exc_info is not None, "the traceback must be attached"


def test_all_branches_failing_is_reported_as_such(monkeypatch, caplog) -> None:
    """F2b — the transport-fault signature (4/4) is distinguishable."""
    def on_execute(table: str) -> None:
        if table != "recruiters":
            raise RuntimeError("connection terminated")

    _install(monkeypatch, _FakeClient(on_execute))

    with caplog.at_level(logging.ERROR, logger="app.enterprise.context"):
        with pytest.raises(HTTPException):
            ctxmod.resolve_org_context(RECRUITER)

    messages = [r.getMessage() for r in caplog.records if "org-context read failed" in r.getMessage()]
    assert len(messages) == 4, "every failing branch must be logged, not just the first"
    assert all("failed_branches=4/4" in m for m in messages)


def test_request_context_reaches_fanout_threads(monkeypatch) -> None:
    """F3 — each branch sees the request's contextvars, in its own copy."""
    seen: list[str] = []
    lock = threading.Lock()

    def on_execute(table: str) -> None:
        if table == "recruiters":
            return
        with lock:
            seen.append(request_id_ctx.get())

    _install(monkeypatch, _FakeClient(on_execute))

    token = request_id_ctx.set("req-abc123")
    try:
        ctxmod.resolve_org_context(RECRUITER)
    finally:
        request_id_ctx.reset(token)

    assert seen == ["req-abc123"] * 5, (
        "fan-out threads must inherit the request id (a shared Context copy "
        f"would instead break all but one branch): {seen}"
    )


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))

def test_monetization_branches_degrade_instead_of_503(monkeypatch, caplog) -> None:
    """F4 — a billing-table failure must not take the product down.

    `entitlement_grants` and the usage RPC refine an answer that can already be
    given: the organization, the role and the plan all resolved. Treating them as
    critical would make the monetization tables a single point of failure for
    every authenticated request in the product — a strictly worse outcome than
    briefly allowing one extra résumé.

    Degradation is deliberately GENEROUS (zero usage → quotas do not block) and
    deliberately LOUD (a WARNING per failed branch), so a degraded run is visible
    rather than silent.
    """
    def on_execute(table: str) -> None:
        if table == "entitlement_grants":
            raise RuntimeError("grants table unavailable")

    monkeypatch.setattr(ctxmod, "get_user_client", lambda token: _FakeClient(on_execute))

    def _boom(org_id, period=None):
        raise RuntimeError("usage rpc unavailable")

    monkeypatch.setattr(ctxmod, "read_snapshot", _boom)

    with caplog.at_level(logging.WARNING, logger="app.enterprise.context"):
        ctx = ctxmod.resolve_org_context(RECRUITER)   # must NOT raise

    assert ctx.organization_id == ORG_ID
    assert ctx.role == "admin"
    assert ctx.grants == set()
    assert ctx.usage.resumes_lifetime == 0

    degraded = [r.getMessage() for r in caplog.records
                if "optional read failed" in r.getMessage()]
    assert len(degraded) == 2, f"both failures must be logged, got: {degraded}"
    assert any("grants" in m for m in degraded)
    assert any("usage" in m for m in degraded)


def test_a_critical_branch_failure_still_503s(monkeypatch) -> None:
    """The other half of F4: degrading the optional branches must not have
    softened the critical ones. Without an organization row there is no honest
    answer to give."""
    def on_execute(table: str) -> None:
        if table == "organizations":
            raise RuntimeError("organizations unavailable")

    _install(monkeypatch, _FakeClient(on_execute))
    with pytest.raises(HTTPException) as excinfo:
        ctxmod.resolve_org_context(RECRUITER)
    assert excinfo.value.status_code == 503
