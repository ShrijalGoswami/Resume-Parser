"""
Razorpay signature verification.

TWO INDEPENDENT PATHS. THEY SHARE NOTHING.
------------------------------------------
Both use HMAC-SHA256, and that is the only thing they have in common. They sign
different messages with different secrets for different purposes, and merging
them "because both are HMAC" is how one gets fixed and the other silently keeps
the bug.

    WEBHOOK                     server-to-server, gateway -> us
      message  the RAW request body, byte for byte
      secret   RAZORPAY_WEBHOOK_SECRET
      header   X-Razorpay-Signature
      grants   nothing by itself; it authenticates the sender

    CHECKOUT CALLBACK           browser -> us, after the customer pays
      message  "{razorpay_payment_id}|{razorpay_subscription_id}"
      secret   RAZORPAY_KEY_SECRET
      grants   NOTHING. Confirms the customer finished; the webhook is what
               changes a plan.

THE ORDERING TRAP
-----------------
For **Orders** Razorpay signs `order_id|payment_id`.
For **Subscriptions** it signs `payment_id|subscription_id` — the id order is
reversed, and the subscription id comes second.

Almost every example online shows the Orders form, because Orders is the far
more common integration. Copying it produces a signature that verifies locally
against your own wrong implementation and fails against Razorpay in production.
Confirmed against the official SDK, which builds
`"{}|{}".format(payment_id, subscription_id)`.

WHY NOT THE SDK'S HELPERS
-------------------------
`razorpay.Client.utility.verify_*` RAISES on mismatch rather than returning a
bool, and the port here returns a verdict the caller decides on. Implementing
the HMAC directly is a dozen lines, keeps the comparison constant-time and
explicit, and — the reason that matters — makes both paths unit-testable with
no SDK, no credentials and no network.
"""
from __future__ import annotations

import hashlib
import hmac
from typing import Mapping, Optional

SIGNATURE_HEADER = "x-razorpay-signature"
EVENT_ID_HEADER = "x-razorpay-event-id"


def _digest(secret: str, message: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _header(headers: Mapping[str, str], name: str) -> str:
    """Case-insensitive lookup.

    HTTP header names are case-insensitive, and ASGI, proxies and test clients
    all disagree about which case they hand over. A signature check that works
    behind one server and fails behind another is not a check.
    """
    lowered = name.lower()
    for key, value in headers.items():
        if key.lower() == lowered:
            return value or ""
    return ""


# ── path 1: webhooks ────────────────────────────────────────────────────────


def verify_webhook_signature(raw_body: bytes, headers: Mapping[str, str], secret: str) -> bool:
    """Verify `X-Razorpay-Signature` over the RAW body.

    `raw_body` must be the exact bytes received. Any middleware that parses JSON
    and re-serialises it before this runs will change key order or whitespace
    and break the signature — and it fails as "invalid signature", which sends
    whoever is debugging it looking for a wrong secret rather than a helpful
    framework.
    """
    if not isinstance(raw_body, (bytes, bytearray)):
        raise TypeError("raw_body must be bytes — a parsed body cannot be verified")
    provided = _header(headers, SIGNATURE_HEADER)
    if not provided or not secret:
        return False
    return hmac.compare_digest(_digest(secret, bytes(raw_body)), provided)


def extract_event_id(headers: Mapping[str, str]) -> str:
    """The idempotency key, from `x-razorpay-event-id`.

    It is a HEADER, not a payload field — the subscription webhook envelope has
    no event id inside it. `(provider, event_id)` is the primary key of
    `billing_events`, so getting this from the wrong place would mean every
    redelivery looked like a new event and got processed twice.
    """
    return _header(headers, EVENT_ID_HEADER)


# ── path 2: checkout callback ───────────────────────────────────────────────


def verify_subscription_payment_signature(
    payment_id: str,
    subscription_id: str,
    signature: str,
    key_secret: str,
) -> bool:
    """Verify the payload Razorpay Checkout hands back to the browser.

    Message is `payment_id|subscription_id` — payment first. See the ordering
    trap above.

    Verifying this does NOT grant a plan. It tells the UI the customer finished,
    so it can say "you're all set" instead of "we're waiting". Only the webhook
    changes state: a browser callback runs on hardware we do not control, and a
    customer who closes the tab at the wrong moment would otherwise be charged
    and not granted.
    """
    if not (payment_id and subscription_id and signature and key_secret):
        return False
    message = f"{payment_id}|{subscription_id}".encode("utf-8")
    return hmac.compare_digest(_digest(key_secret, message), signature)


def sign_subscription_payment(payment_id: str, subscription_id: str, key_secret: str) -> str:
    """Produce a valid callback signature.

    Test support only. It exists so a test can prove the verifier accepts a
    genuinely correct signature — a verifier only ever tested against wrong
    input could return `False` unconditionally and look correct.
    """
    return _digest(key_secret, f"{payment_id}|{subscription_id}".encode("utf-8"))


def sign_webhook(raw_body: bytes, webhook_secret: str) -> str:
    """Produce a valid webhook signature. Test support only."""
    return _digest(webhook_secret, bytes(raw_body))
