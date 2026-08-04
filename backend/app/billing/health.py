"""
Billing integrity, surfaced operationally.

The bridge between the pure invariant check (`domain/invariants.py`) and the
database. Kept separate so the rules stay testable with no Supabase, and so
the only part that needs a network is the part that reads rows.

WHY THIS IS NOT ON THE HOT PATH
-------------------------------
`/health` must stay cheap — it is polled by uptime probes and by the platform.
This check reads three small tables, so it runs **only when explicitly asked**
(`/health?check=billing`) and on startup. A request-path check would put a
Supabase round trip in front of every liveness probe, and a probe that fails
because a query was slow is worse than no probe.

WHY IT NEVER REPAIRS
--------------------
Deciding that an organization is `founding` is a commercial judgement. A health
check that quietly inserted rows would be making that judgement on nobody's
authority, and the incident this guards against was itself an unreviewed write.
Repair is `scripts/restore_founding_subscriptions.py`: audited, reasoned,
reversible.
"""
from __future__ import annotations

import logging
from typing import Optional

from app.billing.domain.invariants import (
    IntegrityFinding,
    OrganizationRow,
    SubscriptionRow,
    check_organizations,
    summarize,
)

logger = logging.getLogger("app.billing.health")


def _load_rows() -> tuple[list[OrganizationRow], list[SubscriptionRow]]:
    """Read what the invariant needs. Import is local so the domain stays
    importable — and testable — with Supabase absent or unconfigured."""
    from app.db.supabase_client import get_service_client

    client = get_service_client()

    orgs = getattr(client.table("organizations").select("id").execute(), "data", []) or []
    members = getattr(
        client.table("organization_members").select("organization_id,status").execute(),
        "data", [],
    ) or []
    subs = getattr(
        client.table("subscriptions")
        .select("organization_id,plan_ruleset,billing_mode,billing_subscription_id,"
                "payment_failed_at,grace_period_ends_at")
        .execute(),
        "data", [],
    ) or []

    active_orgs = {
        m["organization_id"] for m in members
        if m.get("organization_id") and m.get("status") == "active"
    }

    organizations = [
        OrganizationRow(
            organization_id=o["id"],
            has_active_member=o["id"] in active_orgs,
        )
        for o in orgs
    ]
    subscriptions = [
        SubscriptionRow(
            organization_id=s["organization_id"],
            plan_ruleset=s.get("plan_ruleset") or "v1",
            billing_mode=s.get("billing_mode") or "none",
            billing_subscription_id=s.get("billing_subscription_id"),
            payment_failed_at=s.get("payment_failed_at"),
            grace_period_ends_at=s.get("grace_period_ends_at"),
        )
        for s in subs
    ]
    return organizations, subscriptions


def run_integrity_check(*, include_inactive: bool = False) -> list[IntegrityFinding]:
    organizations, subscriptions = _load_rows()
    return check_organizations(organizations, subscriptions, include_inactive=include_inactive)


def billing_integrity_status(*, include_inactive: bool = False) -> dict:
    """A dict for `/health`. Never raises — a health check that throws tells an
    operator nothing except that the health check is broken."""
    try:
        findings = run_integrity_check(include_inactive=include_inactive)
    except Exception as exc:  # noqa: BLE001 - degrade, never crash the probe
        logger.warning("billing integrity check could not run: %s", exc)
        return {
            "healthy": True,   # unknown is not unhealthy; see below
            "checked": False,
            "error": type(exc).__name__,
        }

    result = summarize(findings)
    if not result["healthy"]:
        # Loud. This is the whole point: the incident it guards against was
        # silent for days.
        logger.error(
            "SUBSCRIPTION INTEGRITY: %s critical problem(s) across %s finding(s). %s",
            result["critical"], result["problems"], result["sample"],
        )
    elif result["problems"]:
        logger.warning(
            "subscription integrity: %s non-critical finding(s). %s",
            result["problems"], result["sample"],
        )
    return result


def log_integrity_on_startup() -> None:
    """Called from startup validation.

    Reports and continues. It does not refuse to boot: a service that will not
    start because one organization's row is missing takes the product down for
    everyone else, and the failure mode this guards against is a *silent*
    demotion, not an unsafe one. Loud in the logs is the fix.
    """
    result = billing_integrity_status()
    if not result.get("checked"):
        logger.info("Billing integrity check skipped (persistence unavailable).")
        return
    if result["healthy"] and not result["problems"]:
        logger.info("Billing integrity: every active organization has exactly one subscription.")
