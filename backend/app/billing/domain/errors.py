"""
Billing errors.

Every one of these is *loud on purpose*. The failure this codebase keeps
designing out is the silent one — a value that quietly resolves to something
plausible and is discovered weeks later by a customer. A billing layer has more
opportunities for that than any other part of the product, so nothing here
returns `None` on a problem or falls back to a default.
"""
from __future__ import annotations


class BillingError(Exception):
    """Base for everything raised by the billing domain."""


class IllegalTransitionError(BillingError):
    """A subscription was asked to move between two states that have no edge.

    Raised rather than ignored. A transition the machine does not know about
    means either the gateway sent something unanticipated or our own logic is
    wrong, and both are defects. Silently staying in the current state would
    hide them and leave the customer's access decided by an accident.
    """

    def __init__(self, current, target, reason: str = "") -> None:
        self.current = current
        self.target = target
        self.reason = reason
        detail = f": {reason}" if reason else ""
        super().__init__(f"illegal billing transition {current} -> {target}{detail}")


class SubscriptionIntegrityError(BillingError):
    """The subscription data for an organization is not in a state we can trust.

    Most importantly: a MISSING subscription row.

    This exists because of a real incident. Test-account teardown deleted 83
    subscription rows from production; a missing row resolves to `v1` at read
    time, which is correct for a new organization and a silent DEMOTION for a
    grandfathered one. Two real customers lost their founding status and nothing
    noticed for days. See `docs/rca/SUBSCRIPTION_ROWS_MISSING.md`.

    Missing data is now an integrity error, not a default.
    """

    def __init__(self, organization_id: str, problem: str) -> None:
        self.organization_id = organization_id
        self.problem = problem
        super().__init__(f"subscription integrity error for org {organization_id}: {problem}")


class MoneyError(BillingError):
    """An amount was constructed or combined in a way that cannot be right."""


class ProviderError(BillingError):
    """A payment provider failed, or answered with something unusable.

    Distinct from every error above: those mean OUR state is wrong, this means
    THEIR call did not work. The difference decides whether a human is paged or
    the operation is retried.
    """

    def __init__(self, provider: str, message: str) -> None:
        self.provider = provider
        super().__init__(f"[{provider}] {message}")


class UnknownPlanBindingError(ProviderError):
    """A gateway object referenced a plan/price we do not recognise.

    Deliberately a hard error with no fallback. An unrecognised plan id means
    someone created a plan in the gateway dashboard that the code does not know
    about, and the tempting default — treat it as Free — silently downgrades a
    paying customer. Refusing to process the event is the kinder failure: it
    pages us instead of them.
    """
