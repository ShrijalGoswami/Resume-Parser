"""
Transport-security headers and rate-limit keying.

Two production gaps this pins:

* **HSTS was absent.** The service is deployed behind TLS on Render, so a browser
  that once reached it over http had nothing telling it not to again.

* **The rate limiter keyed on `request.client.host`.** Behind a TLS-terminating
  proxy that value is the *proxy's* address, identical for every caller, so all
  traffic shared one bucket and a single abusive client could exhaust the limit
  for everybody — the limiter turning into a denial-of-service amplifier rather
  than a protection.

`X-Forwarded-For` is client-supplied, so it is only trusted when
`TRUST_PROXY_HEADERS` is set. These assert both directions of that switch.

Runnable without pytest:  python -m tests.test_security_headers_and_limits
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys
from dataclasses import dataclass

from app.core.config import settings
from app.core.observability import _is_secure_request, client_ip


@dataclass
class FakeURL:
    scheme: str


@dataclass
class FakeClient:
    host: str


class FakeRequest:
    def __init__(self, scheme="http", headers=None, peer="10.0.0.7"):
        self.url = FakeURL(scheme)
        self.headers = headers or {}
        self.client = FakeClient(peer) if peer else None


def test_https_detected_directly() -> list[str]:
    return [] if _is_secure_request(FakeRequest(scheme="https")) else ["direct https not detected"]


def test_https_detected_behind_proxy() -> list[str]:
    req = FakeRequest(headers={"x-forwarded-proto": "https"})
    return [] if _is_secure_request(req) else ["x-forwarded-proto: https not honoured"]


def test_plain_http_is_not_secure() -> list[str]:
    failures = []
    if _is_secure_request(FakeRequest()):
        failures.append("plain http reported as secure — HSTS would pin a dev host")
    if _is_secure_request(FakeRequest(headers={"x-forwarded-proto": "http"})):
        failures.append("x-forwarded-proto: http reported as secure")
    return failures


def test_proxy_chain_uses_leftmost_proto() -> list[str]:
    req = FakeRequest(headers={"x-forwarded-proto": "https, http"})
    return [] if _is_secure_request(req) else ["leftmost proto in a chain not used"]


def test_client_ip_ignores_forwarded_when_untrusted() -> list[str]:
    original = settings.TRUST_PROXY_HEADERS
    settings.TRUST_PROXY_HEADERS = False
    try:
        req = FakeRequest(headers={"x-forwarded-for": "1.2.3.4"}, peer="10.0.0.7")
        got = client_ip(req)
        return (
            []
            if got == "10.0.0.7"
            else [f"spoofed X-Forwarded-For honoured while untrusted (got {got})"]
        )
    finally:
        settings.TRUST_PROXY_HEADERS = original


def test_client_ip_uses_forwarded_when_trusted() -> list[str]:
    original = settings.TRUST_PROXY_HEADERS
    settings.TRUST_PROXY_HEADERS = True
    try:
        failures = []
        req = FakeRequest(headers={"x-forwarded-for": "1.2.3.4"}, peer="10.0.0.7")
        if client_ip(req) != "1.2.3.4":
            failures.append("trusted X-Forwarded-For not used — all callers share a bucket")
        # Leftmost entry is the original client; later entries are proxy hops.
        chained = FakeRequest(headers={"x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2"})
        if client_ip(chained) != "1.2.3.4":
            failures.append("proxy chain: leftmost client address not selected")
        # A blank header must not produce an empty key.
        blank = FakeRequest(headers={"x-forwarded-for": "  "}, peer="10.0.0.7")
        if client_ip(blank) != "10.0.0.7":
            failures.append("blank X-Forwarded-For did not fall back to the peer address")
        return failures
    finally:
        settings.TRUST_PROXY_HEADERS = original


def test_client_ip_survives_missing_peer() -> list[str]:
    req = FakeRequest(peer=None)
    return [] if client_ip(req) == "unknown" else ["missing client did not degrade to 'unknown'"]


def test_distinct_clients_get_distinct_keys() -> list[str]:
    """The property that actually matters: two users must not share a bucket."""
    original = settings.TRUST_PROXY_HEADERS
    settings.TRUST_PROXY_HEADERS = True
    try:
        a = client_ip(FakeRequest(headers={"x-forwarded-for": "1.1.1.1"}, peer="10.0.0.7"))
        b = client_ip(FakeRequest(headers={"x-forwarded-for": "2.2.2.2"}, peer="10.0.0.7"))
        return [] if a != b else ["two different clients behind one proxy share a rate-limit key"]
    finally:
        settings.TRUST_PROXY_HEADERS = original


def test_default_is_not_to_trust_headers() -> list[str]:
    """A directly-exposed instance must not be foolable out of the box."""
    from app.core.config import Settings

    return (
        []
        if Settings().TRUST_PROXY_HEADERS is False
        else ["TRUST_PROXY_HEADERS defaults to true — spoofable when not behind a proxy"]
    )


def main() -> int:
    checks = [
        test_https_detected_directly,
        test_https_detected_behind_proxy,
        test_plain_http_is_not_secure,
        test_proxy_chain_uses_leftmost_proto,
        test_client_ip_ignores_forwarded_when_untrusted,
        test_client_ip_uses_forwarded_when_trusted,
        test_client_ip_survives_missing_peer,
        test_distinct_clients_get_distinct_keys,
        test_default_is_not_to_trust_headers,
    ]
    all_failures: list[str] = []
    for check in checks:
        print(f"\n{check.__name__}")
        failures = check()
        if failures:
            for f in failures:
                print(f"  FAIL  {f}")
            all_failures.extend(failures)
        else:
            print("  passed")

    print("\n" + "-" * 62)
    if all_failures:
        print(f"FAILED — {len(all_failures)} problem(s)")
        return 1
    print(f"PASSED — {len(checks)} transport-security checks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
