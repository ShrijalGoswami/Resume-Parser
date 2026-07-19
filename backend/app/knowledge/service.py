"""
Knowledge service (product layer).

Public API: ingest (incremental extraction → store), retrieve (explainable memory),
timeline, skill evolution, preferences, graph traversal, and lifecycle governance
(invalidate / archive / merge / correct). Independent of the AI gateway.

A short-lived in-process cache avoids re-reading an org's memory on every AI call.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

from app.knowledge import extractor, retrieval, timeline as tl
from app.knowledge.graph import KnowledgeGraph
from app.knowledge.store import KnowledgeStore

logger = logging.getLogger(__name__)

_CACHE_TTL = 60  # seconds
_cache: dict[str, tuple[float, list[dict]]] = {}


def _active_items(org_id: str) -> list[dict]:
    hit = _cache.get(org_id)
    now = time.time()
    if hit and now - hit[0] < _CACHE_TTL:
        return hit[1]
    items = KnowledgeStore(org_id).all_active()
    _cache[org_id] = (now, items)
    return items


def _invalidate_cache(org_id: str) -> None:
    _cache.pop(org_id, None)


# ── Ingestion ────────────────────────────────────────────────────────────────
def ingest(org_id: str, source: str, *, source_id: str = "", **payload: Any) -> int:
    items, edges = extractor.extract(source, **payload)
    if not items and not edges:
        return 0
    n = KnowledgeStore(org_id).add(items, edges, source_id=source_id)
    if n:
        _invalidate_cache(org_id)
    return n


def safe_ingest(org_id: Optional[str], source: str, *, source_id: str = "", **payload: Any) -> None:
    """Never raises — knowledge ingestion must not affect the user's action."""
    if not org_id:
        return
    try:
        ingest(org_id, source, source_id=source_id, **payload)
    except Exception as exc:  # pragma: no cover
        logger.debug("Knowledge ingest skipped (%s): %s", source, exc)


# ── Retrieval ────────────────────────────────────────────────────────────────
def retrieve(org_id: str, query: str, *, limit: int = 6) -> list[dict]:
    return retrieval.retrieve(_active_items(org_id), query, limit=limit)


# ── Temporal / preferences / graph ──────────────────────────────────────────
def timeline(org_id: str, months: int = 6) -> list[dict]:
    return tl.timeline(_active_items(org_id), months=months)


def skill_evolution(org_id: str) -> list[dict]:
    return tl.skill_evolution(_active_items(org_id))


def preferences(org_id: str) -> dict:
    return tl.derive_preferences(_active_items(org_id))


def graph_traverse(org_id: str, entity: str, depth: int = 2) -> dict:
    g = KnowledgeGraph(KnowledgeStore(org_id).list_edges())
    result = g.traverse(entity, depth) if entity else {"nodes": [], "edges": []}
    result["summary"] = g.summary()
    return result


# ── Lifecycle governance ─────────────────────────────────────────────────────
def invalidate(org_id: str, item_id: str) -> dict:
    _invalidate_cache(org_id)
    return KnowledgeStore(org_id).set_status(item_id, "invalidated")


def archive(org_id: str, item_id: str) -> dict:
    _invalidate_cache(org_id)
    return KnowledgeStore(org_id).set_status(item_id, "archived")


def correct(org_id: str, item_id: str, *, value_text: Optional[str] = None, confidence: Optional[int] = None) -> dict:
    _invalidate_cache(org_id)
    return KnowledgeStore(org_id).correct(item_id, value_text=value_text, confidence=confidence)


def merge(org_id: str, keep_id: str, duplicate_id: str) -> dict:
    """Conflict resolution / duplicate merging: archive the duplicate, keep the canonical."""
    _invalidate_cache(org_id)
    KnowledgeStore(org_id).set_status(duplicate_id, "archived")
    return {"kept": keep_id, "merged": duplicate_id}


def source_counts(org_id: str) -> dict:
    return KnowledgeStore(org_id).source_counts()


def list_items(org_id: str, **kw: Any) -> list[dict]:
    return KnowledgeStore(org_id).list_items(**kw)
