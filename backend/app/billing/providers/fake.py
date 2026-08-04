"""
An in-memory billing provider.

The whole point of Step 2: **the billing domain is completely testable with no
Razorpay, no credentials, and no network.** If this file could not exist, the
abstraction in `domain/provider.py` would be decorative — a port you can only
exercise through the thing it is meant to hide is not a port.

It is a real implementation of `BillingProvider`, not a mock. Tests drive it
through the same seven methods the Razorpay adapter will implement, so a test
written against the domain today keeps passing against a gateway tomorrow.

It also models the awkward parts rather than the happy path, because those are
what the domain has to survive:

  * `fail_next_charge()`      — a declined mandate
  * `exhaust_retries()`       — a gateway that has given up
  * out-of-order events, replays, and unknown plans

Never imported by production code. Tests and local development only.
"""
from __future__ import annotations

import hashlib
import hmac
import itertools
import json
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import Mapping, Optional

from app.billing.domain.errors import ProviderError, UnknownPlanBindingError
from app.billing.domain.models import (
    BillingProviderId,
    BillingState,
    Invoice,
    Money,
)
from app.billing.domain.capabilities import ProviderCapabilities
from app.billing.domain.provider import (
    CheckoutHandoff,
    ProviderSubscription,
    WebhookEnvelope,
)

#: Deliberately not the real prices. A test that asserts against these is
#: testing the fake, and a fake that mirrors production pricing invites exactly
#: that confusion. Real amounts live in `lib/pricing.ts` and, from Step 3, in
#: the Razorpay adapter's plan bindings.
FAKE_PLAN_AMOUNTS: dict[str, Money] = {
    "plus": Money(100_00, "INR"),
    "pro": Money(200_00, "INR"),
}

FAKE_WEBHOOK_SECRET = "fake-webhook-secret"


class FakeBillingProvider:
    """An implementation of `BillingProvider` backed by dictionaries."""

    id = BillingProviderId.razorpay

    #: Mirrors the Razorpay adapter by default, so a test written against the
    #: fake exercises the same constraints the real gateway imposes. Overridable
    #: per instance, which is how a test proves the domain reacts to a
    #: capability rather than to a provider name.
    DEFAULT_CAPABILITIES = ProviderCapabilities(
        supports_pause=True,
        supports_resume=True,
        supports_proration=False,
        supports_customer_portal=False,
        supports_plan_change=True,
        supports_partial_refund=True,
        supports_gateway_reactivation=False,
        requires_total_count=True,
        supports_immediate_plan_change=False,
    )

    def __init__(self, *, livemode: bool = False,
                 capabilities: ProviderCapabilities | None = None) -> None:
        self.capabilities = capabilities or self.DEFAULT_CAPABILITIES
        self.livemode = livemode
        self.customers: dict[str, str] = {}                  # org_id -> customer_id
        self.subscriptions: dict[str, ProviderSubscription] = {}
        self.invoices: dict[str, list[Invoice]] = {}
        self.calls: list[tuple[str, tuple]] = []             # call log, for assertions
        self._ids = itertools.count(1)
        self._fail_next = False
        self._retries_exhausted = False

    # ── test controls ───────────────────────────────────────────────────────

    def fail_next_charge(self) -> None:
        """The next activation declines, as a real mandate can."""
        self._fail_next = True

    def exhaust_retries(self) -> None:
        """The gateway has stopped retrying — the domain should enter grace."""
        self._retries_exhausted = True

    def _next(self, prefix: str) -> str:
        return f"{prefix}_{next(self._ids):06d}"

    def _record(self, name: str, *args) -> None:
        self.calls.append((name, args))

    # ── BillingProvider ─────────────────────────────────────────────────────

    def ensure_customer(self, organization_id: str, email: str, name: str = "") -> str:
        self._record("ensure_customer", organization_id, email)
        # Idempotent, like the real thing: calling twice must not create two
        # customers and start billing an organization twice.
        if organization_id not in self.customers:
            self.customers[organization_id] = self._next("cust")
        return self.customers[organization_id]

    def start_subscription(self, organization_id: str, plan: str, currency: str) -> CheckoutHandoff:
        self._record("start_subscription", organization_id, plan, currency)
        if plan not in FAKE_PLAN_AMOUNTS:
            # The same hard failure the real adapter must have. Never a silent
            # fallback to a cheaper plan.
            raise UnknownPlanBindingError(self.id.value, f"no binding for plan {plan!r}")

        customer_id = self.ensure_customer(organization_id, f"{organization_id}@example.test")
        sub_id = self._next("sub")
        self.subscriptions[sub_id] = ProviderSubscription(
            provider=self.id,
            provider_subscription_id=sub_id,
            provider_customer_id=customer_id,
            plan=plan,
            # Created, not authorized. A mandate is a transaction the customer
            # still has to complete.
            state=BillingState.pending_activation,
            raw={"fake": True, "plan": plan},
        )
        return CheckoutHandoff(
            provider=self.id,
            kind="modal",
            subscription_id=sub_id,
            public_key="fake_key_id",
            amount=FAKE_PLAN_AMOUNTS[plan],
        )

    def fetch_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        self._record("fetch_subscription", provider_subscription_id)
        sub = self.subscriptions.get(provider_subscription_id)
        if sub is None:
            raise ProviderError(self.id.value, f"no subscription {provider_subscription_id}")
        return sub

    def cancel_subscription(self, provider_subscription_id: str,
                            at_period_end: bool = True) -> ProviderSubscription:
        self._record("cancel_subscription", provider_subscription_id, at_period_end)
        sub = self.fetch_subscription(provider_subscription_id)
        updated = replace(
            sub,
            cancel_at_period_end=at_period_end,
            state=sub.state if at_period_end else BillingState.cancelled,
        )
        self.subscriptions[provider_subscription_id] = updated
        return updated

    def verify_webhook(self, raw_body: bytes, headers: Mapping[str, str]) -> WebhookEnvelope:
        self._record("verify_webhook", len(raw_body))
        signature = headers.get("x-fake-signature") or headers.get("X-Fake-Signature") or ""
        expected = hmac.new(
            FAKE_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
        ).hexdigest()
        # Constant-time, as the real one must be.
        verified = hmac.compare_digest(signature, expected)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise ProviderError(self.id.value, f"unparseable webhook body: {exc}") from exc
        return WebhookEnvelope(
            provider=self.id,
            event_id=payload.get("id", "evt_unknown"),
            event_type=payload.get("event", "unknown"),
            payload=payload,
            verified=verified,
            livemode=bool(payload.get("livemode", self.livemode)),
        )

    def verify_client_callback(self, payload: Mapping[str, str]) -> bool:
        self._record("verify_client_callback")
        given = payload.get("signature", "")
        body = f"{payload.get('payment_id','')}|{payload.get('subscription_id','')}"
        expected = hmac.new(
            FAKE_WEBHOOK_SECRET.encode(), body.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(given, expected)

    def list_invoices(self, provider_customer_id: str, limit: int = 20) -> list[Invoice]:
        self._record("list_invoices", provider_customer_id, limit)
        return self.invoices.get(provider_customer_id, [])[:limit]

    # ── simulation helpers ──────────────────────────────────────────────────

    def authorize(self, provider_subscription_id: str, *,
                  now: Optional[datetime] = None) -> ProviderSubscription:
        """The customer completes the mandate.

        Honours `fail_next_charge()`, because the interesting path is the one
        where a real card declines.
        """
        now = now or datetime.now(timezone.utc)
        sub = self.fetch_subscription(provider_subscription_id)
        if self._fail_next:
            self._fail_next = False
            updated = replace(sub, state=BillingState.payment_failed)
        else:
            updated = replace(
                sub,
                state=BillingState.active,
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
            )
        self.subscriptions[provider_subscription_id] = updated
        return updated

    def charge_fails(self, provider_subscription_id: str) -> ProviderSubscription:
        sub = self.fetch_subscription(provider_subscription_id)
        state = BillingState.grace if self._retries_exhausted else BillingState.payment_failed
        updated = replace(sub, state=state)
        self.subscriptions[provider_subscription_id] = updated
        return updated

    def signed_webhook(self, event_id: str, event_type: str, **extra) -> tuple[bytes, dict]:
        """A correctly signed webhook body and headers, for tests."""
        payload = {"id": event_id, "event": event_type, "livemode": self.livemode, **extra}
        body = json.dumps(payload).encode("utf-8")
        signature = hmac.new(FAKE_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        return body, {"x-fake-signature": signature}

    def add_invoice(self, provider_customer_id: str, invoice: Invoice) -> None:
        self.invoices.setdefault(provider_customer_id, []).append(invoice)
