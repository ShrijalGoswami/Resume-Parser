"""
Organization feature flags.

Each capability can be toggled per organization. Resolution order:
  explicit org override (org_feature_flags) → plan default → global default.

Enterprise customers enable/disable capabilities independently; lower plans get a
sensible default subset.
"""

from __future__ import annotations

from app.enterprise.plans import Plan

# Toggleable capabilities (map to the AI engines built in V5).
FEATURES: list[str] = [
    "ai_copilot",
    "candidate_comparison",
    "semantic_search",
    "interview_intelligence",
    "executive_reports",
    "autonomous_agent",
]

# What each plan turns on by default.
_PLAN_DEFAULTS: dict[Plan, set[str]] = {
    Plan.free: {"ai_copilot", "candidate_comparison", "semantic_search"},
    Plan.professional: {"ai_copilot", "candidate_comparison", "semantic_search",
                        "interview_intelligence", "executive_reports"},
    Plan.business: set(FEATURES),
    Plan.enterprise: set(FEATURES),
}


def _plan(plan: str) -> Plan:
    try:
        return Plan(plan)
    except ValueError:
        return Plan.free


def default_enabled(plan: str, feature: str) -> bool:
    return feature in _PLAN_DEFAULTS.get(_plan(plan), set())


def resolve(plan: str, overrides: dict[str, bool], feature: str) -> bool:
    """org override wins; otherwise the plan default; unknown feature → False."""
    if feature not in FEATURES:
        return False
    if feature in overrides:
        return bool(overrides[feature])
    return default_enabled(plan, feature)


def resolve_all(plan: str, overrides: dict[str, bool]) -> dict[str, bool]:
    return {f: resolve(plan, overrides, f) for f in FEATURES}
