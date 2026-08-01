"""
Feature-flag enforcement suite.

Every capability listed in `enterprise.feature_flags.FEATURES` is presented to org
admins as a toggle in Settings and resolved by `GET /org/feature-flags`. A flag
that nothing enforces is worse than no flag at all: the toggle looks like a
control but controls nothing, and an org keeps a capability its plan does not
include.

Four of the six flags (`ai_copilot`, `candidate_comparison`, `semantic_search`,
`interview_intelligence`) were declared and surfaced but never wired to a gate —
only `executive_reports` and `autonomous_agent` were. This suite exists so that
regression cannot recur silently.

It inspects the *live* dependency graph rather than grepping source, so it also
catches a gate that is imported but not actually attached to a route.

Runnable without pytest:  python -m tests.test_feature_flag_enforcement
(from backend/, with the project venv active)
"""
from __future__ import annotations

import sys

from fastapi.routing import APIRoute, _IncludedRouter

from app.enterprise.feature_flags import FEATURES, _PLAN_DEFAULTS, resolve
from app.enterprise.plans import Plan
from app.main import app


def _resolved_routes():
    """Yield (path, dependant) for every reachable endpoint.

    This FastAPI version does not flatten `include_router` eagerly: `app.routes`
    holds lazy `_IncludedRouter` wrappers whose `effective_candidates()` produce
    `_EffectiveRouteContext` objects carrying the *combined* dependant (endpoint
    dependencies merged with the ones inherited from `include_router`). Walking
    that is what makes router-level and endpoint-level gates both visible.
    """
    stack = list(app.routes)
    while stack:
        item = stack.pop()
        if isinstance(item, APIRoute):
            yield item.path, item.dependant
        elif isinstance(item, _IncludedRouter):
            stack.extend(item.effective_candidates())
            stack.extend(item.effective_low_priority_routes())
        else:
            dependant = getattr(item, "dependant", None)
            path = getattr(item, "path", None)
            if dependant is not None and path is not None:
                yield path, dependant


def _gated_features_by_path() -> dict[str, set[str]]:
    """Map each route path to the set of capabilities gating it.

    `require_entitlement("x", action=...)` returns a closure; the feature name
    lives in that closure's cells, which is how a gate is identified here
    regardless of whether it was attached at router or endpoint level.

    Both factory names are recognised: `feature_gate` is the deprecated alias
    kept during the monetization migration, and a route still using it is gated
    just as effectively.
    """
    found: dict[str, set[str]] = {}
    for path, dependant in _resolved_routes():
        for dep in dependant.dependencies:
            call = getattr(dep, "call", None)
            closure = getattr(call, "__closure__", None)
            qualname = getattr(call, "__qualname__", "")
            if not closure or not ("require_entitlement" in qualname or "feature_gate" in qualname):
                continue
            for cell in closure:
                value = cell.cell_contents
                if isinstance(value, str) and value in FEATURES:
                    found.setdefault(path, set()).add(value)
    return found


# Capabilities that MUST be enforced by a route gate, because each is served by
# an endpoint that costs money or exposes paid value. Everything else in the
# catalog is exempt for a stated reason (see EXEMPT below) — a blanket "every
# feature must be gated" assertion would be satisfiable only by gating the free
# tier's own endpoints, which is not the goal.
MUST_BE_ROUTE_GATED = {
    "ai_copilot", "semantic_search", "candidate_comparison",
    "interview_intelligence", "executive_reports", "autonomous_agent",
    "advanced_analytics", "export_pdf",
    # Gated by the monetization audit (1 Aug 2026).
    "predictive_intelligence", "org_knowledge", "integrations", "webhooks",
}

# Why each remaining catalog feature carries no route gate.
EXEMPT = {
    "resume_parser": "free-tier baseline — the parser IS the product's floor",
    "ats_score": "free-tier baseline",
    "basic_ai_summary": "free-tier baseline",
    "full_resume_analysis": "same endpoints as the free analysis; the depth of "
                            "the result is gated in the response, not the route",
    "export_excel": "no Excel export endpoint exists yet — the entitlement is "
                    "declared so the plan matrix is complete",
    "byo_ai": "Phase 4 — no credential endpoints yet",
    "api_access": "Phase 4 — scoped org API keys exist but the public API does not",
    "sso": "Supabase-level auth configuration, not a HireLens endpoint",
    "audit_logs": "read surface exists for every org today; gating it would hide "
                  "an organization's own history behind a plan",
    "dedicated_support": "commercial commitment, not a software capability",
}


def test_every_feature_flag_is_enforced_somewhere() -> list[str]:
    gated = _gated_features_by_path()
    enforced = {f for feats in gated.values() for f in feats}
    failures = []

    missing = sorted(MUST_BE_ROUTE_GATED - enforced)
    if missing:
        failures.append(
            f"Capabilities that must be route-gated are not: {missing}. "
            "Attach require_entitlement(...) to the router or endpoint that "
            "serves the capability."
        )

    # Every catalog feature is either route-gated or has a recorded reason. This
    # is what stops a new paid feature from being added to the catalog and
    # quietly served to everyone.
    unaccounted = sorted(set(FEATURES) - MUST_BE_ROUTE_GATED - set(EXEMPT))
    if unaccounted:
        failures.append(
            f"Catalog features neither route-gated nor exempt: {unaccounted}. "
            "Add the gate, or record why it needs none in EXEMPT."
        )
    for feature in sorted(enforced):
        paths = sorted(p for p, f in gated.items() if feature in f)
        print(f"  ok  {feature:<24} -> {', '.join(paths)}")
    return failures


# Endpoints that must NEVER carry a feature gate, and why. A gate here is not a
# harmless extra check — it turns a working page into an error page.
UNGATEABLE: list[tuple[str, str, str]] = [
    (
        "/api/v1/agent/recommendations",
        "GET",
        "the Decision Ledger's only data source. A router-level `autonomous_agent` "
        "gate made /ledger return 403 and render an error for every free- and "
        "professional-plan org, and would make a downgraded customer's permanent "
        "decision record unreadable. An audit trail you cannot read is not one.",
    ),
    (
        "/api/v1/agent/recommendations/{rec_id}",
        "PATCH",
        "recording a human decision on a recommendation that already exists. "
        "Gating it would leave those items permanently un-resolvable in the Inbox "
        "after a plan downgrade.",
    ),
]


def test_audit_and_decision_endpoints_are_never_gated() -> list[str]:
    """
    The regression this pins is a real one: `autonomous_agent` was attached to the
    whole agent router, which swept in the Ledger read.

    Gating these leaks nothing. With the flag off no scan can run, so no
    recommendations exist and the read returns `[]` — the Ledger's designed empty
    state instead of an error.
    """
    gated = _gated_features_by_path()
    failures = []
    for path, method, why in UNGATEABLE:
        feats = gated.get(path)
        if feats:
            failures.append(
                f"{method} {path} is gated on {sorted(feats)} — it must not be: {why}"
            )
    return failures


def test_running_the_agent_stays_gated() -> list[str]:
    """The other half: ungating the read must not ungate the capability itself.

    Running a scan costs LLM calls and creates recommendations, so that is where
    the plan boundary belongs.
    """
    gated = _gated_features_by_path()
    failures = []
    for path in ("/api/v1/agent/scan", "/api/v1/agent/workflows"):
        if "autonomous_agent" not in gated.get(path, set()):
            failures.append(
                f"{path} is no longer gated on 'autonomous_agent' — a free-plan org "
                f"can run the autonomous agent"
            )
    return failures


def test_no_gate_references_an_unknown_feature() -> list[str]:
    """A typo'd gate name would 403 forever — `resolve()` returns False for an
    unknown feature, so it can never be enabled from Settings."""
    gated = _gated_features_by_path()
    failures = []
    for path, feats in gated.items():
        for feature in feats:
            if feature not in FEATURES:
                failures.append(f"{path} gated on unknown feature {feature!r}")
    return failures


def test_plan_defaults_only_reference_known_features() -> list[str]:
    failures = []
    for plan, feats in _PLAN_DEFAULTS.items():
        unknown = sorted(feats - set(FEATURES))
        if unknown:
            failures.append(f"plan {plan.value} defaults reference unknown features {unknown}")
    return failures


def test_lower_plans_do_not_silently_get_gated_capabilities() -> list[str]:
    """The free plan must not resolve to a capability its defaults exclude.

    Since monetization the defaults are DERIVED from the catalog rather than
    hand-maintained, so this now checks the derivation itself: `resolve()` must
    agree with the catalog for every feature, on the v1 ruleset.
    """
    failures = []
    for feature in FEATURES:
        expected = feature in _PLAN_DEFAULTS[Plan.free]
        actual = resolve(Plan.free.value, {}, feature)
        if actual != expected:
            failures.append(
                f"free plan resolve({feature!r}) = {actual}, expected {expected}"
            )
    # The four capabilities that moved out of free when monetization shipped.
    for feature in ("ai_copilot", "semantic_search", "candidate_comparison",
                    "interview_intelligence"):
        if resolve(Plan.free.value, {}, feature):
            failures.append(f"free plan still resolves {feature!r} to True")
    return failures


def main() -> int:
    checks = [
        test_every_feature_flag_is_enforced_somewhere,
        test_audit_and_decision_endpoints_are_never_gated,
        test_running_the_agent_stays_gated,
        test_no_gate_references_an_unknown_feature,
        test_plan_defaults_only_reference_known_features,
        test_lower_plans_do_not_silently_get_gated_capabilities,
    ]
    all_failures: list[str] = []
    for check in checks:
        print(f"\n{check.__name__}")
        failures = check()
        if failures:
            for f in failures:
                print(f"  FAIL  {f}")
            all_failures.extend(failures)
        else:
            print("  passed")

    print("\n" + "-" * 60)
    if all_failures:
        print(f"FAILED — {len(all_failures)} problem(s)")
        return 1
    print(f"PASSED — all {len(FEATURES)} feature flags are enforced")
    return 0


if __name__ == "__main__":
    sys.exit(main())


# ── pytest visibility ────────────────────────────────────────────────────────
# The checks above RETURN their failures instead of asserting, because this file
# is also a standalone runner (`python -m tests.test_feature_flag_enforcement`).
# Under pytest a returned list is not a failure — it is a
# PytestReturnNotNoneWarning and a PASS. So every check in this file was
# invisible to the suite: the standalone runner could report FAILED while
# `pytest` reported green, which is the worst possible split because CI trusts
# pytest.
#
# This wrapper is the bridge. It runs the same checks and asserts.
def test_all_feature_flag_checks_pass():
    checks = [
        test_every_feature_flag_is_enforced_somewhere,
        test_audit_and_decision_endpoints_are_never_gated,
        test_running_the_agent_stays_gated,
        test_no_gate_references_an_unknown_feature,
        test_plan_defaults_only_reference_known_features,
        test_lower_plans_do_not_silently_get_gated_capabilities,
    ]
    failures: list[str] = []
    for check in checks:
        failures.extend(check() or [])
    assert not failures, "; ".join(failures)
