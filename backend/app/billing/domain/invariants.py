"""
Subscription integrity invariants.

**Every active organization must have exactly one subscription row.**

This exists because of a specific incident, not as a general principle. Test
account teardown deleted 83 subscription rows from production. A missing row
resolves to `v1` at read time — `normalize_ruleset(None)` returns `v1`
deliberately, so that an unrecognised ruleset applies the CURRENT rules rather
than silently handing out the unlimited founding set. That default is right for
a new organization and a **silent demotion** for a grandfathered one.

Two real customers lost their founding status. Nothing failed, nothing logged,
no test broke. It was found days later by a snapshot taken for an unrelated
migration. Full analysis: `docs/rca/SUBSCRIPTION_ROWS_MISSING.md`.

So the rule now is:

    A missing subscription is an INTEGRITY ERROR, never a default.

This module only ever REPORTS. It does not repair. Repair is
`scripts/restore_founding_subscriptions.py` — an audited operator act with a
recorded reason — because deciding that an organization is `founding` is a
commercial judgement, and a health check that quietly wrote rows would be
making that judgement on nobody's authority.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable, Optional, Sequence

from app.billing.domain.errors import SubscriptionIntegrityError


class IntegrityProblem(str, Enum):
    """What can be wrong. Each is a distinct failure with a distinct fix."""

    #: The one that caused the incident.
    missing_subscription = "missing_subscription"
    #: More than one row for an organization. `subscriptions.organization_id` is
    #: UNIQUE, so this should be impossible — which is exactly why it is worth
    #: checking. An impossible state that occurs is a corrupted constraint.
    duplicate_subscription = "duplicate_subscription"
    #: `billing_mode = 'provider'` with no gateway subscription id: a row that
    #: claims to be gateway-driven and cannot be reconciled against anything.
    provider_mode_without_subscription = "provider_mode_without_subscription"
    #: A gateway subscription id on a founding organization. Founding accounts
    #: predate billing and must never be charged.
    founding_with_gateway_subscription = "founding_with_gateway_subscription"
    #: A grace deadline with no failure that opened it.
    grace_without_failure = "grace_without_failure"


#: Problems that mean a customer's entitlement is being decided by an accident
#: right now. These fail a readiness check; the rest are reported and logged.
CRITICAL = frozenset({
    IntegrityProblem.missing_subscription,
    IntegrityProblem.duplicate_subscription,
})


@dataclass(frozen=True)
class IntegrityFinding:
    organization_id: str
    problem: IntegrityProblem
    detail: str = ""

    @property
    def is_critical(self) -> bool:
        return self.problem in CRITICAL

    def raise_(self) -> None:
        raise SubscriptionIntegrityError(self.organization_id, f"{self.problem.value}: {self.detail}")

    def __str__(self) -> str:
        return f"{self.organization_id}: {self.problem.value}{f' ({self.detail})' if self.detail else ''}"


@dataclass(frozen=True)
class OrganizationRow:
    """The minimum needed to judge integrity, so the check does not depend on
    the shape of a database row or on anything being loaded eagerly."""

    organization_id: str
    #: An organization nobody can sign in to is a QA leftover, not a customer.
    #: 67 of those exist in production and it is why this distinction is here:
    #: reporting them would bury two real problems under sixty-seven pretend
    #: ones, and a check that cries wolf is a check people switch off.
    has_active_member: bool = True


@dataclass(frozen=True)
class SubscriptionRow:
    organization_id: str
    plan_ruleset: str = "v1"
    billing_mode: str = "none"
    billing_subscription_id: Optional[str] = None
    payment_failed_at: Optional[object] = None
    grace_period_ends_at: Optional[object] = None


def check_organizations(
    organizations: Iterable[OrganizationRow],
    subscriptions: Iterable[SubscriptionRow],
    *,
    include_inactive: bool = False,
) -> list[IntegrityFinding]:
    """Compare organizations against subscriptions and report every problem.

    Pure: it takes rows and returns findings. No database access, no I/O, no
    repair — which is what makes it testable with no Supabase and safe to call
    from a health check on the request path.

    `include_inactive` reports organizations with no members too. Off by
    default: they are abandoned test artifacts (OPS-6), and mixing them in
    would make the signal unreadable.
    """
    by_org: dict[str, list[SubscriptionRow]] = {}
    for sub in subscriptions:
        by_org.setdefault(sub.organization_id, []).append(sub)

    findings: list[IntegrityFinding] = []
    for org in organizations:
        if not org.has_active_member and not include_inactive:
            continue

        rows = by_org.get(org.organization_id, [])

        if not rows:
            findings.append(IntegrityFinding(
                org.organization_id,
                IntegrityProblem.missing_subscription,
                "no subscription row; entitlement would silently resolve to v1 free",
            ))
            continue

        if len(rows) > 1:
            findings.append(IntegrityFinding(
                org.organization_id,
                IntegrityProblem.duplicate_subscription,
                f"{len(rows)} rows; organization_id is UNIQUE, so this should be impossible",
            ))

        findings.extend(_check_row(rows[0]))

    return findings


def _check_row(row: SubscriptionRow) -> list[IntegrityFinding]:
    findings: list[IntegrityFinding] = []

    if row.billing_mode == "provider" and not row.billing_subscription_id:
        findings.append(IntegrityFinding(
            row.organization_id,
            IntegrityProblem.provider_mode_without_subscription,
            "billing_mode='provider' with no billing_subscription_id — nothing to reconcile against",
        ))

    if row.plan_ruleset == "founding" and row.billing_subscription_id:
        findings.append(IntegrityFinding(
            row.organization_id,
            IntegrityProblem.founding_with_gateway_subscription,
            "a founding organization must never be charged",
        ))

    if row.grace_period_ends_at is not None and row.payment_failed_at is None:
        findings.append(IntegrityFinding(
            row.organization_id,
            IntegrityProblem.grace_without_failure,
            "grace deadline with no payment failure that opened it",
        ))

    return findings


def summarize(findings: Sequence[IntegrityFinding]) -> dict:
    """A shape a health endpoint can return and a log line can carry.

    `healthy` is False only for CRITICAL problems. A non-critical finding is
    worth surfacing and worth fixing, but failing readiness on it would take
    the API down over a data oddity that harms nobody — and an alert that stops
    deploys for cosmetic reasons is an alert that gets muted.
    """
    critical = [f for f in findings if f.is_critical]
    counts: dict[str, int] = {}
    for finding in findings:
        counts[finding.problem.value] = counts.get(finding.problem.value, 0) + 1

    return {
        "healthy": not critical,
        "checked": True,
        "problems": len(findings),
        "critical": len(critical),
        "by_problem": counts,
        # Bounded on purpose: a health endpoint that returns 70 organization ids
        # becomes a payload nobody reads and a small data leak in a public
        # response. The count is the signal; the ids are in the logs.
        "sample": [str(f) for f in findings[:5]],
    }


def raise_if_critical(findings: Sequence[IntegrityFinding]) -> None:
    """For startup and for operator tools. Never for the request path — a
    customer's request must not fail because a DIFFERENT organization's row is
    missing."""
    critical = [f for f in findings if f.is_critical]
    if critical:
        critical[0].raise_()
