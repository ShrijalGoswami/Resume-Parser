"""
Set an organization's subscription plan (operator tool).

This is the ONLY sanctioned way to change a plan until the billing webhook ships
in Phase 3. `PATCH /org/subscription` was removed because it let any organization
owner grant themselves the enterprise plan for free, and migration 0016 revokes
write access to `subscriptions` from the client roles — so a plan change now
requires the service role, which means it requires this script (or the webhook).

Every change writes an `audit_logs` row. A plan change with no audit trail is
indistinguishable from the hole this replaced.

What it deliberately does not do:
  * create subscriptions for organizations that do not exist
  * accept a plan outside the catalog (a typo'd plan silently resolves to free
    at read time, which looks like a downgrade bug weeks later)
  * change `plan_ruleset`. Moving an organization between the FOUNDING and v1
    rulesets is a separate, rarer decision — use `--ruleset` explicitly.

Usage
-----
  python -m scripts.set_org_plan show   <org-id>
  python -m scripts.set_org_plan set    <org-id> --plan pro [--reason "..."]
  python -m scripts.set_org_plan set    <org-id> --plan free --ruleset v1
  python -m scripts.set_org_plan list   [--plan free]

`show` and `list` are read-only. `set` prints the before/after and requires
`--reason` so the audit row says why.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone

from app.db.supabase_client import get_service_client
from app.enterprise.catalog import PLAN_KEYS, RULESETS, normalize_plan


def _rows(resp):
    data = getattr(resp, "data", None)
    return data if isinstance(data, list) else ([] if data is None else [data])


def _client():
    return get_service_client()


def _subscription(client, org_id: str) -> dict | None:
    rows = _rows(client.table("subscriptions").select("*").eq("organization_id", org_id).limit(1).execute())
    return rows[0] if rows else None


def _organization(client, org_id: str) -> dict | None:
    rows = _rows(client.table("organizations").select("id,name,plan").eq("id", org_id).limit(1).execute())
    return rows[0] if rows else None


def cmd_show(args) -> int:
    client = _client()
    org = _organization(client, args.org_id)
    if not org:
        print(f"No organization {args.org_id}", file=sys.stderr)
        return 1
    sub = _subscription(client, args.org_id)
    print(f"organization : {org['name']} ({org['id']})")
    print(f"  org.plan   : {org.get('plan')}   (read-model mirror)")
    if sub:
        print(f"  plan       : {sub.get('plan')}")
        print(f"  status     : {sub.get('status')}")
        print(f"  ruleset    : {sub.get('plan_ruleset')}")
        print(f"  version    : {sub.get('plan_version')}")
        print(f"  overrides  : {sub.get('limit_overrides')}")
    else:
        print("  (no subscription row — resolves to free)")
    return 0


def cmd_list(args) -> int:
    client = _client()
    q = client.table("subscriptions").select("organization_id,plan,status,plan_ruleset")
    if args.plan:
        q = q.eq("plan", args.plan)
    rows = _rows(q.execute())
    for r in rows:
        print(f"{r['organization_id']}  {r.get('plan'):<10} {r.get('status'):<10} {r.get('plan_ruleset')}")
    print(f"\n{len(rows)} subscription(s)")
    return 0


def cmd_set(args) -> int:
    plan = normalize_plan(args.plan)
    if plan.value != args.plan:
        print(f"Plan '{args.plan}' is not a catalog plan. Valid: {', '.join(PLAN_KEYS)}", file=sys.stderr)
        return 2
    if args.ruleset and args.ruleset not in RULESETS:
        print(f"Unknown ruleset '{args.ruleset}'. Valid: {', '.join(RULESETS)}", file=sys.stderr)
        return 2

    client = _client()
    org = _organization(client, args.org_id)
    if not org:
        print(f"No organization {args.org_id}", file=sys.stderr)
        return 1
    before = _subscription(client, args.org_id) or {}

    patch = {
        "organization_id": args.org_id,
        "plan": plan.value,
        "status": "active",
        "plan_started_at": datetime.now(timezone.utc).isoformat(),
        "plan_version": int(before.get("plan_version") or 0) + 1,
    }
    if args.ruleset:
        patch["plan_ruleset"] = args.ruleset

    client.table("subscriptions").upsert(patch, on_conflict="organization_id").execute()
    # Keep the denormalized read model on `organizations` in step (see 0016 notes).
    client.table("organizations").update({"plan": plan.value}).eq("id", args.org_id).execute()

    client.table("audit_logs").insert({
        "organization_id": args.org_id,
        "user_id": None,
        "user_email": "operator:set_org_plan",
        "action": "subscription.changed",
        "resource_type": "subscription",
        "resource_id": args.org_id,
        "metadata": {
            "from": before.get("plan"), "to": plan.value,
            "from_ruleset": before.get("plan_ruleset"), "to_ruleset": args.ruleset,
            "reason": args.reason, "via": "scripts.set_org_plan",
        },
    }).execute()

    after = _subscription(client, args.org_id) or {}
    print(f"{org['name']} ({args.org_id})")
    print(f"  plan    : {before.get('plan')} -> {after.get('plan')}")
    print(f"  ruleset : {before.get('plan_ruleset')} -> {after.get('plan_ruleset')}")
    print(f"  version : {before.get('plan_version')} -> {after.get('plan_version')}")
    print("  audited : subscription.changed")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Set an organization's plan (service role).")
    sub = parser.add_subparsers(dest="command", required=True)

    p_show = sub.add_parser("show", help="Show one organization's plan state (read-only)")
    p_show.add_argument("org_id")
    p_show.set_defaults(func=cmd_show)

    p_list = sub.add_parser("list", help="List subscriptions (read-only)")
    p_list.add_argument("--plan", default=None)
    p_list.set_defaults(func=cmd_list)

    p_set = sub.add_parser("set", help="Change a plan (audited)")
    p_set.add_argument("org_id")
    p_set.add_argument("--plan", required=True, help=f"one of: {', '.join(PLAN_KEYS)}")
    p_set.add_argument("--ruleset", default=None, help=f"one of: {', '.join(RULESETS)}")
    p_set.add_argument("--reason", required=True, help="why (recorded in the audit row)")
    p_set.set_defaults(func=cmd_set)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
