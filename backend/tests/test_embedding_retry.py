"""
Transient embedding failures are retried; permanent ones are not (P1).

P0-3 stopped a provider blip from 5xx-ing Talent Search, but every blip still
cost the whole semantic ranking for that request. NVIDIA 429s are usually
per-minute throttles that clear in seconds — worth one bounded wait, not an
immediate downgrade.

The policy is the orchestrator's, read from the SAME settings
(`AI_RETRY_BASE_DELAY_MS`, `AI_RETRY_MAX_DELAY_MS`, `AI_MAX_RATE_LIMIT_RETRIES`,
`AI_MAX_NETWORK_RETRIES`). These tests pin the two things that make a retry
ladder safe rather than dangerous: that it gives up, and that it never starts for
a failure a retry cannot fix.
"""

from __future__ import annotations

import pytest

from app.ai.config import get_ai_config
from app.ai.embeddings import service as emb_service
from app.ai.embeddings.base import EmbeddingProvider
from app.ai.embeddings.nvidia_provider import NvidiaEmbeddingProvider
from app.ai.utils.errors import (
    AIConfigError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)


class _ScriptedProvider(EmbeddingProvider):
    """Raises the scripted failures in order, then returns a vector."""

    name = "scripted"
    model = "scripted-v1"
    dimensions = 3
    supports_input_type = True

    def __init__(self, failures):
        self._failures = list(failures)
        self.attempts = 0
        self.input_types: list[str | None] = []

    def embed(self, texts, *, input_type=None):
        self.attempts += 1
        self.input_types.append(input_type)
        if self._failures:
            raise self._failures.pop(0)
        return [[0.1, 0.2, 0.3] for _ in texts]


@pytest.fixture
def no_sleep(monkeypatch):
    """Record delays instead of waiting them out."""
    slept: list[float] = []
    monkeypatch.setattr(emb_service.time, "sleep", slept.append)
    return slept


@pytest.fixture
def use(monkeypatch):
    def _use(provider):
        monkeypatch.setattr(emb_service, "get_embedding_provider", lambda name=None: provider)
        return provider
    return _use


# ── 1. a 429 that resolves ──────────────────────────────────────────────────

def test_transient_429_is_retried_and_succeeds(use, no_sleep):
    prov = use(_ScriptedProvider([AIRateLimitError("429 slow down")]))

    result = emb_service.embed_texts(["hello"], input_type="query")

    assert prov.attempts == 2, "a transient 429 must cost one retry, not a failure"
    assert result.vectors == [[0.1, 0.2, 0.3]]
    assert len(no_sleep) == 1 and no_sleep[0] > 0


def test_retry_preserves_the_query_input_type(use, no_sleep):
    """A retry must not silently re-tag the text as a passage (P0-1)."""
    prov = use(_ScriptedProvider([AIRateLimitError("429")]))

    emb_service.embed_query("fastapi engineer")

    assert prov.input_types == ["query", "query"]


# ── 2. an exhausted 429 still raises, so callers can degrade ────────────────

def test_exhausted_429_raises_for_the_caller_to_degrade(use, no_sleep):
    cfg = get_ai_config()
    prov = use(_ScriptedProvider(
        [AIRateLimitError("429") for _ in range(cfg.max_rate_limit_retries + 1)]))

    with pytest.raises(AIRateLimitError):
        emb_service.embed_texts(["hello"])

    assert prov.attempts == cfg.max_rate_limit_retries + 1


def test_exhausted_429_still_degrades_talent_search_to_lexical(monkeypatch):
    """The P0-3 contract is unchanged by retries — only reached less often."""
    from app.services import talent_search as ts

    monkeypatch.setattr(emb_service.time, "sleep", lambda _s: None)

    class _EmbRepo:
        rows = [{"candidate_id": "cand-1", "campaign_id": "camp-1",
                 "embedding": [1.0, 0.0], "model": "m"}]

        def list_for_recruiter(self, campaign_id=None):
            return list(self.rows)

    class _Cand:
        id = "cand-1"
        full_name = "Asha Rao"
        campaign_id = "camp-1"
        stage = "new"
        latest_analysis = {"result": {"candidate_id": "p", "filename": "a.pdf",
                                      "name": "Asha Rao", "top_skills": ["FastAPI"]}}

    class _CandRepo:
        def list_for_campaign_with_analysis(self, campaign_id):
            return [_Cand()]

        def get_many(self, ids):
            return {"cand-1": _Cand()}

        def latest_analyses_for(self, ids):
            return {"cand-1": _Cand.latest_analysis}

    prov = _ScriptedProvider([AIRateLimitError("429") for _ in range(10)])
    monkeypatch.setattr(emb_service, "get_embedding_provider", lambda name=None: prov)

    resp = ts.search_talent("fastapi", campaign_id="camp-1",
                            candidate_repo=_CandRepo(), embedding_repo=_EmbRepo())

    assert resp.degraded is True
    assert resp.degraded_reason == "embedding_rate_limited"
    assert resp.provider == "lexical-only"
    assert resp.results, "lexical ranking still answers"


# ── 3. transient 5xx / timeout ──────────────────────────────────────────────

@pytest.mark.parametrize("exc", [
    AIProviderError("NVIDIA embedding endpoint failed (HTTP 503)."),
    AITimeoutError("NVIDIA embedding request timed out after 30s."),
])
def test_transient_server_failures_are_retried(use, no_sleep, exc):
    prov = use(_ScriptedProvider([exc]))

    result = emb_service.embed_texts(["hello"])

    assert prov.attempts == 2
    assert result.vectors


def test_network_budget_is_bounded(use, no_sleep):
    cfg = get_ai_config()
    prov = use(_ScriptedProvider([AIProviderError("HTTP 500") for _ in range(20)]))

    with pytest.raises(AIProviderError):
        emb_service.embed_texts(["hello"])

    assert prov.attempts == cfg.max_network_retries


# ── 4. permanent failures are never retried ─────────────────────────────────

def test_config_error_is_not_retried(use, no_sleep):
    prov = use(_ScriptedProvider([AIConfigError("NVIDIA_API_KEY is required")]))

    with pytest.raises(AIConfigError):
        emb_service.embed_texts(["hello"])

    assert prov.attempts == 1, "a missing credential cannot be fixed by waiting"
    assert no_sleep == []


def test_quota_exhaustion_is_not_retried(use, no_sleep):
    prov = use(_ScriptedProvider([AIRateLimitError("daily quota exceeded", is_quota=True)]))

    with pytest.raises(AIRateLimitError):
        emb_service.embed_texts(["hello"])

    assert prov.attempts == 1, "retrying a daily quota only burns more of it"
    assert no_sleep == []


def test_permanent_4xx_is_not_retried(use, no_sleep):
    permanent = AIProviderError("NVIDIA refused the embedding request (HTTP 422)")
    permanent.retryable = False
    prov = use(_ScriptedProvider([permanent]))

    with pytest.raises(AIProviderError):
        emb_service.embed_texts(["hello"])

    assert prov.attempts == 1, "a malformed request is refused identically every time"
    assert no_sleep == []


# ── 5. Retry-After is respected ─────────────────────────────────────────────

def test_retry_after_is_honoured(use, no_sleep):
    prov = use(_ScriptedProvider([AIRateLimitError("429", retry_after=2.0)]))

    emb_service.embed_texts(["hello"])

    assert prov.attempts == 2
    assert no_sleep == [2.0], "the provider stated how long to wait; wait that long"


def test_retry_after_is_capped(use, no_sleep):
    """A provider asking for ten minutes is telling us to fail, not to hang."""
    cfg = get_ai_config()
    prov = use(_ScriptedProvider([AIRateLimitError("429", retry_after=600)]))

    emb_service.embed_texts(["hello"])

    assert no_sleep == [cfg.retry_max_delay_ms / 1000.0]


def test_absent_retry_after_falls_back_to_backoff(use, no_sleep):
    cfg = get_ai_config()
    prov = use(_ScriptedProvider([AIRateLimitError("429")]))

    emb_service.embed_texts(["hello"])

    assert prov.attempts == 2
    assert 0 < no_sleep[0] <= cfg.retry_max_delay_ms / 1000.0


# ── 6. no retry storm ───────────────────────────────────────────────────────

def test_total_attempts_are_bounded_across_mixed_failures(use, no_sleep):
    """Rate-limit and network budgets are separate but both finite."""
    cfg = get_ai_config()
    ceiling = 1 + cfg.max_rate_limit_retries + cfg.max_network_retries
    prov = use(_ScriptedProvider(
        [AIRateLimitError("429"), AIProviderError("500"),
         AIRateLimitError("429"), AIProviderError("500"),
         AIRateLimitError("429"), AIProviderError("500"),
         AIProviderError("500"), AIProviderError("500")]))

    with pytest.raises(AIProviderError):
        emb_service.embed_texts(["hello"])

    assert prov.attempts <= ceiling, f"attempts {prov.attempts} exceeded the {ceiling} ceiling"
    assert len(no_sleep) < prov.attempts


def test_every_delay_respects_the_configured_cap(use, no_sleep):
    cfg = get_ai_config()
    prov = use(_ScriptedProvider([AIProviderError("500") for _ in range(20)]))

    with pytest.raises(AIProviderError):
        emb_service.embed_texts(["hello"])

    assert all(0 < d <= cfg.retry_max_delay_ms / 1000.0 for d in no_sleep)


def test_a_successful_call_never_sleeps(use, no_sleep):
    prov = use(_ScriptedProvider([]))

    emb_service.embed_texts(["hello"])

    assert prov.attempts == 1
    assert no_sleep == []


def test_empty_input_never_reaches_the_provider(use, no_sleep):
    prov = use(_ScriptedProvider([AIProviderError("500")]))

    result = emb_service.embed_texts([])

    assert prov.attempts == 0
    assert result.vectors == []


# ── the classification this ladder depends on ───────────────────────────────

class _Resp:
    def __init__(self, status_code, text="", headers=None):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {}


@pytest.fixture
def nvidia():
    return NvidiaEmbeddingProvider(api_key="test-key", model="nvidia/test-embed")


@pytest.mark.parametrize("status", [500, 502, 503, 504])
def test_nvidia_5xx_is_classified_retryable(nvidia, status):
    with pytest.raises(AIProviderError) as caught:
        nvidia._raise_for_status(_Resp(status, "upstream failure"))
    assert caught.value.retryable is True


@pytest.mark.parametrize("status", [400, 404, 422])
def test_nvidia_permanent_4xx_is_classified_non_retryable(nvidia, status):
    """An unknown model or malformed field fails identically every time —
    retrying turns one clear error into three, more slowly."""
    with pytest.raises(AIProviderError) as caught:
        nvidia._raise_for_status(_Resp(status, "model not found"))
    assert caught.value.retryable is False


@pytest.mark.parametrize("status", [401, 403])
def test_nvidia_auth_failure_is_a_config_error(nvidia, status):
    with pytest.raises(AIConfigError) as caught:
        nvidia._raise_for_status(_Resp(status, "invalid key"))
    assert caught.value.retryable is False


def test_nvidia_429_carries_retry_after_and_quota_flag(nvidia):
    with pytest.raises(AIRateLimitError) as caught:
        nvidia._raise_for_status(_Resp(429, "slow down", {"retry-after": "3"}))
    assert caught.value.retry_after == 3.0
    assert caught.value.is_quota is False
    assert caught.value.retryable is True

    with pytest.raises(AIRateLimitError) as quota:
        nvidia._raise_for_status(_Resp(429, "you have exceeded your monthly quota"))
    assert quota.value.is_quota is True
    assert quota.value.retryable is False
