"""
Razorpay configuration.

Credentials come from the environment and nowhere else. Nothing is hardcoded,
nothing has a default that would work — a missing secret must fail loudly at the
point of use rather than silently fall back to something that half-works.

    RAZORPAY_KEY_ID          test-mode key id (rzp_test_…)
    RAZORPAY_KEY_SECRET      test-mode key secret
    RAZORPAY_WEBHOOK_SECRET  the webhook secret, set in the dashboard

THREE SECRETS, TWO PURPOSES
---------------------------
The key secret and the webhook secret are different values and sign different
things (see `signatures.py`). Conflating them produces a verification that fails
only in production, because the two are identical in nobody's environment.

TEST MODE IS ENFORCED, NOT ASSUMED
----------------------------------
Razorpay key ids are prefixed `rzp_test_` or `rzp_live_`. `is_test_mode` reads
that prefix, and the provider refuses to process a live-mode webhook while
holding test credentials (and vice versa). A test-mode event must never be able
to grant a plan in production.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

from app.billing.domain.errors import ProviderError

KEY_ID_ENV = "RAZORPAY_KEY_ID"
KEY_SECRET_ENV = "RAZORPAY_KEY_SECRET"
WEBHOOK_SECRET_ENV = "RAZORPAY_WEBHOOK_SECRET"

TEST_PREFIX = "rzp_test_"
LIVE_PREFIX = "rzp_live_"


@dataclass(frozen=True)
class RazorpaySettings:
    key_id: str
    key_secret: str
    webhook_secret: str

    @property
    def is_test_mode(self) -> bool:
        return self.key_id.startswith(TEST_PREFIX)

    @property
    def is_live_mode(self) -> bool:
        return self.key_id.startswith(LIVE_PREFIX)

    def __repr__(self) -> str:  # pragma: no cover - defensive
        # Never let a secret reach a log line, a traceback or an error report.
        return f"RazorpaySettings(key_id={self.key_id[:12]}…, test_mode={self.is_test_mode})"


def load_settings(*, require_webhook_secret: bool = True) -> RazorpaySettings:
    """Read credentials from the environment.

    Raises rather than returning a partially-populated object: a provider built
    with a blank secret would fail at the first API call with a message about
    authentication, which sends whoever is debugging it to the wrong place.
    """
    key_id = os.environ.get(KEY_ID_ENV, "").strip()
    key_secret = os.environ.get(KEY_SECRET_ENV, "").strip()
    webhook_secret = os.environ.get(WEBHOOK_SECRET_ENV, "").strip()

    missing = [
        name for name, value in (
            (KEY_ID_ENV, key_id),
            (KEY_SECRET_ENV, key_secret),
        ) if not value
    ]
    if require_webhook_secret and not webhook_secret:
        missing.append(WEBHOOK_SECRET_ENV)
    if missing:
        raise ProviderError("razorpay", f"missing environment variable(s): {', '.join(missing)}")

    if not (key_id.startswith(TEST_PREFIX) or key_id.startswith(LIVE_PREFIX)):
        raise ProviderError(
            "razorpay",
            f"{KEY_ID_ENV} must start with {TEST_PREFIX!r} or {LIVE_PREFIX!r}",
        )

    return RazorpaySettings(key_id=key_id, key_secret=key_secret, webhook_secret=webhook_secret)


def is_configured() -> bool:
    """Whether credentials are present. Never raises — for health reporting."""
    return bool(os.environ.get(KEY_ID_ENV) and os.environ.get(KEY_SECRET_ENV))
