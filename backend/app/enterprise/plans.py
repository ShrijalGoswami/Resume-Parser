"""
Subscription plans — compatibility shim over `enterprise/catalog.py`.

The plan definitions moved to the catalog when monetization shipped (Phase 1),
because limits, features and plan ordering all have to come from one table or
they drift. This module survives as the small surface its existing callers
already import — `repositories.update_subscription`, `OrgContext.limits()` — so
that move did not have to touch them.

New code should import from `app.enterprise.catalog` (data) or
`app.enterprise.entitlements` (decisions). Nothing new should reach for
`Plan.professional`: those slugs are historical and resolve through the catalog's
alias table.
"""

from __future__ import annotations

from app.enterprise.catalog import (
    LIMITS, UNLIMITED, Plan, is_unlimited, limits_for_plan, normalize_plan,
)

__all__ = [
    "Plan", "PLAN_LIMITS", "UNLIMITED", "limits_for", "limit_for",
    "is_unlimited", "within_limit", "normalize_plan",
]

#: Historical name for the catalog's limit table.
PLAN_LIMITS: dict[Plan, dict[str, int]] = LIMITS


def limits_for(plan: str) -> dict[str, int]:
    return limits_for_plan(normalize_plan(plan))


def limit_for(plan: str, key: str) -> int:
    return limits_for(plan).get(key, UNLIMITED)


def within_limit(plan: str, key: str, current: int) -> bool:
    """Kept for callers that only need a yes/no.

    Enforcement paths must NOT use this: `PlanService.quota()` returns a
    `Decision` carrying the limit, the usage and the plan that would lift it,
    which is what the 402 body and the upgrade prompt are built from. A bare
    bool here is why the old limits were displayed but never enforced.
    """
    limit = limit_for(plan, key)
    return is_unlimited(limit) or current < limit
