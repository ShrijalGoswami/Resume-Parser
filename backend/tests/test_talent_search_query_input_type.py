"""
Talent Search must embed the query AS A QUERY (P0-1).

NVIDIA retrieval models project a QUERY and a PASSAGE into the same space with
different heads. Embedding a search query with `input_type="passage"` does not
raise — the vector simply lands in the wrong part of the space and every cosine
gets quietly worse. The embedding audit found `/search/talent` calling
`embed_texts([query])` with no input type, which defaults to `passage`, while
`embed_query()` (the API written to carry the distinction) had zero call sites.

These tests pin the wiring, not the provider: they assert the search path reaches
the provider with `input_type="query"`, which is the only observable that
distinguishes the bug from the fix.
"""

from __future__ import annotations

import pytest

from app.ai.embeddings import registry as emb_registry
from app.ai.embeddings.base import EmbeddingProvider
from app.services import talent_search as ts


class _RecordingProvider(EmbeddingProvider):
    """Asymmetric provider double — records how each call was tagged."""

    name = "recording"
    model = "recording-v1"
    dimensions = 4
    supports_input_type = True

    def __init__(self):
        self.calls: list[tuple[list[str], str | None]] = []

    def embed(self, texts, *, input_type=None):
        self.calls.append((list(texts), input_type))
        return [[1.0, 0.0, 0.0, 0.0] for _ in texts]


class _FakeEmbeddingRepo:
    """One indexed candidate, so the search has something to rank."""

    def __init__(self):
        self.rows = [{
            "candidate_id": "cand-1",
            "campaign_id": "camp-1",
            "embedding": [1.0, 0.0, 0.0, 0.0],
            "model": "recording:recording-v1",
        }]

    def list_for_recruiter(self, campaign_id=None):
        return list(self.rows)


class _Cand:
    id = "cand-1"
    full_name = "Asha Rao"
    campaign_id = "camp-1"
    stage = "new"
    latest_analysis = {"result": {
        "candidate_id": "p1", "filename": "asha.pdf",
        "name": "Asha Rao", "top_skills": ["FastAPI"],
    }}


class _FakeCandidateRepo:
    def list_for_campaign_with_analysis(self, campaign_id):
        return [_Cand()]

    def get_many(self, ids):
        return {"cand-1": _Cand()}

    def latest_analyses_for(self, ids):
        return {"cand-1": _Cand.latest_analysis}


@pytest.fixture
def provider(monkeypatch):
    """Force the recording provider to be the active one for this test."""
    prov = _RecordingProvider()
    monkeypatch.setattr(
        emb_registry, "get_embedding_provider", lambda name=None: prov
    )
    monkeypatch.setattr(
        "app.ai.embeddings.service.get_embedding_provider", lambda name=None: prov
    )
    return prov


def _search(**kwargs):
    return ts.search_talent(
        "senior fastapi engineer",
        campaign_id="camp-1",
        candidate_repo=_FakeCandidateRepo(),
        embedding_repo=_FakeEmbeddingRepo(),
        **kwargs,
    )


def test_query_is_embedded_with_query_input_type(provider):
    _search()

    assert provider.calls, "the search never embedded the query"
    texts, input_type = provider.calls[0]
    assert texts == ["senior fastapi engineer"]
    assert input_type == "query", (
        "the search query must reach the provider as input_type='query'; "
        f"got {input_type!r} — an asymmetric model would rank against the wrong space"
    )


def test_query_is_never_embedded_as_a_passage(provider):
    _search()

    assert all(it != "passage" for _texts, it in provider.calls), (
        "a search query tagged 'passage' silently degrades every ranking"
    )


def test_successful_search_reports_the_semantic_provider(provider):
    resp = _search()

    assert resp.degraded is False
    assert resp.degraded_reason is None
    assert resp.provider == "hybrid+recording:recording-v1"
    assert resp.count == 1
