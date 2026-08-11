"""
Monetization audit — every route, classified.

The question this answers is not "are the gates I wrote still there" (that is
`test_entitlement_enforcement` / `test_quota_enforcement`) but the harder one:
**is there any route that reaches paid value without passing through
`PlanService`?** A monetization layer is only worth what its least-protected
endpoint allows, and the endpoints that get missed are never the famous ones —
they are the stateless leftovers and the subsystems nobody remembered were in
the product.

It works by inventory: every route in the live application must appear in exactly
one bucket below, and an unclassified route is a failure. That way a NEW route
cannot be added without someone deciding which bucket it belongs in.

Runnable without pytest:  python -m tests.test_monetization_audit
(from backend/, with the project venv active)
"""
from __future__ import annotations

import inspect
import sys

from app.enterprise.catalog import FEATURE_KEYS
from tests.test_feature_flag_enforcement import _resolved_routes

# ── Buckets ─────────────────────────────────────────────────────────────────

#: Routes whose access IS a plan capability. Verified by finding the gate.
ENTITLEMENT_GATED_PREFIXES = (
    "/api/v1/copilot", "/api/v1/search", "/api/v1/reports",
    "/api/v1/analytics", "/api/v1/export-report", "/api/v1/export-match-report",
    # Gated by the monetization audit (1 Aug 2026) once their tiers were decided:
    # Prediction and Knowledge at Pro, Integrations at Pro with webhooks at
    # Enterprise.
    "/api/v1/prediction", "/api/v1/knowledge", "/api/v1/integrations",
)

#: Routes that consume a metered allowance. Verified by finding the check in the
#: handler body (the amount is only known at request time, so these cannot be
#: dependency-gated).
QUOTA_METERED = {
    "/api/v1/batch-analysis": "can_upload_resume",
    "/api/v1/ats-analysis": "can_upload_resume",
    "/api/v1/match-analysis": "can_upload_resume",
    "/api/v1/campaigns": "can_create_campaign",
    "/api/v1/campaigns/{campaign_id}/persist-batch": "can_upload_resume",
    "/api/v1/org/members": "can_invite_member",
}

#: Routes that reach no paid value: free-tier product, CRUD over data the
#: customer already owns, org administration, health. Each is here because
#: gating it would either sell the floor of the product or hide a customer's own
#: records from them.
NO_PAID_VALUE = {
    "/health", "/docs",
    "/api/v1/me", "/api/v1/activity",
    # Org administration — RBAC's job, not the plan's.
    "/api/v1/org", "/api/v1/org/context", "/api/v1/org/workspaces",
    "/api/v1/org/switch-workspace", "/api/v1/org/members/{member_id}",
    "/api/v1/org/roles", "/api/v1/org/feature-flags", "/api/v1/org/usage",
    "/api/v1/org/audit-logs", "/api/v1/org/subscription",
    "/api/v1/org/api-keys", "/api/v1/org/api-keys/{key_id}",
    # AI gateway operations — provider/model names and counters, no secrets.
    "/api/v1/ai/config", "/api/v1/ai/usage", "/api/v1/ai/health",
    "/api/v1/ai/provider", "/api/v1/ai/qa/reset",
    # Pipeline CRUD over the customer's own candidates and roles.
    "/api/v1/campaigns/{campaign_id}",
    "/api/v1/campaigns/{campaign_id}/activity",
    "/api/v1/campaigns/{campaign_id}/candidates",
    "/api/v1/campaigns/{campaign_id}/candidates/bulk-delete",
    "/api/v1/campaigns/{campaign_id}/candidates/{candidate_id}",
    "/api/v1/campaigns/{campaign_id}/candidates/{candidate_id}/activity",
    "/api/v1/campaigns/{campaign_id}/candidates/{candidate_id}/notes",
    "/api/v1/campaigns/{campaign_id}/candidates/{candidate_id}/notes/{note_id}",
    "/api/v1/campaigns/{campaign_id}/candidates/{candidate_id}/stage",
    "/api/v1/campaigns/{campaign_id}/candidates/{candidate_id}/resume",
    "/api/v1/campaigns/{campaign_id}/candidates/{candidate_id}/resume-url",
    # Gated per-endpoint inside their routers (asserted elsewhere).
    "/api/v1/campaigns/{campaign_id}/compare",
    "/api/v1/campaigns/{campaign_id}/candidates/{candidate_id}/interview",
    "/api/v1/agent/scan", "/api/v1/agent/workflows",
    # Deliberately never gated — see UNGATEABLE in test_feature_flag_enforcement.
    "/api/v1/agent/recommendations", "/api/v1/agent/recommendations/{rec_id}",
    # ── Billing (Phase 4 Step 4) ─────────────────────────────────────────────
    # BILLING IS HOW AN ORGANIZATION ACQUIRES A PLAN. Gating any of these on an
    # entitlement would be a lock on the door to the shop: a Free org would need
    # a paid capability in order to become paid. They are protected by RBAC
    # instead — `require_permission(ORG_MANAGE)`, which is owner-only, because
    # spending the organization's money is the same class of act as disposing of
    # the account.
    #
    # The webhook is the exception to the exception: it carries no permission
    # either, because Razorpay has no session. Its identity is the HMAC
    # signature over the raw body, verified in the adapter before anything is
    # read, and an unverified envelope is refused rather than processed.
    #
    # It is hidden from the OpenAPI schema (`include_in_schema=False`) so it is
    # not advertised as product API — but this audit reads the ROUTE GRAPH, not
    # the schema, which is exactly right: a route that is unreachable in the
    # documentation is still reachable over HTTP, and an inventory that trusted
    # `include_in_schema` would be blind to precisely the endpoints someone
    # wanted to keep quiet.
    "/api/v1/billing/subscriptions",
    "/api/v1/billing/subscriptions/verify",
    # Moves a live subscription up a tier, effective at the cycle end. Same
    # posture as its siblings: owner-only via `ORG_MANAGE`, and gating it on a
    # paid capability would be the same circularity — you would have to already
    # hold the tier you are trying to move to.
    "/api/v1/billing/subscriptions/plan-change",
    "/api/v1/billing/subscriptions/cancel",
    "/api/v1/billing/webhook/razorpay",
}

#: Reachable paid value that is NOT gated, each with the reason it is not, and
#: the decision still owed. This bucket is meant to be SMALL and to shrink. It
#: exists so an unresolved gap is recorded in the codebase rather than
#: remembered — an audit finding with no home is an audit finding that returns.
KNOWN_UNGATED: dict[str, str] = {
    "/api/v1/campaigns/{campaign_id}/embeddings/reindex":
        "Builds the semantic-search index and costs embedding compute, but "
        "gating it on `semantic_search` would BREAK FREE UPLOADS: the add-"
        "candidates flow calls reindex as its third step, so a 402 there fails "
        "an upload that has already succeeded. Same shape as the agent/Ledger "
        "incident. Retrieval (/search/*) is gated; index-building is not.",
}


def _inventory() -> dict[str, dict]:
    """path → {entitlements, quota_calls}, from the live route graph."""
    out: dict[str, dict] = {}
    for path, dep in _resolved_routes():
        entry = out.setdefault(path, {"entitlements": set(), "quota": set()})
        for d in getattr(dep, "dependencies", []):
            call = getattr(d, "call", None)
            qn = getattr(call, "__qualname__", "")
            if not ("require_entitlement" in qn or "feature_gate" in qn):
                continue
            for cell in (getattr(call, "__closure__", None) or []):
                v = cell.cell_contents
                if isinstance(v, str) and v in FEATURE_KEYS:
                    entry["entitlements"].add(v)
        fn = getattr(dep, "call", None)
        try:
            body = inspect.getsource(fn) if fn else ""
        except Exception:
            body = ""
        for method in ("can_upload_resume", "can_invite_member", "can_create_campaign",
                       "can_export", "can_use_own_api_key"):
            if method in body:
                entry["quota"].add(method)
    return out


def test_every_route_is_classified() -> list[str]:
    """No route may exist without a decision about whether it is monetized."""
    inv = _inventory()
    known = set(NO_PAID_VALUE) | set(QUOTA_METERED) | set(KNOWN_UNGATED)
    failures = []
    for path in sorted(inv):
        if path in known or path.startswith(ENTITLEMENT_GATED_PREFIXES):
            continue
        failures.append(
            f"{path} is not classified. Add it to NO_PAID_VALUE, QUOTA_METERED, "
            f"an entitlement gate, or KNOWN_UNGATED with a reason."
        )
    print(f"  {len(inv)} routes inventoried, {len(failures)} unclassified")
    return failures


def test_entitlement_gated_routes_really_are() -> list[str]:
    """Every route claiming to be plan-gated carries an actual gate."""
    inv = _inventory()
    failures = []
    for path, entry in sorted(inv.items()):
        if not path.startswith(ENTITLEMENT_GATED_PREFIXES):
            continue
        if not entry["entitlements"]:
            failures.append(f"{path} is in a gated family but carries NO entitlement gate")
        else:
            print(f"  ok  {path} -> {sorted(entry['entitlements'])}")
    return failures


def test_metered_routes_check_their_quota() -> list[str]:
    """Every metered route calls the quota it is supposed to, and acts on it."""
    inv = _inventory()
    failures = []
    for path, expected in sorted(QUOTA_METERED.items()):
        entry = inv.get(path)
        if entry is None:
            failures.append(f"{path} no longer exists — remove it from QUOTA_METERED")
        elif expected not in entry["quota"]:
            failures.append(f"{path} no longer calls {expected}()")
        else:
            print(f"  ok  {path} -> {expected}()")
    return failures


def test_stateless_analysis_endpoints_are_metered() -> list[str]:
    """The specific hole this audit found.

    /ats-analysis and /match-analysis each accept a résumé file and run the AI
    pipeline on it, and neither was metered. An authenticated FREE account could
    therefore analyse résumés without limit and never reach the wall — the free
    tier given away one file at a time. They are stateless, so they must both
    check AND consume, unlike the batch flow which consumes at persist.
    """
    from app.routes import analyze, match
    failures = []
    for module, handler in ((analyze, "ats_analysis"), (match, "match_analysis")):
        src = inspect.getsource(getattr(module, handler))
        if "can_upload_resume" not in src:
            failures.append(f"{module.__name__}.{handler} does not check the résumé quota")
        elif "record_resumes" not in src:
            failures.append(
                f"{module.__name__}.{handler} checks the quota but never consumes it — "
                f"usage never rises, so the check can never fail"
            )
        else:
            print(f"  ok  {module.__name__.split('.')[-1]}.{handler} checks and consumes")
    return failures


def test_known_ungated_list_is_still_accurate() -> list[str]:
    """A route that HAS since been gated must leave this list.

    Otherwise the list becomes a graveyard nobody trusts, and a real gap hides
    among stale entries.
    """
    inv = _inventory()
    failures = []
    for path in sorted(KNOWN_UNGATED):
        entry = inv.get(path)
        if entry is None:
            failures.append(f"{path} no longer exists — remove it from KNOWN_UNGATED")
        elif entry["entitlements"] or entry["quota"]:
            failures.append(
                f"{path} is now protected ({sorted(entry['entitlements'] | entry['quota'])}) "
                f"— remove it from KNOWN_UNGATED"
            )
    print(f"  {len(KNOWN_UNGATED)} recorded gaps, all still accurate")
    return failures


def main() -> int:
    checks = [
        test_every_route_is_classified,
        test_entitlement_gated_routes_really_are,
        test_metered_routes_check_their_quota,
        test_stateless_analysis_endpoints_are_metered,
        test_known_ungated_list_is_still_accurate,
    ]
    failures: list[str] = []
    for check in checks:
        print(f"\n{check.__name__}")
        found = check()
        for f in found:
            print(f"  FAIL  {f}")
        if not found:
            print("  passed")
        failures.extend(found)

    print("\n" + "-" * 60)
    if failures:
        print(f"FAILED - {len(failures)} problem(s)")
        return 1
    print(f"PASSED - every route classified; {len(KNOWN_UNGATED)} recorded gaps awaiting a "
          f"pricing decision")
    return 0


if __name__ == "__main__":
    sys.exit(main())


# ── pytest visibility ────────────────────────────────────────────────────────
# The checks above RETURN their failures so this file can also run standalone.
# Under pytest a returned list is a PASS with a warning, not a failure — so
# without this wrapper every check here would be invisible to CI while the
# standalone runner reported FAILED. This bridges the two.
def test_all_checks_pass():
    failures: list[str] = []
    for check in (
        test_every_route_is_classified,
        test_entitlement_gated_routes_really_are,
        test_metered_routes_check_their_quota,
        test_stateless_analysis_endpoints_are_metered,
        test_known_ungated_list_is_still_accurate,
    ):
        failures.extend(check() or [])
    assert not failures, "; ".join(failures)
