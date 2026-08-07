"""
`/api/v1/ai/config` must report the embedding width that is actually in use (M-2).

The bug: `resolve_embedding` consulted the static model registry and, on a miss,
returned `EMBEDDING_DIMENSIONS` as if it were fact. Every NVIDIA model misses —
a model that determines its own width cannot be a static table row — so the
endpoint reported 1536 while the provider was returning 2048.

That endpoint is what an operator reads when semantic search has gone quiet, and
the dimension is the first thing they check. A confidently wrong number sends
them down the wrong path, which is worse than admitting the value is unverified.
Hence `dimensions_source`.
"""

from __future__ import annotations

import pytest

from app.ai.embeddings import registry as emb_registry
from app.ai.gateway.gateway import resolve_embedding
from app.core.config import settings


class _FakeProvider:
    """Stands in for a provider that has (or hasn't) embedded something yet."""

    def __init__(self, dimensions: int):
        self.name = "nvidia"
        self.model = "nvidia/llama-nemotron-embed-1b-v2"
        self.dimensions = dimensions


@pytest.fixture(autouse=True)
def _clean_cache():
    original = dict(emb_registry._CACHE)
    emb_registry._CACHE.clear()
    yield
    emb_registry._CACHE.clear()
    emb_registry._CACHE.update(original)


@pytest.fixture
def nvidia_configured(monkeypatch):
    monkeypatch.setattr(settings, "EMBEDDING_PROVIDER", "nvidia")
    monkeypatch.setattr(settings, "EMBEDDING_MODEL", "nvidia/llama-nemotron-embed-1b-v2")
    monkeypatch.setattr(settings, "EMBEDDING_DIMENSIONS", 1536)  # the stale value


def test_observed_width_wins_over_stale_config(nvidia_configured):
    """The exact audit scenario: env says 1536, the model returns 2048."""
    emb_registry._CACHE["nvidia"] = _FakeProvider(2048)
    provider, model, dims, source = resolve_embedding()
    assert provider == "nvidia"
    assert model == "nvidia/llama-nemotron-embed-1b-v2"
    assert dims == 2048, "must report the width the provider actually produced"
    assert source == "observed"


def test_unverified_width_is_labelled_not_presented_as_fact(nvidia_configured):
    """Before the first embedding call there is nothing better than the env var.

    Reporting it is fine; reporting it *as measured* is the defect.
    """
    provider, model, dims, source = resolve_embedding()
    assert dims == 1536
    assert source == "configured", "an unverified number must say so"


def test_provider_with_no_observation_yet_is_not_treated_as_observed(nvidia_configured):
    """dimensions == 0 means 'has not embedded yet', not 'zero-width'."""
    emb_registry._CACHE["nvidia"] = _FakeProvider(0)
    _, _, dims, source = resolve_embedding()
    assert source == "configured"
    assert dims == 1536


def test_hashing_still_reports_its_configured_width(monkeypatch):
    """The offline provider's width is a real input — must not regress."""
    monkeypatch.setattr(settings, "EMBEDDING_PROVIDER", "hashing")
    monkeypatch.setattr(settings, "EMBEDDING_MODEL", "hashing-v1")
    monkeypatch.setattr(settings, "EMBEDDING_DIMENSIONS", 1536)
    provider, model, dims, source = resolve_embedding()
    assert provider == "hashing"
    assert dims == 1536
    assert source in ("registry", "configured")


def test_a_broken_registry_cannot_take_down_the_admin_view(nvidia_configured, monkeypatch):
    """Diagnostics must never raise — this endpoint reports misconfiguration."""
    import app.ai.embeddings.registry as reg

    class Boom(dict):
        def get(self, *_a, **_k):
            raise RuntimeError("cache exploded")

    monkeypatch.setattr(reg, "_CACHE", Boom())
    _, _, dims, source = resolve_embedding()
    assert dims == 1536 and source == "configured"


def test_config_snapshot_exposes_the_source(nvidia_configured):
    from app.ai.gateway.gateway import config_snapshot

    emb_registry._CACHE["nvidia"] = _FakeProvider(2048)
    snap = config_snapshot()
    assert snap["embeddings"]["dimensions"] == 2048
    assert snap["embeddings"]["dimensions_source"] == "observed"
    assert snap["embeddings"]["provider"] == "nvidia"
