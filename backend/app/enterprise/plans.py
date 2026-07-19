"""
Subscription plans + centralized limit definitions.

Plans and their limits live here (one source of truth); enforcement reads from
this module so quota checks are consistent everywhere. `-1` means unlimited. No
payment processing — this is the billing FOUNDATION only.
"""

from __future__ import annotations

from enum import Enum

UNLIMITED = -1


class Plan(str, Enum):
    free = "free"
    professional = "professional"
    business = "business"
    enterprise = "enterprise"


# Per-plan limits. Metrics also correspond to usage counters (see usage.py).
PLAN_LIMITS: dict[Plan, dict[str, int]] = {
    Plan.free: {
        "recruiters": 2, "workspaces": 1, "campaigns": 3,
        "ai_requests": 200, "storage_mb": 500, "report_exports": 5, "agent_scans": 10,
    },
    Plan.professional: {
        "recruiters": 10, "workspaces": 5, "campaigns": 25,
        "ai_requests": 5_000, "storage_mb": 10_000, "report_exports": 100, "agent_scans": 200,
    },
    Plan.business: {
        "recruiters": 50, "workspaces": 20, "campaigns": 200,
        "ai_requests": 50_000, "storage_mb": 100_000, "report_exports": 1_000, "agent_scans": 2_000,
    },
    Plan.enterprise: {
        "recruiters": UNLIMITED, "workspaces": UNLIMITED, "campaigns": UNLIMITED,
        "ai_requests": UNLIMITED, "storage_mb": UNLIMITED, "report_exports": UNLIMITED, "agent_scans": UNLIMITED,
    },
}


def _plan(plan: str) -> Plan:
    try:
        return Plan(plan)
    except ValueError:
        return Plan.free


def limits_for(plan: str) -> dict[str, int]:
    return dict(PLAN_LIMITS.get(_plan(plan), PLAN_LIMITS[Plan.free]))


def limit_for(plan: str, key: str) -> int:
    return limits_for(plan).get(key, UNLIMITED)


def is_unlimited(value: int) -> bool:
    return value == UNLIMITED


def within_limit(plan: str, key: str, current: int) -> bool:
    limit = limit_for(plan, key)
    return is_unlimited(limit) or current < limit
