"""
Storage service — private-bucket uploads + signed URLs.

Buckets are private (migration 0003). Object keys are namespaced by recruiter id
as the first path segment so storage RLS enforces isolation:

    <recruiter_id>/<campaign_id>/<candidate_id>/<filename>

We never hand out public URLs — downloads use short-lived signed URLs.

Large resume files are best uploaded straight from the browser via supabase-js
(client-side, RLS enforced). This service exists for server-side uploads (e.g.
generated interview-pack PDFs) and for minting signed download URLs on demand.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def _sanitize(name: str) -> str:
    cleaned = _SAFE.sub("_", name.strip()) or "file"
    return cleaned[:200]


def object_key(recruiter_id: str, *parts: str) -> str:
    """Build a recruiter-namespaced object key (RLS requires the uid prefix)."""
    segments = [recruiter_id, *[_sanitize(p) for p in parts if p]]
    return "/".join(segments)


class StorageService:
    def __init__(self, client: Any, recruiter_id: str):
        self._client = client
        self.recruiter_id = recruiter_id

    def upload(
        self,
        bucket: str,
        key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
        *,
        upsert: bool = True,
    ) -> str:
        """Upload bytes to a private bucket. Returns the stored object key."""
        if not key.startswith(f"{self.recruiter_id}/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Object key must be namespaced under the recruiter id.",
            )
        try:
            self._client.storage.from_(bucket).upload(
                path=key,
                file=data,
                file_options={"content-type": content_type, "upsert": str(upsert).lower()},
            )
        except Exception as exc:  # pragma: no cover
            logger.error("Storage upload failed (%s/%s): %s", bucket, key, exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail="File upload failed."
            )
        return key

    def signed_url(self, bucket: str, key: str, ttl: int | None = None) -> str:
        """Create a short-lived signed download URL for a private object."""
        expires = ttl or settings.SIGNED_URL_TTL_SECONDS
        try:
            resp = self._client.storage.from_(bucket).create_signed_url(key, expires)
        except Exception as exc:  # pragma: no cover
            logger.error("Signed URL failed (%s/%s): %s", bucket, key, exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not create download link."
            )
        # SDK returns {'signedURL': ...} or {'signed_url': ...} across versions.
        if isinstance(resp, dict):
            url = resp.get("signedURL") or resp.get("signed_url") or resp.get("signedUrl")
            if url:
                return url
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not create download link."
        )
