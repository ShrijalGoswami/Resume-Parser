"""
Authentication — recruiter identity from a Supabase access token.

This module introduces the first `Depends()` in the codebase. It verifies the
bearer token attached by the frontend (issued by Supabase Auth) and resolves the
authenticated recruiter. Verification is **local** (HS256 against the project's
JWT secret) so it adds no network round-trip on the hot path; if no shared
secret is configured it falls back to asking Supabase Auth to validate the token.

Usage in a route:

    from app.core.auth import CurrentRecruiter, require_recruiter

    @router.get("/campaigns")
    async def list_campaigns(recruiter: CurrentRecruiter = Depends(require_recruiter)):
        ...

Design for OAuth: nothing here is email/password specific. Any Supabase-issued
token (Google, GitHub, SSO, magic link) verifies identically — adding providers
is a Supabase dashboard change, no code change here.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = logging.getLogger(__name__)

try:  # pragma: no cover - import guard
    import jwt
    from jwt import PyJWTError

    _JWT_AVAILABLE = True
except Exception:  # pragma: no cover
    jwt = None  # type: ignore[assignment]
    PyJWTError = Exception  # type: ignore[assignment,misc]
    _JWT_AVAILABLE = False

# auto_error=False so we can raise our own consistent 401 payloads.
_bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class CurrentRecruiter:
    """The authenticated recruiter resolved from a verified access token."""

    id: str  # auth.users.id (uuid) — equals recruiters.id and RLS auth.uid()
    email: str
    access_token: str  # forwarded to user-scoped Supabase clients
    role: str = "authenticated"
    claims: Optional[dict] = None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _decode_local(token: str) -> dict:
    """Verify + decode a Supabase HS256 token against the shared JWT secret."""
    if not _JWT_AVAILABLE:
        raise _unauthorized("Token verification unavailable: PyJWT not installed.")
    try:
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience=settings.SUPABASE_JWT_AUD,
            options={"require": ["exp", "sub"]},
        )
    except PyJWTError as exc:
        logger.info("JWT verification failed: %s", exc)
        raise _unauthorized("Invalid or expired access token.") from exc


def _decode_remote(token: str) -> dict:
    """Fallback: validate the token by asking Supabase Auth who it belongs to."""
    from app.db.supabase_client import get_user_client

    try:
        client = get_user_client(token)
        resp = client.auth.get_user(token)
        user = getattr(resp, "user", None)
        if user is None:
            raise _unauthorized("Invalid or expired access token.")
        return {
            "sub": user.id,
            "email": user.email or "",
            "role": getattr(user, "role", "authenticated"),
        }
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover
        logger.info("Remote token validation failed: %s", exc)
        raise _unauthorized("Invalid or expired access token.") from exc


async def require_recruiter(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(_bearer_scheme)],
) -> CurrentRecruiter:
    """
    FastAPI dependency: require a valid recruiter access token.

    Raises 401 if the token is missing/invalid, 503 if auth isn't configured.
    """
    if not settings.is_auth_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication not configured. Set SUPABASE_JWT_SECRET (or SUPABASE_URL).",
        )
    if credentials is None or not credentials.credentials:
        raise _unauthorized("Missing bearer token.")

    token = credentials.credentials
    claims = _decode_local(token) if settings.SUPABASE_JWT_SECRET else _decode_remote(token)

    sub = claims.get("sub")
    if not sub:
        raise _unauthorized("Token missing subject claim.")

    return CurrentRecruiter(
        id=str(sub),
        email=str(claims.get("email", "")),
        access_token=token,
        role=str(claims.get("role", "authenticated")),
        claims=claims,
    )


async def optional_recruiter(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(_bearer_scheme)],
) -> Optional[CurrentRecruiter]:
    """
    Like `require_recruiter` but returns None instead of raising when no valid
    token is present. Used by endpoints that persist *if* authenticated but must
    keep working for anonymous/stateless callers (backwards compatibility).
    """
    if credentials is None or not credentials.credentials or not settings.is_auth_configured:
        return None
    try:
        return await require_recruiter(credentials)
    except HTTPException:
        return None
