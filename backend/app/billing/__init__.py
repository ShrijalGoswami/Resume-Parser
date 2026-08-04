"""
Billing.

The commercial layer that turns a plan into money. Strictly separated from
`app/enterprise/`, which decides what a plan INCLUDES and enforces it:

    enterprise/   what may this organization do?      reads `subscriptions`
    billing/      what has this organization paid?    writes `subscriptions`

The dependency runs one way only. `app/enterprise/**` must never import
`app/billing/**` — the entitlement layer has to keep working with billing
switched off, and a gateway incident must not become an outage for customers
who have already paid. A test enforces this.

Layout
------
    domain/               provider-agnostic. Models, the port, the state
                          machine, the invariant. Knows no gateway.
    providers/fake.py     an in-memory provider. The whole domain is testable
                          without Razorpay, credentials, or a network.
    providers/razorpay/   NOT BUILT. Phase 4 Step 3.

See `docs/BILLING_ARCHITECTURE.md`.
"""
