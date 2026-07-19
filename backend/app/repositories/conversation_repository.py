"""Copilot conversation + message persistence."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from app.repositories.base import BaseRepository
from app.schemas.campaign import CopilotConversation, CopilotMessageRecord


class ConversationRepository(BaseRepository):
    table_name = "copilot_conversations"

    # ── Conversations ──────────────────────────────────────────────────────
    def create(
        self,
        *,
        title: str = "New conversation",
        candidate_id: Optional[str] = None,
        campaign_id: Optional[str] = None,
        context_type: str = "global",
    ) -> CopilotConversation:
        """Create a page-scoped conversation (candidate/campaign optional in V5)."""
        row: dict[str, Any] = {
            "recruiter_id": self.recruiter_id,
            "title": title,
            "context_type": context_type,
        }
        if candidate_id:
            row["candidate_id"] = candidate_id
        if campaign_id:
            row["campaign_id"] = campaign_id
        try:
            resp = self._table.insert(row).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "create conversation")
        return CopilotConversation(**self._one_or_404(resp, "Conversation"))

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
        return self.create(
            title=title, candidate_id=candidate_id, campaign_id=campaign_id,
            context_type="candidate",
        )

    def get(self, conversation_id: str) -> CopilotConversation:
        """Fetch one recruiter-owned conversation (404 if not found / not owned)."""
        try:
            resp = self._scoped().eq("id", conversation_id).limit(1).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "get conversation")
        return CopilotConversation(**self._one_or_404(resp, "Conversation"))

    def list_for_recruiter(self, limit: int = 100) -> list[CopilotConversation]:
        try:
            resp = (
                self._scoped()
                .order("updated_at", desc=True)
                .limit(limit)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list conversations")
        return [CopilotConversation(**r) for r in self._rows(resp)]

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

    def rename(self, conversation_id: str, title: str) -> CopilotConversation:
        try:
            resp = (
                self._table.update({"title": title})
                .eq("recruiter_id", self.recruiter_id)
                .eq("id", conversation_id)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "rename conversation")
        return CopilotConversation(**self._one_or_404(resp, "Conversation"))

    def touch(self, conversation_id: str) -> None:
        """Bump updated_at so the thread sorts to the top after a new message.

        The BEFORE UPDATE trigger (set_updated_at) overrides this with the server
        clock; we send a valid timestamp so PostgREST casting never fails.
        """
        try:
            (
                self._table.update({"updated_at": datetime.now(timezone.utc).isoformat()})
                .eq("recruiter_id", self.recruiter_id)
                .eq("id", conversation_id)
                .execute()
            )
        except Exception:  # pragma: no cover — best effort, trigger also covers this
            pass

    def delete(self, conversation_id: str) -> None:
        try:
            (
                self._table.delete()
                .eq("recruiter_id", self.recruiter_id)
                .eq("id", conversation_id)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "delete conversation")

    # ── Messages ───────────────────────────────────────────────────────────
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
