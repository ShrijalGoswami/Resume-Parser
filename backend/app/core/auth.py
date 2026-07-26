"""
Authentication — recruiter identity from a Supabase access token.

This module introduces the first `Depends()` in the codebase. It verifies the
bearer token attached by the frontend (issued by Supabase Auth) and resolves the
authenticated recruiter.

Verification is **local**, chosen by the token's own `alg`:

* ES256/RS256 (Supabase's current default) — signature checked against the
  project's published JWKS, fetched once and cached.
* HS256 (legacy) — checked against the shared `SUPABASE_JWT_SECRET`.

Asking Supabase Auth to validate the token remains as a fallback, but only when
no local path applies or the JWKS endpoint is unreachable. It used to be the
*only* working path for ES256 projects, because the local verifier was
HS256-only: that put a network round-trip on every authenticated request
(~2.9s median measured on this project) and made the whole API's availability
and throughput a function of Supabase Auth's.

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
from functools import lru_cache
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


@lru_cache(maxsize=1)
def _jwk_client(uri: str):
    """Cached JWKS client. Keys are fetched once and reused across requests."""
    from jwt import PyJWKClient

    return PyJWKClient(
        uri,
        cache_keys=True,
        lifespan=settings.JWKS_CACHE_SECONDS,
        timeout=5,
    )


def _decode_local_jwks(token: str) -> dict:
    """Verify + decode an asymmetric (ES256/RS256) Supabase token via JWKS.

    Supabase issues ES256 tokens by default now, which the HS256 shared-secret
    path cannot verify at all — so without this the only working option was
    `_decode_remote`, paying a round-trip to Supabase Auth on every authenticated
    request (measured at a ~2.9s median here) and tying the API's availability and
    throughput to Auth's. The signing keys are public, so verification is purely
    local once the key set is cached.
    """
    if not _JWT_AVAILABLE:
        raise _unauthorized("Token verification unavailable: PyJWT not installed.")
    try:
        signing_key = _jwk_client(settings.jwks_url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience=settings.SUPABASE_JWT_AUD,
            options={"require": ["exp", "sub"]},
        )
    except PyJWTError as exc:
        # A signature/expiry/audience failure is a real rejection, not a
        # transport problem — do not fall through to another verifier.
        logger.info("JWKS verification failed: %s", exc)
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


def _token_alg(token: str) -> str:
    """Read the `alg` header without verifying anything."""
    if not _JWT_AVAILABLE:
        return ""
    try:
        return (jwt.get_unverified_header(token) or {}).get("alg", "")
    except Exception:
        return ""


def _verify(token: str) -> dict:
    """Verify a token locally when possible, falling back to Supabase Auth.

    Order matters. Local verification is chosen by the token's own algorithm
    rather than by which secret happens to be configured: an ES256 token handed
    to the HS256 verifier fails outright, which is how every request ended up on
    the remote path. Remote validation is kept as a last resort so a JWKS fetch
    problem degrades latency instead of locking everyone out.
    """
    alg = _token_alg(token)

    # A token whose header will not even parse is not a candidate for any
    # verifier. Rejecting it here keeps an unauthenticated caller from turning
    # garbage tokens into outbound requests to Supabase Auth.
    if not alg:
        raise _unauthorized("Invalid or expired access token.")

    if alg in ("ES256", "RS256") and settings.jwks_url:
        try:
            return _decode_local_jwks(token)
        except HTTPException:
            raise
        except Exception as exc:  # network/JWKS availability only
            logger.warning("JWKS unavailable, falling back to remote validation: %s", exc)
            return _decode_remote(token)

    if alg == "HS256" and settings.SUPABASE_JWT_SECRET:
        return _decode_local(token)

    return _decode_remote(token)


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
    claims = _verify(token)

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
