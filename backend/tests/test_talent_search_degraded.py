"""
An embedding provider failure must degrade Talent Search, not break it (P0-3).

`/search/talent` spends at NVIDIA on every call, and the embedding path has no
retry: a single 429 or timeout used to propagate out of `embed_texts` and turn
the whole search into a 5xx. That is a needless outage — the hybrid scorer gives
the lexical half 0.72 of the weight, so it can still answer usefully without any
vector at all.

What must NOT happen while degrading:
  * falling back to the hashing provider or another vendor (a vector from a
    different model lands in a different space — worse than no vector);
  * writing anything to the embedding store;
  * widening the result set beyond the recruiter's own candidates;
  * reporting the result as though semantic ranking had run.
"""

from __future__ import annotations

import pytest

from app.ai.utils.errors import (
    AIConfigError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)
from app.services import talent_search as ts


class _FakeEmbeddingRepo:
    """Recruiter-scoped store double. Records every write attempt."""

    def __init__(self, rows=None):
        self.rows = rows if rows is not None else [
            {"candidate_id": "cand-1", "campaign_id": "camp-1",
             "embedding": [1.0, 0.0], "model": "m"},
            {"candidate_id": "cand-2", "campaign_id": "camp-1",
             "embedding": [0.0, 1.0], "model": "m"},
        ]
        self.writes: list[tuple] = []

    def list_for_recruiter(self, campaign_id=None):
        # Mirrors the real repo: recruiter-scoped, optionally campaign-scoped.
        if campaign_id:
            return [r for r in self.rows if r.get("campaign_id") == campaign_id]
        return list(self.rows)

    def get_meta(self, candidate_id):
        return None

    def upsert(self, *args, **kwargs):  # pragma: no cover - must never be called
        self.writes.append((args, kwargs))
        return {}


def _analysis(name, skills):
    return {"result": {
        "candidate_id": "p", "filename": f"{name}.pdf",
        "name": name, "top_skills": skills, "summary": f"{name} profile",
    }}


class _Cand:
    def __init__(self, cid, name, skills, campaign_id="camp-1"):
        self.id = cid
        self.full_name = name
        self.campaign_id = campaign_id
        self.stage = "new"
        self.latest_analysis = _analysis(name, skills)


_CANDIDATES = [
    _Cand("cand-1", "Asha Rao", ["FastAPI", "PostgreSQL"]),
    _Cand("cand-2", "Bo Lin", ["Figma", "Illustrator"]),
]


class _FakeCandidateRepo:
    def list_for_campaign_with_analysis(self, campaign_id):
        return [c for c in _CANDIDATES if c.campaign_id == campaign_id]

    def get_many(self, ids):
        return {c.id: c for c in _CANDIDATES if c.id in set(ids)}

    def latest_analyses_for(self, ids):
        return {c.id: c.latest_analysis for c in _CANDIDATES if c.id in set(ids)}


@pytest.fixture
def repos():
    return _FakeCandidateRepo(), _FakeEmbeddingRepo()


def _search(repos, **kwargs):
    candidate_repo, embedding_repo = repos
    return ts.search_talent(
        "fastapi backend engineer",
        campaign_id="camp-1",
        candidate_repo=candidate_repo,
        embedding_repo=embedding_repo,
        **kwargs,
    )


def _fail_embedding(monkeypatch, exc):
    def _boom(_text, **_kwargs):
        raise exc
    monkeypatch.setattr(ts, "embed_query", _boom)


# ── the healthy path still works ────────────────────────────────────────────

def test_semantic_and_lexical_search_succeeds(monkeypatch, repos):
    monkeypatch.setattr(ts, "embed_query", lambda _t, **_k: [1.0, 0.0])
    monkeypatch.setattr(ts, "active_embedding_model", lambda: "nvidia:model-x")

    resp = _search(repos)

    assert resp.degraded is False
    assert resp.degraded_reason is None
    assert resp.provider == "hybrid+nvidia:model-x"
    assert [r.candidate_id for r in resp.results][0] == "cand-1", (
        "the FastAPI candidate should outrank the designer"
    )


# ── failures degrade instead of raising ─────────────────────────────────────

@pytest.mark.parametrize(
    ("exc", "reason"),
    [
        (AIRateLimitError("429 from provider"), "embedding_rate_limited"),
        (AITimeoutError("timed out after 30s"), "embedding_timeout"),
        (AIConfigError("NVIDIA_API_KEY is required"), "embedding_unconfigured"),
        (AIProviderError("HTTP 503"), "embedding_unavailable"),
    ],
)
def test_embedding_failure_falls_back_to_lexical(monkeypatch, repos, exc, reason):
    _fail_embedding(monkeypatch, exc)

    resp = _search(repos)

    assert resp.degraded is True
    assert resp.degraded_reason == reason
    assert resp.results, "lexical ranking should still answer without a vector"
    assert resp.results[0].candidate_id == "cand-1"


def test_degraded_response_does_not_claim_semantic_ranking(monkeypatch, repos):
    _fail_embedding(monkeypatch, AIRateLimitError("429"))

    resp = _search(repos)

    assert resp.provider == "lexical-only"
    assert "hybrid" not in resp.provider
    assert "nvidia" not in resp.provider


def test_degraded_mode_writes_no_vectors(monkeypatch, repos):
    _fail_embedding(monkeypatch, AITimeoutError("timeout"))
    _candidate_repo, embedding_repo = repos

    _search(repos)

    assert embedding_repo.writes == [], (
        "a failed embedding must never result in a stored vector"
    )


def test_degraded_mode_never_falls_back_to_another_provider(monkeypatch, repos):
    """The degraded path must not reach the embedding layer a second time."""
    calls: list[str] = []

    def _boom(text, **_kwargs):
        calls.append(text)
        raise AIRateLimitError("429")

    monkeypatch.setattr(ts, "embed_query", _boom)

    _search(repos)

    assert len(calls) == 1, "a retry through a different provider is not a fallback we allow"


def test_degraded_mode_preserves_filters(monkeypatch, repos):
    from app.schemas.search import SearchFilters

    _fail_embedding(monkeypatch, AIRateLimitError("429"))

    resp = _search(repos, filters=SearchFilters(min_score=95))

    assert resp.results == [], "filters must still apply when ranking is degraded"


def test_degraded_mode_exposes_no_foreign_candidates(monkeypatch, repos):
    """The degraded pool comes from the same recruiter-scoped read as the vector
    store, so another recruiter's rows can never enter it."""
    _fail_embedding(monkeypatch, AIRateLimitError("429"))
    candidate_repo, embedding_repo = repos
    # A row the recruiter-scoped repo would never return, planted to prove the
    # degraded path reads through the repo rather than around it.
    foreign = {"candidate_id": "other-recruiter-cand", "campaign_id": "other-camp",
               "embedding": [1.0, 0.0], "model": "m"}
    embedding_repo.rows.append(foreign)

    resp = ts.search_talent(
        "fastapi backend engineer", campaign_id="camp-1", limit=50,
        candidate_repo=candidate_repo, embedding_repo=embedding_repo,
    )

    ids = {r.candidate_id for r in resp.results}
    assert "other-recruiter-cand" not in ids
    assert ids <= {"cand-1", "cand-2"}


def test_auto_index_failure_does_not_break_the_search(monkeypatch):
    """A provider outage during lazy indexing degrades too — it must not 5xx."""
    empty_repo = _FakeEmbeddingRepo(rows=[])

    def _boom(*_a, **_k):
        raise AIRateLimitError("429")

    monkeypatch.setattr(ts, "reindex_campaign", _boom)
    monkeypatch.setattr(ts, "embed_query", lambda _t, **_k: (_ for _ in ()).throw(AIRateLimitError("429")))

    resp = ts.search_talent(
        "fastapi", campaign_id="camp-1",
        candidate_repo=_FakeCandidateRepo(), embedding_repo=empty_repo,
    )

    assert resp.degraded is True
    assert resp.indexed == 0
    assert empty_repo.writes == []
