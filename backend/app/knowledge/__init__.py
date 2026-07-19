"""
Organizational Knowledge Layer (V7 / Sprint 12).

Persistent, org-scoped, time-aware recruiting memory that every AI capability
retrieves before reasoning. Independent of the AI gateway (it may reuse embeddings
but the gateway never depends on it).

    from app.knowledge.injection import memory_block
    from app.knowledge import service as knowledge
"""

from app.knowledge.models import KnowledgeItem, KnowledgeEdge, entity

__all__ = ["KnowledgeItem", "KnowledgeEdge", "entity"]
