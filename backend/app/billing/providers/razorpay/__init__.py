"""
Razorpay adapter.

The ONLY package permitted to import the Razorpay SDK or use Razorpay
vocabulary. Everything here translates between one gateway and the
provider-agnostic domain; nothing above this package knows Razorpay exists.

    config.py      credentials from the environment, test/live mode
    signatures.py  TWO independent verification paths — webhook and callback
    mapping.py     Razorpay status/event vocabulary -> our domain
    plans.py       plan id bindings; plans are immutable at Razorpay
    events.py      verified webhook -> BillingEvent
    provider.py    RazorpayProvider, implementing BillingProvider

Verified against the Razorpay documentation on 1 Aug 2026.
"""

from app.billing.providers.razorpay.provider import (  # noqa: F401
    RAZORPAY_CAPABILITIES,
    RazorpayProvider,
)

__all__ = ["RazorpayProvider", "RAZORPAY_CAPABILITIES"]
