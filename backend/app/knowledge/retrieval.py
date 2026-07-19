"""
Knowledge Index + Retrieval + Scoring.

Explainable relevance ranking over structured memory: keyword + entity overlap,
weighted by confidence and recency decay. Returns each memory with a score AND the
reasons it was selected (so every remembered fact used by AI is traceable). Pure —
operates over item dicts supplied by the store, no DB/network.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

_WORD = re.compile(r"[a-z0-9+#.]{2,}")
_STOP = frozenset("the a an and or of to in on for with is are was were this that our we you they".split())
HALF_LIFE_DAYS = 180


def tokens(text: str) -> set[str]:
    return {w for w in _WORD.findall((text or "").lower()) if w not in _STOP}


def recency_decay(occurred_at: Any) -> float:
    if not occurred_at:
        return 0.5
    try:
        dt = occurred_at if isinstance(occurred_at, datetime) else datetime.fromisoformat(str(occurred_at).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (datetime.now(timezone.utc) - dt).total_seconds() / 86400)
        return 0.5 ** (age_days / HALF_LIFE_DAYS)
    except Exception:
        return 0.5


def _item_tokens(item: dict) -> set[str]:
    parts = [item.get("value_text", ""), item.get("subject", ""), item.get("object", "")]
    ents = " ".join(e.get("name", "") for e in (item.get("entities") or []) if isinstance(e, dict))
    parts.append(ents)
    return tokens(" ".join(parts))


def score_item(item: dict, query_tokens: set[str]) -> tuple[float, list[str]]:
    it_tokens = _item_tokens(item)
    ent_names = {(e.get("name") or "").lower() for e in (item.get("entities") or []) if isinstance(e, dict)}
    overlap = query_tokens & it_tokens
    entity_hits = {q for q in query_tokens if any(q in name for name in ent_names)}
    confidence = (item.get("confidence", 60) or 60) / 100.0
    decay = recency_decay(item.get("occurred_at"))
    base = len(overlap) + 2 * len(entity_hits)
    score = base * confidence * (0.4 + 0.6 * decay)
    reasons: list[str] = []
    if overlap:
        reasons.append(f"matched: {', '.join(sorted(overlap)[:5])}")
    if entity_hits:
        reasons.append(f"entities: {', '.join(sorted(entity_hits)[:3])}")
    reasons.append(f"confidence {item.get('confidence', 60)}%")
    reasons.append("recent" if decay > 0.6 else "aging" if decay > 0.25 else "old")
    return score, reasons


def retrieve(items: list[dict], query: str, *, limit: int = 6, min_score: float = 0.1) -> list[dict]:
    """Return the top-K relevant, active memories with score + why."""
    q = tokens(query)
    if not q:
        return []
    scored = []
    for it in items:
        if it.get("status") not in (None, "active"):
            continue
        score, reasons = score_item(it, q)
        if score >= min_score:
            scored.append({**it, "_score": round(score, 3), "_why": reasons})
    scored.sort(key=lambda x: x["_score"], reverse=True)
    return scored[:limit]
