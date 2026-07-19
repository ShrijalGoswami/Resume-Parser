"""Knowledge Store — organization-scoped persistence of items + edges."""

from __future__ import annotations

from typing import Any, Optional

from app.db.supabase_client import get_service_client
from app.knowledge.models import KnowledgeEdge, KnowledgeItem


class KnowledgeStore:
    def __init__(self, organization_id: str):
        self._c = get_service_client()
        self.org_id = organization_id

    @staticmethod
    def _rows(resp: Any) -> list[dict]:
        data = getattr(resp, "data", None)
        return data if isinstance(data, list) else ([] if data is None else [data])

    def _t(self, name: str):
        return self._c.table(name)

    def add(self, items: list[KnowledgeItem], edges: list[KnowledgeEdge], *, source_id: str = "") -> int:
        """Incremental: skip items already recorded for this (source, source_id)."""
        if not items and not edges:
            return 0
        existing_keys: set[str] = set()
        if source_id:
            rows = self._rows(self._t("knowledge_items").select("subject,predicate,value_text")
                              .eq("organization_id", self.org_id).eq("source_id", source_id).limit(200).execute())
            existing_keys = {f"{r.get('subject','')}|{r.get('predicate','')}|{r.get('value_text','')}".lower() for r in rows}

        payload = []
        seen: set[str] = set()
        inserted_items: list[dict] = []
        for it in items:
            key = f"{it.subject}|{it.predicate}|{it.value_text}".lower()
            if key in existing_keys or key in seen:
                continue
            seen.add(key)
            payload.append({
                "organization_id": self.org_id, "kind": it.kind, "subject": it.subject,
                "predicate": it.predicate, "object": it.object, "value_text": it.value_text,
                "confidence": it.confidence, "source": it.source, "source_id": source_id or it.source_id,
                "entities": it.entities, "metadata": it.metadata,
            })
        if payload:
            inserted_items = self._rows(self._t("knowledge_items").insert(payload).execute())

        if edges:
            edge_rows = [{"organization_id": self.org_id, "source_type": e.source_type, "source_name": e.source_name,
                          "relation": e.relation, "target_type": e.target_type, "target_name": e.target_name,
                          "weight": e.weight} for e in edges]
            try:
                self._t("knowledge_edges").insert(edge_rows).execute()
            except Exception:
                pass
        return len(inserted_items)

    def all_active(self, limit: int = 1000) -> list[dict]:
        return self._rows(self._t("knowledge_items").select("*").eq("organization_id", self.org_id)
                          .eq("status", "active").order("occurred_at", desc=True).limit(limit).execute())

    def list_items(self, *, kind: Optional[str] = None, source: Optional[str] = None,
                   status: str = "active", limit: int = 200) -> list[dict]:
        q = self._t("knowledge_items").select("*").eq("organization_id", self.org_id)
        if status:
            q = q.eq("status", status)
        if kind:
            q = q.eq("kind", kind)
        if source:
            q = q.eq("source", source)
        return self._rows(q.order("occurred_at", desc=True).limit(limit).execute())

    def list_edges(self, limit: int = 2000) -> list[dict]:
        return self._rows(self._t("knowledge_edges").select("*").eq("organization_id", self.org_id).limit(limit).execute())

    def source_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for r in self.list_items(status="active", limit=1000):
            counts[r.get("source", "")] = counts.get(r.get("source", ""), 0) + 1
        return counts

    def set_status(self, item_id: str, status: str) -> dict:
        rows = self._rows(self._t("knowledge_items").update({"status": status})
                          .eq("organization_id", self.org_id).eq("id", item_id).execute())
        return rows[0] if rows else {}

    def correct(self, item_id: str, *, value_text: Optional[str] = None, confidence: Optional[int] = None) -> dict:
        patch: dict[str, Any] = {}
        if value_text is not None:
            patch["value_text"] = value_text
        if confidence is not None:
            patch["confidence"] = confidence
        rows = self._rows(self._t("knowledge_items").update(patch)
                          .eq("organization_id", self.org_id).eq("id", item_id).execute()) if patch else []
        return rows[0] if rows else {}
