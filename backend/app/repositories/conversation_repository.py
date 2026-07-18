"""Copilot conversation + message persistence."""

from __future__ import annotations

from typing import Any, Optional

from app.repositories.base import BaseRepository
from app.schemas.campaign import CopilotConversation, CopilotMessageRecord


class ConversationRepository(BaseRepository):
    table_name = "copilot_conversations"

    def get_or_create(
        self,
        candidate_id: str,
        campaign_id: str,
        *,
        conversation_id: Optional[str] = None,
        title: str = "New conversation",
    ) -> CopilotConversation:
        if conversation_id:
            try:
                resp = self._scoped().eq("id", conversation_id).limit(1).execute()
            except Exception as exc:  # pragma: no cover
                raise self._wrap(exc, "get conversation")
            rows = self._rows(resp)
            if rows:
                return CopilotConversation(**rows[0])
        row = {
            "candidate_id": candidate_id,
            "campaign_id": campaign_id,
            "recruiter_id": self.recruiter_id,
            "title": title,
        }
        try:
            resp = self._table.insert(row).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "create conversation")
        return CopilotConversation(**self._one_or_404(resp, "Conversation"))

    def list_for_candidate(self, candidate_id: str) -> list[CopilotConversation]:
        try:
            resp = (
                self._scoped()
                .eq("candidate_id", candidate_id)
                .order("updated_at", desc=True)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list conversations")
        return [CopilotConversation(**r) for r in self._rows(resp)]

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[dict[str, Any]] = None,
    ) -> CopilotMessageRecord:
        row = {
            "conversation_id": conversation_id,
            "recruiter_id": self.recruiter_id,
            "role": role,
            "content": content,
            "metadata": metadata or {},
        }
        try:
            resp = self._client.table("copilot_messages").insert(row).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "add message")
        return CopilotMessageRecord(**self._one_or_404(resp, "Message"))

    def list_messages(self, conversation_id: str) -> list[CopilotMessageRecord]:
        try:
            resp = (
                self._client.table("copilot_messages")
                .select("*")
                .eq("recruiter_id", self.recruiter_id)
                .eq("conversation_id", conversation_id)
                .order("created_at", desc=False)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list messages")
        return [CopilotMessageRecord(**r) for r in self._rows(resp)]
