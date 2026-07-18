"""
Supabase client factories.

Two flavours of client, chosen per use-case:

* **Service client** (`get_service_client`) — authenticated with the service-role
  key. Bypasses RLS. Used by trusted server-side workers that have *already*
  authorized the caller and scope every query to a specific recruiter_id
  themselves (see repositories). Cached as a singleton.

* **User client** (`get_user_client`) — authenticated with the anon key plus the
  end user's access token. RLS applies as that user. Used when we want the
  database itself to enforce tenant isolation (defence in depth). Created
  per-request (cheap; no network on construction).

The whole module degrades gracefully: if Supabase is not configured the
factories raise a clear 503, so the stateless AI endpoints keep working while
persistence endpoints report that they're disabled.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

# supabase-py is an optional dependency at runtime: the app must import and run
# even if the package isn't installed (stateless mode). Import lazily-guarded.
try:  # pragma: no cover - import guard
    # Import the sync-compatible ClientOptions from the package root (the base
    # module's ClientOptions is not accepted by the sync create_client).
    from supabase import Client, ClientOptions, create_client

    _SUPABASE_AVAILABLE = True
except Exception:  # pragma: no cover
    Client = object  # type: ignore[assignment,misc]
    create_client = None  # type: ignore[assignment]
    ClientOptions = None  # type: ignore[assignment]
    _SUPABASE_AVAILABLE = False


def _require_supabase() -> None:
    """Package present + a project URL configured. Key checks are per-client."""
    if not _SUPABASE_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Persistence layer unavailable: the 'supabase' package is not installed.",
        )
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Persistence layer not configured. Set SUPABASE_URL.",
        )


@lru_cache(maxsize=1)
def get_service_client() -> "Client":
    """Return the cached service-role client (bypasses RLS). Server-trusted only."""
    _require_supabase()
    service_key = settings.supabase_service_key
    if not service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin operation requires SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).",
        )
    options = ClientOptions(auto_refresh_token=False, persist_session=False)
    client = create_client(settings.SUPABASE_URL, service_key, options=options)
    logger.info("Supabase service client initialized.")
    return client


def get_user_client(access_token: str) -> "Client":
    """
    Return an anon client acting as the given user (RLS enforced as that user).

    The token is attached via PostgREST/Storage auth headers so every query runs
    under the recruiter's identity. Constructed per request — do not cache.
    """
    _require_supabase()
    anon_key = settings.supabase_anon_key
    if not anon_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Anon key not configured (set SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY).",
        )
    options = ClientOptions(
        auto_refresh_token=False,
        persist_session=False,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    client = create_client(settings.SUPABASE_URL, anon_key, options=options)
    # Ensure PostgREST + Storage use the user token, not the anon key.
    try:
        client.postgrest.auth(access_token)
    except Exception:  # pragma: no cover - best effort across sdk versions
        pass
    return client


def supabase_available() -> bool:
    """Cheap boolean used by /health and startup checks."""
    return _SUPABASE_AVAILABLE and settings.is_supabase_configured
