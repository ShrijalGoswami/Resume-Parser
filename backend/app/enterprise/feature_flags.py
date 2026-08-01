"""
Organization feature flags — the OPERATIONAL kill-switch.

Since monetization (Phase 1) this module no longer decides what a plan includes;
`enterprise/catalog.py` does, and `enterprise/entitlements.py` resolves it. What
remains here is the narrow, still-useful thing a flag is for: turning one
capability OFF for one organization.

Overrides subtract only
-----------------------
A flag row used to be able to switch a capability ON above the paid plan. That
made an ops toggle and a commercial decision indistinguishable in the data, and
it is a revenue leak through a table nobody audits. Additive exceptions now live
in `entitlement_grants` (attributed, expiring, service-role only), so:

    org_feature_flags   subtract only    operational, reversible
    entitlement_grants  add              commercial, audited

An `enabled = true` row is therefore inert — it cannot grant anything. It is kept
rather than deleted because it records a deliberate "leave this on" and reads
correctly in the Settings toggle.

This module stays the compatibility surface for `GET /org/feature-flags` and the
Settings section, both of which predate the catalog.
"""

from __future__ import annotations

from typing import Optional

from app.enterprise.catalog import (
    FEATURE_KEYS, RULESET_V1, Plan, features_for_plan, normalize_plan, normalize_ruleset,
)

#: Toggleable capabilities. Sourced from the catalog so a new feature appears in
#: Settings automatically instead of being forgotten here.
FEATURES: list[str] = list(FEATURE_KEYS)


def default_enabled(plan: str, feature: str, *, ruleset: str = RULESET_V1) -> bool:
    """Does this plan include the feature, before grants and overrides?"""
    return feature in features_for_plan(normalize_plan(plan), ruleset=ruleset)


def resolve(
    plan: str,
    overrides: dict[str, bool],
    feature: str,
    *,
    ruleset: str = RULESET_V1,
    grants: Optional[set[str]] = None,
) -> bool:
    """plan (or grant) decides; an override may only take it away."""
    if feature not in FEATURES:
        return False
    allowed = default_enabled(plan, feature, ruleset=ruleset) or feature in (grants or set())
    if overrides.get(feature) is False:
        return False
    return allowed


def resolve_all(
    plan: str,
    overrides: dict[str, bool],
    *,
    ruleset: str = RULESET_V1,
    grants: Optional[set[str]] = None,
) -> dict[str, bool]:
    return {f: resolve(plan, overrides, f, ruleset=ruleset, grants=grants) for f in FEATURES}


#: Retained for callers that still import it (the enforcement test asserts every
#: flag is wired to a gate). Derived, never hand-maintained.
_PLAN_DEFAULTS: dict[Plan, set[str]] = {
    plan: features_for_plan(plan) for plan in Plan
}
