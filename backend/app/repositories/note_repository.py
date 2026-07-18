"""Recruiter notes persistence."""

from __future__ import annotations

from app.repositories.base import BaseRepository
from app.schemas.campaign import NoteCreate, RecruiterNote


class NoteRepository(BaseRepository):
    table_name = "recruiter_notes"

    def create(self, campaign_id: str, candidate_id: str, payload: NoteCreate) -> RecruiterNote:
        row = {
            "campaign_id": campaign_id,
            "candidate_id": candidate_id,
            "recruiter_id": self.recruiter_id,
            "body": payload.body,
            "pinned": payload.pinned,
        }
        try:
            resp = self._table.insert(row).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "create note")
        return RecruiterNote(**self._one_or_404(resp, "Note"))

    def list_for_candidate(self, candidate_id: str) -> list[RecruiterNote]:
        try:
            resp = (
                self._scoped()
                .eq("candidate_id", candidate_id)
                .order("pinned", desc=True)
                .order("created_at", desc=True)
                .execute()
            )
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "list notes")
        return [RecruiterNote(**r) for r in self._rows(resp)]

    def delete(self, note_id: str) -> None:
        try:
            self._table.delete().eq("id", note_id).eq("recruiter_id", self.recruiter_id).execute()
        except Exception as exc:  # pragma: no cover
            raise self._wrap(exc, "delete note")
