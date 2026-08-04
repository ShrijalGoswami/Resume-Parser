"""
Provider capabilities.

**The domain must never infer what a gateway can do from its name.**

Without this, every provider-specific constraint becomes an `if provider ==
"razorpay"` somewhere, and those scatter: one in the cancel path, one in the
plan-change path, one in a refund helper. Adding a second gateway then means
finding all of them, and the ones that are missed are the ones that fail in
production.

Instead the adapter *declares* what it supports, and the domain asks. A new
provider changes one declaration, not a search across the codebase.

Every flag here is a real constraint of a real gateway, not a hypothetical.
`supports_gateway_reactivation` exists because Razorpay's documentation is
explicit that "once cancelled, a Subscription cannot be restarted" — a rule that
would otherwise have lived as a comment nobody reads, or as a runtime error a
customer discovers mid-resubscribe.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ProviderCapabilities:
    """What a payment gateway can and cannot do.

    Frozen: capabilities are a property of the integration, decided when the
    adapter is written. A value that could be flipped at runtime would be a
    feature flag, and this is not one.
    """

    #: Pause an active subscription without cancelling it.
    supports_pause: bool = False
    #: Resume a paused subscription.
    supports_resume: bool = False
    #: Credit or charge the unused remainder when a plan changes mid-cycle.
    supports_proration: bool = False
    #: A gateway-hosted page where a customer manages their own billing.
    #: False means WE build that surface, which is product work, not adapter work.
    supports_customer_portal: bool = False
    #: Move a live subscription to a different plan.
    supports_plan_change: bool = False
    #: Refund part of a captured payment.
    supports_partial_refund: bool = False

    # ── constraints, not features ───────────────────────────────────────────
    # Both of these are things a gateway CANNOT do or REQUIRES. They live here
    # for the same reason the flags above do: so the rule is declared once and
    # asked about, rather than remembered.

    #: Whether a cancelled subscription can be brought back at the gateway.
    #: Razorpay: no. Resubscribing must create a NEW subscription object, and
    #: attempting to reactivate the old one fails at the API — after the
    #: customer has already committed to resubscribing.
    supports_gateway_reactivation: bool = False
    #: Whether creating a subscription requires a finite number of billing
    #: cycles up front. Razorpay: yes, `total_count` is mandatory. The adapter
    #: supplies a long horizon and treats exhaustion as renewal, never expiry —
    #: a customer must not lose access because a counter we chose ran out.
    requires_total_count: bool = False
    #: Whether the gateway can change a plan immediately, or only at cycle end.
    supports_immediate_plan_change: bool = False

    def require(self, capability: str) -> None:
        """Raise unless the capability is supported.

        The guard a domain operation calls before attempting something a
        particular gateway may not be able to do. Named after the capability
        rather than the provider, which is the whole point.
        """
        from app.billing.domain.errors import BillingError

        if not getattr(self, capability, False):
            raise BillingError(f"provider does not support {capability}")


#: Everything off. A provider that forgets to declare its capabilities gets the
#: most conservative possible answer rather than an accidental yes.
NO_CAPABILITIES = ProviderCapabilities()
