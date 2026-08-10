"""
A stored analysis and its embedding must not drift apart (P0-2).

THE FAILURE THIS EXISTS TO CATCH
--------------------------------
Embeddings were only ever built by an explicit reindex, or by the first search of
a campaign that had NO vectors at all (`talent_search.search_talent` gates its
lazy index on `not embedding_repo.list_for_recruiter(campaign_id)`). So once a
campaign had been indexed even once:

  * every candidate persisted afterwards had no vector and was INVISIBLE to
    `/search/talent` — the search returned 200 and simply never mentioned them;
  * any candidate whose analysis was rewritten kept serving its old vector.

Neither raises. The fix re-uses the existing content-hash + model gate in
`ensure_candidate_embedding` rather than adding a second invalidation mechanism,
so the cost of the common case (nothing changed) stays at one metadata read.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.ai.utils.errors import AIRateLimitError
from app.schemas.batch import BatchAnalysisResponse, CandidateResult
from app.services import embedding_pipeline as pipeline
from app.services.persistence_service import PersistenceService


# ── doubles ─────────────────────────────────────────────────────────────────

class _FakeEmbeddingRepo:
    def __init__(self, meta=None):
        self._meta = meta or {}
        self.upserts: list[dict] = []

    def get_meta(self, candidate_id):
        return self._meta.get(candidate_id)

    def upsert(self, candidate_id, campaign_id, *, embedding, content_hash, model, dimensions):
        row = {
            "candidate_id": candidate_id, "campaign_id": campaign_id,
            "content_hash": content_hash, "model": model,
            "dimensions": dimensions, "embedding": embedding,
        }
        self.upserts.append(row)
        self._meta[candidate_id] = row
        return row


class _Campaign:
    job_description = "Backend engineer"


class _CampaignRepo:
    def get(self, campaign_id):
        return _Campaign()

    def update(self, *_a, **_k):  # pragma: no cover - JD already present
        raise AssertionError("campaign should not be updated in these tests")


class _StoredCandidate:
    def __init__(self, cid):
        self.id = cid
        self.campaign_id = "camp-1"
        self.resume_filename = None


class _CandidateRepo:
    def __init__(self):
        self.analyses: list[tuple[str, dict]] = []
        self._n = 0

    def uploads_table_available(self):
        return True

    def existing_upload_hashes(self, campaign_id):
        return set()

    def list_for_campaign(self, campaign_id):
        return []

    def create(self, **_kwargs):
        self._n += 1
        return _StoredCandidate(f"cand-{self._n}")

    def record_upload(self, **_kwargs):
        return True

    def add_analysis(self, candidate_id, campaign_id, payload, *, analysis_version="v1.0"):
        self.analyses.append((candidate_id, payload))
        return {}


class _ActivityRepo:
    def record(self, *_a, **_k):
        return None


def _result(name="Asha Rao", skills=("FastAPI", "PostgreSQL")):
    return CandidateResult(
        candidate_id="p1", filename=f"{name}.pdf", status="success",
        file_hash=f"hash-of-{name}", name=name,
        summary=f"{name} is a backend engineer.", top_skills=list(skills),
    )


@pytest.fixture
def stub_embed(monkeypatch):
    """Deterministic vectors, and a count of how often the provider was hit."""
    calls: list[str] = []

    class _Res:
        vectors = [[0.1, 0.2, 0.3]]
        dimensions = 3

    def _embed(texts, **_kwargs):
        calls.append(texts[0])
        return _Res()

    monkeypatch.setattr(pipeline, "embed_texts", _embed)
    monkeypatch.setattr(pipeline, "active_embedding_model", lambda: "nvidia:model-x")
    return calls


# ── 1. unchanged profile → no re-embed ──────────────────────────────────────

def test_unchanged_profile_is_not_re_embedded(stub_embed):
    result = _result()
    repo = _FakeEmbeddingRepo()

    first = pipeline.ensure_candidate_embedding(
        "cand-1", "camp-1", result, embedding_repo=repo)
    second = pipeline.ensure_candidate_embedding(
        "cand-1", "camp-1", result, embedding_repo=repo)

    assert first is True
    assert second is False, "an unchanged profile must not be re-embedded"
    assert len(stub_embed) == 1, "the provider must be called once, not twice"
    assert len(repo.upserts) == 1


# ── 2. changed profile → re-embed ───────────────────────────────────────────

def test_changed_profile_is_re_embedded(stub_embed):
    repo = _FakeEmbeddingRepo()
    pipeline.ensure_candidate_embedding(
        "cand-1", "camp-1", _result(skills=("FastAPI",)), embedding_repo=repo)

    changed = pipeline.ensure_candidate_embedding(
        "cand-1", "camp-1", _result(skills=("FastAPI", "Kubernetes")),
        embedding_repo=repo)

    assert changed is True, "a changed profile must produce a new vector"
    assert len(repo.upserts) == 2
    assert repo.upserts[0]["content_hash"] != repo.upserts[1]["content_hash"]


def test_model_change_alone_re_embeds(monkeypatch, stub_embed):
    """The same gate covers a provider/model swap — stale rows get rewritten."""
    repo = _FakeEmbeddingRepo()
    pipeline.ensure_candidate_embedding("cand-1", "camp-1", _result(), embedding_repo=repo)

    monkeypatch.setattr(pipeline, "active_embedding_model", lambda: "nvidia:model-y")
    again = pipeline.ensure_candidate_embedding(
        "cand-1", "camp-1", _result(), embedding_repo=repo)

    assert again is True
    assert repo.upserts[-1]["model"] == "nvidia:model-y"


# ── the persistence path now closes the gap ─────────────────────────────────

def _persist(embedding_repo, results):
    candidates = _CandidateRepo()
    service = PersistenceService(
        _CampaignRepo(), candidates, _ActivityRepo(), embedding_repo=embedding_repo)
    batch = BatchAnalysisResponse(job_description="Backend engineer", candidates=results)
    stored = service.persist_batch("camp-1", batch)
    return stored, candidates


def test_persisting_an_analysis_indexes_it_for_search(stub_embed):
    repo = _FakeEmbeddingRepo()

    stored, _candidates = _persist(repo, [_result()])

    assert len(stored) == 1
    assert [u["candidate_id"] for u in repo.upserts] == ["cand-1"], (
        "a candidate persisted into an already-indexed campaign must be embedded "
        "at write time, or semantic search will never see them"
    )


def test_persisting_does_not_re_embed_unchanged_candidates(stub_embed):
    """The content-hash gate still decides; persistence does not force anything."""
    result = _result()
    repo = _FakeEmbeddingRepo()
    _persist(repo, [result])
    assert len(stub_embed) == 1

    # The same profile arriving again (a replayed batch) costs no vendor call.
    pipeline.ensure_candidate_embedding("cand-1", "camp-1", result, embedding_repo=repo)
    assert len(stub_embed) == 1


def test_failed_candidates_are_never_embedded(stub_embed):
    repo = _FakeEmbeddingRepo()
    failed = CandidateResult(
        candidate_id="p2", filename="broken.pdf", status="failed", error="unreadable")

    stored, _candidates = _persist(repo, [failed])

    assert stored == []
    assert repo.upserts == []
    assert stub_embed == []


def test_embedding_failure_does_not_fail_the_persist(monkeypatch):
    """The batch is already durable — a 429 must not turn it into a 5xx."""
    def _boom(*_a, **_k):
        raise AIRateLimitError("429")

    monkeypatch.setattr(pipeline, "embed_texts", _boom)
    monkeypatch.setattr(pipeline, "active_embedding_model", lambda: "nvidia:model-x")
    repo = _FakeEmbeddingRepo()

    stored, candidates = _persist(repo, [_result(), _result(name="Bo Lin")])

    assert len(stored) == 2, "persistence must survive an embedding provider outage"
    assert len(candidates.analyses) == 2
    assert repo.upserts == [], "no vector may be written when embedding fails"


def test_persistence_without_an_embedding_repo_is_unchanged(stub_embed):
    """Callers that pass no embedding repo behave exactly as before."""
    candidates = _CandidateRepo()
    service = PersistenceService(_CampaignRepo(), candidates, _ActivityRepo())

    stored = service.persist_batch(
        "camp-1", BatchAnalysisResponse(job_description="Backend engineer",
                                        candidates=[_result()]))

    assert len(stored) == 1
    assert stub_embed == []


# ── 3. deleted candidate → embedding removed ────────────────────────────────

_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase" / "migrations" / "0006_candidate_embeddings.sql"
)


def test_candidate_deletion_cascades_to_the_embedding():
    """Deletion cleanup is the database's job, and must stay that way.

    Asserted against the migration rather than a live database: the guarantee IS
    the foreign key. If someone drops `on delete cascade`, deleted candidates
    keep a vector that still matches queries and can resurface a candidate the
    recruiter believes is gone — with no application code to blame.
    """
    sql = " ".join(_MIGRATION.read_text(encoding="utf-8").split()).lower()

    assert "candidate_id" in sql
    assert "references public.candidates(id) on delete cascade" in sql, (
        "candidate_embeddings.candidate_id must cascade on candidate deletion"
    )
    assert "references public.campaigns(id) on delete cascade" in sql
    assert "references public.recruiters(id) on delete cascade" in sql
