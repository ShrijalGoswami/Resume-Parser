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
    """Map each route path to the set of feature flags gating it.

    `feature_gate("x", action=...)` returns a closure; the feature name lives in
    that closure's cells, which is how a gate is identified here regardless of
    whether it was attached at router or endpoint level.
    """
    found: dict[str, set[str]] = {}
    for path, dependant in _resolved_routes():
        for dep in dependant.dependencies:
            call = getattr(dep, "call", None)
            closure = getattr(call, "__closure__", None)
            if not closure or "feature_gate" not in getattr(call, "__qualname__", ""):
                continue
            for cell in closure:
                value = cell.cell_contents
                if isinstance(value, str) and value in FEATURES:
                    found.setdefault(path, set()).add(value)
    return found


def test_every_feature_flag_is_enforced_somewhere() -> list[str]:
    gated = _gated_features_by_path()
    enforced = {f for feats in gated.values() for f in feats}
    missing = sorted(set(FEATURES) - enforced)
    failures = []
    if missing:
        failures.append(
            f"FEATURES declared but enforced by no route: {missing}. "
            "Attach feature_gate(...) to the router or endpoint that serves the "
            "capability, or remove the flag from FEATURES."
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
    """The free plan must not resolve to a capability its defaults exclude."""
    failures = []
    for feature in FEATURES:
        expected = feature in _PLAN_DEFAULTS[Plan.free]
        actual = resolve(Plan.free.value, {}, feature)
        if actual != expected:
            failures.append(
                f"free plan resolve({feature!r}) = {actual}, expected {expected}"
            )
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
