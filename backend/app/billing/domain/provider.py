"""
The billing provider port.

The seam that keeps gateways out of the domain. Everything above this line
reasons about subscriptions and money; everything below translates one gateway.

The rule, enforced by a test rather than by good intentions: **no module
outside `app/billing/providers/<name>/` may import a gateway SDK or reference a
gateway-specific identifier.** Adapters are adapters, not business logic.

Seven operations. The list is short on purpose — every method here is one a
second provider will have to implement, and each addition is a tax on that.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal, Mapping, Optional, Protocol, runtime_checkable

from app.billing.domain.capabilities import ProviderCapabilities
from app.billing.domain.models import (
    BillingProviderId,
    BillingState,
    Invoice,
    Money,
)


@dataclass(frozen=True)
class CheckoutHandoff:
    """How the client is handed to the gateway.

    Deliberately vague about mechanism. Razorpay returns a subscription id for a
    JS modal; a redirect-based gateway would return a URL. Modelling both now
    costs one field and means adding the second provider does not change this
    type — which is the difference between an extension and a refactor.
    """

    provider: BillingProviderId
    kind: Literal["modal", "redirect"]
    subscription_id: Optional[str] = None   # modal providers
    redirect_url: Optional[str] = None      # redirect providers
    public_key: Optional[str] = None
    amount: Optional[Money] = None


@dataclass(frozen=True)
class ProviderSubscription:
    """What every provider must be able to tell us about a subscription.

    Already mapped: `plan` is a catalog plan and `state` is a `BillingState`.
    Translation happens in the adapter, so the domain never sees a gateway's
    vocabulary and no `if provider == ...` appears above this line.
    """

    provider: BillingProviderId
    provider_subscription_id: str
    provider_customer_id: str
    plan: str
    state: BillingState
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    #: Exactly what the gateway said. Kept for investigation; reading it outside
    #: the adapter is the coupling this design exists to prevent.
    raw: dict = field(default_factory=dict)


@dataclass(frozen=True)
class WebhookEnvelope:
    """A verified webhook, before anything is done with it.

    `verified` is not advisory. An envelope that fails signature verification
    is a forgery attempt, not a customer with a bad network, and the handler
    must refuse it rather than process it hopefully.
    """

    provider: BillingProviderId
    event_id: str
    event_type: str
    payload: dict
    verified: bool
    livemode: bool = False


@runtime_checkable
class BillingProvider(Protocol):
    """What a payment gateway must be able to do.

    Implemented by `providers/fake.py` today and by `providers/razorpay/` in
    Step 3. Nothing in the domain depends on which.
    """

    id: BillingProviderId
    #: What this gateway can do. Declared, never inferred from `id` — see
    #: `domain/capabilities.py`.
    capabilities: ProviderCapabilities

    def ensure_customer(self, organization_id: str, email: str, name: str = "") -> str:
        """Find or create the gateway customer. Returns its id. Idempotent."""
        ...

    def start_subscription(self, organization_id: str, plan: str, currency: str) -> CheckoutHandoff:
        """Create a subscription in a not-yet-authorized state and hand off."""
        ...

    def fetch_subscription(self, provider_subscription_id: str) -> ProviderSubscription:
        """Read current truth from the gateway.

        The handler calls this after every webhook rather than trusting the
        event payload: gateways do not guarantee ordering, redelivery is normal,
        and the payload is a snapshot at emit time. One extra call buys
        correctness that ordering logic would otherwise have to earn.
        """
        ...

    def cancel_subscription(self, provider_subscription_id: str,
                            at_period_end: bool = True) -> ProviderSubscription:
        ...

    def verify_webhook(self, raw_body: bytes, headers: Mapping[str, str]) -> WebhookEnvelope:
        """Verify a signature over the RAW body and return the envelope.

        Raw bytes, never a re-encoded dict: any middleware that parses and
        re-serialises JSON before this runs breaks the signature, and it fails
        as "invalid signature" rather than as "your framework touched the body",
        which is a genuinely hard afternoon.
        """
        ...

    def verify_client_callback(self, payload: Mapping[str, str]) -> bool:
        """Verify the signed payload the gateway hands back to the browser.

        Exists on the port because Razorpay's checkout returns one and a
        redirect-based gateway has no equivalent — a provider without this
        concept implements it as `return True` rather than the route growing a
        branch per provider.

        Verifying it does NOT grant a plan. It confirms the customer completed
        the flow so the UI can say "you're all set"; only the webhook changes
        state. Treating a browser callback as authorization is the most common
        billing bug in this shape, and it fails in both directions.
        """
        ...

    def list_invoices(self, provider_customer_id: str, limit: int = 20) -> list[Invoice]:
        ...


__all__ = [
    "BillingProvider",
    "CheckoutHandoff",
    "ProviderCapabilities",
    "ProviderSubscription",
    "WebhookEnvelope",
]
