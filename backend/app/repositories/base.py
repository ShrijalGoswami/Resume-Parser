"""
Base repository.

Holds a Supabase client + the authenticated recruiter id, and provides small
helpers shared by concrete repositories. All queries are explicitly scoped to
`recruiter_id` in addition to RLS, so even a service-role client (which bypasses
RLS) can never leak cross-tenant data through this layer.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class PersistenceError(Exception):
    """Raised when a Supabase operation fails unexpectedly."""


class BaseRepository:
    #: Concrete repositories override this with their table name.
    table_name: str = ""

    def __init__(self, client: Any, recruiter_id: str):
        self._client = client
        self.recruiter_id = recruiter_id

    # -- helpers ------------------------------------------------------------
    @property
    def _table(self):
        return self._client.table(self.table_name)

    def _scoped(self):
        """A select/update/delete builder pre-filtered to this recruiter."""
        return self._table.select("*").eq("recruiter_id", self.recruiter_id)

    @staticmethod
    def _rows(resp: Any) -> list[dict]:
        data = getattr(resp, "data", None)
        return data if isinstance(data, list) else ([] if data is None else [data])

    def _one_or_404(self, resp: Any, what: str = "Resource") -> dict:
        rows = self._rows(resp)
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{what} not found.")
        return rows[0]

    @staticmethod
    def _wrap(exc: Exception, action: str) -> HTTPException:
        logger.error("Persistence error during %s: %s", action, exc)
        return HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Database operation failed: {action}.",
        )
