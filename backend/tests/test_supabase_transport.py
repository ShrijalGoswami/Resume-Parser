"""
Guards on the Supabase transport (see app/db/supabase_client.py).

Two properties, both load-bearing, neither obvious from the call site:

  T1  HTTP/2 stays OFF. httpcore's synchronous HTTP/2 connection cannot be
      driven from several threads at once, and `resolve_org_context` fans four
      queries across four threads on one client. Re-enabling it brings back the
      intermittent 503 "Organization lookup failed." (docs/rca/UPLOAD_503.md).

  T2  The shared transport leaks no identity. It is a process-wide connection
      pool borrowed by every tenant's client, so if `Authorization` were ever
      set ON the transport rather than per request, one recruiter's token would
      be sent for another's queries. T2 is the test that would catch that.

Offline: no Supabase project, no network, no credentials. Runs under pytest or
directly (`python -m tests.test_supabase_transport`).
"""
from __future__ import annotations

import httpx

from app.db import supabase_client as sc


def _fake_supabase(monkeypatched_calls: list[httpx.Request]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        monkeypatched_calls.append(request)
        return httpx.Response(200, json=[], headers={"Content-Type": "application/json"})

    return httpx.MockTransport(handler)


def test_transport_is_http1_and_shared() -> None:
    """T1 — HTTP/2 off, and one pool reused rather than one per client."""
    sc.close_transport()
    try:
        transport = sc._transport()
        pool = transport._transport._pool  # httpx -> httpcore connection pool
        assert pool._http2 is False, "HTTP/2 must stay disabled (see T1 docstring)"
        assert pool._http1 is True
        assert sc._transport() is transport, "transport must be a process-wide singleton"
        # Keep-alive is what makes sharing worth anything: without it every
        # request pays a fresh TCP+TLS handshake, which is the failure mode that
        # replaced the 503 (see RCA §5.2).
        assert pool._max_keepalive_connections >= 100, (
            "the shared pool must keep connections alive across requests"
        )
    finally:
        sc.close_transport()


def test_clients_are_built_on_the_shared_transport() -> None:
    """T3 — the factories actually WIRE the shared pool in.

    T1 only proves the pool is configured correctly; this proves it is used. If
    `httpx_client=_transport()` is dropped from either factory, the SDK silently
    falls back to building its own `httpx.Client(http2=True)` per sub-client —
    the exact pre-fix state, with no visible symptom until it fails under load.
    """
    if not sc.supabase_available():
        return  # stateless mode: nothing to wire

    sc.close_transport()
    try:
        shared = sc._transport()
        user = sc.get_user_client("test-token")
        assert user.postgrest.session is shared, (
            "get_user_client must pass httpx_client=_transport()"
        )
        assert user.storage.session is shared, "storage must borrow the shared pool too"

        service = sc.get_service_client()
        assert service.postgrest.session is shared, (
            "get_service_client must pass httpx_client=_transport() — it is a "
            "process-wide singleton touched by up to 40 AnyIO worker threads"
        )
    finally:
        sc.close_transport()


def test_shutdown_closes_the_pool_and_drops_stale_clients() -> None:
    """T4 — `close_transport()` releases sockets and invalidates cached clients.

    The service client is an `lru_cache` singleton holding a reference to the
    transport. Closing the pool without clearing that cache would leave the next
    caller with a client whose connection pool is shut.
    """
    if not sc.supabase_available():
        return

    sc.close_transport()
    try:
        first = sc._transport()
        service = sc.get_service_client()
        assert service.postgrest.session is first

        sc.close_transport()
        assert first.is_closed, "the pool must actually be closed on shutdown"

        # A fresh transport, and a service client rebuilt on it — not the stale one.
        second = sc._transport()
        assert second is not first
        assert not second.is_closed
        assert sc.get_service_client().postgrest.session is second, (
            "close_transport must clear the get_service_client cache"
        )
    finally:
        sc.close_transport()


def test_transport_carries_no_identity() -> None:
    """T2 — two users on one shared pool each send only their own token."""
    from supabase import ClientOptions, create_client

    seen: list[httpx.Request] = []
    shared = httpx.Client(transport=_fake_supabase(seen), follow_redirects=True)

    def build(token: str):
        """A user client built exactly as `get_user_client` builds one, but
        against the mock pool so the test needs no project or network."""
        client = create_client(
            "https://example.supabase.co", "anon-key",
            options=ClientOptions(auto_refresh_token=False, persist_session=False,
                                  headers={"Authorization": f"Bearer {token}"},
                                  httpx_client=shared),
        )
        client.postgrest.auth(token)
        return client

    try:
        alice, bob = build("alice-token"), build("bob-token")
        assert alice.postgrest.session is bob.postgrest.session, "pool must be shared"
        assert "Authorization" not in shared.headers, (
            "the shared transport must never hold a per-user Authorization header"
        )

        seen.clear()
        alice.table("candidates").select("id").limit(1).execute()
        bob.table("candidates").select("id").limit(1).execute()
        alice.table("candidates").select("id").limit(1).execute()

        sent = [r.headers.get("Authorization") for r in seen]
        assert sent == ["Bearer alice-token", "Bearer bob-token", "Bearer alice-token"], (
            f"per-request identity was not preserved over the shared pool: {sent}"
        )
    finally:
        shared.close()


if __name__ == "__main__":
    test_transport_is_http1_and_shared()
    print("T1 PASS  transport is HTTP/1.1 and shared")
    test_transport_carries_no_identity()
    print("T2 PASS  shared transport carries no per-user identity")
