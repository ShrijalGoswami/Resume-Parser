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
import threading
from functools import lru_cache

import httpx
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

# How long a single Supabase HTTP call may take before we give up.
_HTTP_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

# The shared transport is deliberately NOT an `lru_cache`: on a cache miss
# `lru_cache` does not hold a lock across the call, so two threads racing the
# first request would each build an `httpx.Client` and one would be dropped
# unclosed. Double-checked locking gives exactly one, and gives `close_transport`
# something to reset.
_transport_lock = threading.Lock()
_transport_client: httpx.Client | None = None


def _transport() -> httpx.Client:
    """The process-wide HTTP/1.1 transport every Supabase client borrows.

    **HTTP/2 is disabled deliberately, and this is load-bearing.**

    postgrest-py, storage3 and supabase-auth each build their own
    `httpx.Client(..., http2=True)`. Over HTTP/2 a client multiplexes every
    request onto a *single* TCP connection, and httpcore's synchronous HTTP/2
    implementation is not safe to drive from several threads at once. Both of the
    connection's mutable state machines get corrupted: threads allocate stream
    IDs in one order and write their HEADERS frames in the other (non-monotonic
    stream IDs are a protocol violation -> GOAWAY PROTOCOL_ERROR), and they
    encode headers concurrently against one HPACK dynamic table until it
    desynchronises from the server's (-> GOAWAY COMPRESSION_ERROR). Both were
    observed. Either way the connection dies, taking *every* in-flight request on
    it with it.

    `resolve_org_context` fans four queries across four threads sharing one
    client, which is exactly that pattern — measured at a **19% failure rate per
    fan-out** against this project, surfacing as an intermittent
    503 "Organization lookup failed." An isolation run (40 trials x 4 reads)
    pinned the variable precisely: shared client + concurrent + HTTP/2 failed
    30/160; shared + sequential, per-thread + HTTP/2, and shared + concurrent +
    HTTP/1.1 were each 160/160 clean. See docs/rca/UPLOAD_503.md.

    Over HTTP/1.1 httpx opens a separate connection per concurrent request from
    its pool, so the fan-out keeps running genuinely in parallel — the
    optimisation is preserved, only the unsafe transport is given up.

    **Why it is shared process-wide.** A Supabase client is built per request
    (four of them on an upload: candidate repo, storage, activity repo, org
    context), and each used to own its httpx client — so every request paid a
    fresh TCP + TLS handshake per service, and none were ever closed. With the
    multiplexing of HTTP/2 also gone, the handshake storm became the next
    failure: a sustained run of concurrent uploads produced
    `_ssl.c:989: The handshake operation timed out`. Sharing one pooled
    transport lets connections be reused across requests, which is also the
    root of the 2.5–8s `/org/context` latency.

    Sharing is safe because the transport carries no per-user state: postgrest
    and storage3 keep `Authorization` on their own header dicts and attach it to
    each individual request, using the httpx client purely as a connection pool.
    `tests/test_supabase_transport.py` asserts exactly that.
    """
    global _transport_client
    if _transport_client is None:
        with _transport_lock:
            if _transport_client is None:
                _transport_client = httpx.Client(
                    # DO NOT set this to True. It is not a performance knob — it
                    # is the root cause of the intermittent
                    # 503 "Organization lookup failed." documented in
                    # docs/rca/UPLOAD_503.md, measured at a 19% failure rate.
                    # httpcore's sync HTTP/2 connection cannot be driven from
                    # multiple threads, and `resolve_org_context` does exactly
                    # that. `tests/test_supabase_transport.py::T1` fails if this
                    # is flipped back.
                    http2=False,
                    follow_redirects=True,
                    timeout=_HTTP_TIMEOUT,
                    # Keep-alive is the entire point: default httpx retires all
                    # but 20 idle connections, and this pool serves every tenant
                    # in the process.
                    limits=httpx.Limits(max_connections=100, max_keepalive_connections=100),
                )
                logger.info("Supabase HTTP transport initialized (HTTP/1.1, pooled).")
    return _transport_client


def init_transport() -> None:
    """Build the pool at startup rather than on the first request.

    Removes the thundering-herd on cold start (the first N concurrent requests
    would otherwise all race into connection setup) and surfaces a bad
    configuration during boot instead of inside a user's request.

    No-op in stateless mode: with no Supabase configured nothing will ever
    borrow the pool, so there is no reason to build one.
    """
    if supabase_available():
        _transport()


def close_transport() -> None:
    """Close the pool and drop clients built on it. Called on app shutdown.

    Without this, shutdown leaves the pool's sockets to the garbage collector.
    `get_service_client` is cleared too: its cached client holds a reference to
    the transport being closed, so keeping it would hand out a client whose pool
    is shut.
    """
    global _transport_client
    with _transport_lock:
        client, _transport_client = _transport_client, None
        get_service_client.cache_clear()
    if client is not None:
        client.close()
        logger.info("Supabase HTTP transport closed.")


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
    # This one is a process-wide singleton, so it is shared across every request
    # and every worker thread by definition — it needs the HTTP/1.1 transport at
    # least as much as the per-request user client does.
    options = ClientOptions(
        auto_refresh_token=False, persist_session=False, httpx_client=_transport()
    )
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
    # The shared connection pool. The user's token is NOT set on it: postgrest
    # keeps `Authorization` on its own `headers` dict and attaches it per
    # request, so the transport holds no per-user state and two recruiters
    # borrowing the same pool cannot see each other's identity.
    options = ClientOptions(
        auto_refresh_token=False,
        persist_session=False,
        headers={"Authorization": f"Bearer {access_token}"},
        httpx_client=_transport(),
    )
    client = create_client(settings.SUPABASE_URL, anon_key, options=options)
    # Ensure PostgREST + Storage use the user token, not the anon key.
    #
    # Best-effort across SDK versions, but no longer silent: if this ever stops
    # working the client falls back to the anon key and every RLS-scoped read
    # comes back empty — which surfaces as "no organization" or an empty
    # dashboard, nowhere near the actual cause. Also note the property access
    # materialises `client._postgrest` here, on one thread, before any caller can
    # fan the client out across several.
    try:
        client.postgrest.auth(access_token)
    except Exception as exc:  # pragma: no cover - best effort across sdk versions
        logger.warning(
            "postgrest.auth() failed (%s: %s); client will fall back to the anon key "
            "and RLS-scoped reads will return no rows.",
            type(exc).__name__, exc,
        )
    # `Client.postgrest` / `Client.storage` are lazily-initialised properties with
    # no lock, so first use from two threads at once can build two service
    # objects. Touching both here means every sub-client exists before the caller
    # can hand this client to a thread pool. (Free with a supplied transport: no
    # extra httpx client is constructed.)
    _ = client.storage
    return client


def supabase_available() -> bool:
    """Cheap boolean used by /health and startup checks."""
    return _SUPABASE_AVAILABLE and settings.is_supabase_configured
