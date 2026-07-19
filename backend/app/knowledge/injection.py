"""
AI memory injection.

The shared way every AI capability receives relevant organizational memory BEFORE
reasoning: `memory_block(org_id, query)` returns a labelled context block of the
most relevant remembered facts (each tagged with source, date, confidence for
explainability) plus a structured sources list. Best-effort — returns empty when
there is no org context or no relevant memory, so it never breaks a capability.

No AI capability implements its own memory; they all call this.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.knowledge import service

logger = logging.getLogger(__name__)


def memory_block(org_id: Optional[str], query: str, *, limit: int = 5) -> tuple[str, list[dict]]:
    if not org_id or not (query or "").strip():
        return "", []
    try:
        hits = service.retrieve(org_id, query, limit=limit)
    except Exception as exc:  # pragma: no cover
        logger.debug("memory_block skipped: %s", exc)
        return "", []
    if not hits:
        return "", []

    lines = ["### Organizational Memory (long-term knowledge — prefer this over generic assumptions)"]
    sources: list[dict] = []
    for h in hits:
        when = (h.get("occurred_at") or "")[:10]
        tag = f"[{h.get('source', 'memory')} · {when} · {h.get('confidence', 60)}%]"
        lines.append(f"- {h.get('value_text', '')} {tag}")
        sources.append({
            "source": h.get("source", "memory"), "when": when,
            "confidence": h.get("confidence", 60), "why": h.get("_why", []),
            "entities": [e.get("name") for e in (h.get("entities") or []) if isinstance(e, dict)],
            "statement": h.get("value_text", ""),
        })
    return "\n".join(lines) + "\n\n", sources
