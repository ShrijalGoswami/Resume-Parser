"""Core knowledge types (structured memory + graph edges)."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class KnowledgeItem:
    """One structured piece of organizational memory."""
    kind: str = "fact"                 # fact | preference | decision | outcome | pattern
    value_text: str = ""               # human-readable statement (what is remembered)
    subject: str = ""
    predicate: str = ""
    object: str = ""
    confidence: int = 60               # 0–100
    source: str = ""                   # copilot | comparison | interview | report | agent | note | decision | workflow
    source_id: str = ""
    entities: list[dict] = field(default_factory=list)   # [{type, name}]
    metadata: dict = field(default_factory=dict)
    occurred_at: Optional[str] = None

    def dedupe_key(self) -> str:
        raw = f"{self.kind}|{self.source}|{self.subject}|{self.predicate}|{self.object}|{self.value_text}".lower()
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


@dataclass
class KnowledgeEdge:
    source_type: str
    source_name: str
    relation: str
    target_type: str
    target_name: str
    weight: int = 1


def entity(kind: str, name: str) -> dict:
    return {"type": kind, "name": name}
