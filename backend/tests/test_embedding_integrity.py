"""
Startup detection of a stale embedding store.

The condition under test is invisible at runtime: a stored vector produced by a
different model has a different length, `cosine_similarity` returns 0.0 for it,
and the candidate simply stops appearing in search results. No exception, no
non-200, nothing on /health. These tests pin the boot-time check that turns that
silence into a log line — and, when the operator asks for it, into a refusal.
"""

from __future__ import annotations

import logging

import pytest

from app.ai.embeddings import integrity
from app.core import startup as startup_mod
from app.core.config import settings


class _Resp:
    def __init__(self, count=None, data=None):
        self.count = count
        self.data = data or []


class _FakeTable:
    """Minimal PostgREST builder double: select/neq/limit/execute chaining."""

    def __init__(self, total: int, stale: int, sample: list[dict] | None = None):
        self._total = total
        self._stale = stale
        self._sample = sample or []
        self._filtered = False
        self._cols = ""

    def select(self, cols, count=None):
        self._cols = cols
        self._count_mode = count
        return self

    def neq(self, *_args):
        self._filtered = True
        return self

    def limit(self, *_args):
        return self

    def execute(self):
        if getattr(self, "_count_mode", None) == "exact":
            return _Resp(count=self._stale if self._filtered else self._total)
        return _Resp(data=self._sample)


@pytest.fixture
def wired(monkeypatch):
    """Supabase 'configured' with a service key, and a known active model."""
    monkeypatch.setattr(type(settings), "is_supabase_configured", property(lambda _: True))
    monkeypatch.setattr(type(settings), "supabase_service_key", property(lambda _: "svc"))
    monkeypatch.setattr(
        "app.ai.embeddings.service.active_embedding_model",
        lambda: "nvidia:nvidia/nemotron-3-embed-1b",
    )
    return monkeypatch


def _client_returning(table):
    return type("C", (), {"table": lambda self, _n: table})()


# ── the check itself ─────────────────────────────────────────────────────────

def test_all_rows_match_active_model_is_ok(wired):
    wired.setattr("app.db.supabase_client.get_service_client",
                  lambda: _client_returning(_FakeTable(total=120, stale=0)))
    report = integrity.check_embedding_integrity()
    assert report.status == "ok"
    assert report.is_stale is False
    assert report.total_rows == 120


def test_rows_from_another_model_are_reported_stale(wired):
    sample = [{"model": "hashing:hashing-v1", "dimensions": 1536}] * 3
    wired.setattr("app.db.supabase_client.get_service_client",
                  lambda: _client_returning(_FakeTable(total=100, stale=40, sample=sample)))
    report = integrity.check_embedding_integrity()
    assert report.is_stale
    assert report.stale_rows == 40
    assert report.stale_percent == pytest.approx(40.0)
    # Names the offending model so the operator knows what to reindex.
    assert any("hashing:hashing-v1" in m and "1536" in m for m in report.stale_models)


def test_empty_store_is_ok_not_stale(wired):
    wired.setattr("app.db.supabase_client.get_service_client",
                  lambda: _client_returning(_FakeTable(total=0, stale=0)))
    assert integrity.check_embedding_integrity().status == "ok"


def test_stateless_deployment_is_skipped_not_failed(monkeypatch):
    monkeypatch.setattr(type(settings), "is_supabase_configured", property(lambda _: False))
    report = integrity.check_embedding_integrity()
    assert report.status == "skipped"
    assert report.is_stale is False


def test_missing_service_key_is_skipped_not_a_false_ok(monkeypatch):
    """Without the service role the check cannot see other tenants' rows.

    Reporting "ok" there would be a lie that hides the very condition this
    module exists to surface.
    """
    monkeypatch.setattr(type(settings), "is_supabase_configured", property(lambda _: True))
    monkeypatch.setattr(type(settings), "supabase_service_key", property(lambda _: ""))
    assert integrity.check_embedding_integrity().status == "skipped"


def test_database_error_is_unavailable_never_raises(wired):
    def boom():
        raise RuntimeError("connection refused")

    wired.setattr("app.db.supabase_client.get_service_client", boom)
    report = integrity.check_embedding_integrity()
    assert report.status == "unavailable"
    assert report.is_stale is False


# ── severity + startup wiring ────────────────────────────────────────────────

def test_production_logs_at_error_level(wired, caplog):
    wired.setattr("app.db.supabase_client.get_service_client",
                  lambda: _client_returning(_FakeTable(total=10, stale=5)))
    wired.setattr(settings, "ENVIRONMENT", "production")
    with caplog.at_level(logging.WARNING, logger="app.startup"):
        integrity.report_embedding_integrity()
    assert any(r.levelno == logging.ERROR for r in caplog.records)
    assert "INVISIBLE to semantic search" in caplog.text
    # The fix must be in the message, not in someone's memory.
    assert "reindex" in caplog.text.lower()


def test_development_logs_at_warning_level(wired, caplog):
    wired.setattr("app.db.supabase_client.get_service_client",
                  lambda: _client_returning(_FakeTable(total=10, stale=5)))
    wired.setattr(settings, "ENVIRONMENT", "development")
    with caplog.at_level(logging.WARNING, logger="app.startup"):
        integrity.report_embedding_integrity()
    assert any(r.levelno == logging.WARNING for r in caplog.records)
    assert not any(r.levelno == logging.ERROR for r in caplog.records)


def test_action_fail_refuses_to_boot_when_stale(monkeypatch):
    monkeypatch.setattr(settings, "EMBEDDING_STALENESS_ACTION", "fail")
    monkeypatch.setattr(
        "app.ai.embeddings.integrity.report_embedding_integrity",
        lambda: integrity.EmbeddingIntegrityReport(
            status="stale", active_model="nvidia:m", total_rows=10, stale_rows=4
        ),
    )
    with pytest.raises(startup_mod.StartupError, match="stale"):
        startup_mod._validate_embedding_integrity()


def test_action_fail_still_boots_when_check_could_not_run(monkeypatch):
    """A database blip must not be mistaken for a stale store.

    Conflating "could not ask" with "got a bad answer" would let a transient
    outage refuse every deploy.
    """
    monkeypatch.setattr(settings, "EMBEDDING_STALENESS_ACTION", "fail")
    monkeypatch.setattr(
        "app.ai.embeddings.integrity.report_embedding_integrity",
        lambda: integrity.EmbeddingIntegrityReport(status="unavailable", detail="down"),
    )
    startup_mod._validate_embedding_integrity()  # must not raise


def test_action_off_skips_entirely(monkeypatch):
    called = []
    monkeypatch.setattr(settings, "EMBEDDING_STALENESS_ACTION", "off")
    monkeypatch.setattr(
        "app.ai.embeddings.integrity.report_embedding_integrity",
        lambda: called.append(1),
    )
    startup_mod._validate_embedding_integrity()
    assert called == []


def test_default_action_warns_and_does_not_block_boot(monkeypatch):
    monkeypatch.setattr(settings, "EMBEDDING_STALENESS_ACTION", "warn")
    monkeypatch.setattr(
        "app.ai.embeddings.integrity.report_embedding_integrity",
        lambda: integrity.EmbeddingIntegrityReport(
            status="stale", active_model="nvidia:m", total_rows=10, stale_rows=10
        ),
    )
    startup_mod._validate_embedding_integrity()  # must not raise
