"""
Recover the subscription rows deleted from real, pre-monetization organizations.

WHY THIS IS A SCRIPT AND NOT A MIGRATION
----------------------------------------
This is data repair for specific rows in one database, not a schema change. A
migration would hardcode production organization ids into version control
forever and would run against every environment, where those ids mean nothing.
`scripts/set_org_plan.py` already establishes the pattern: a change to
`subscriptions` is an operator act, performed with the service role, audited,
and reviewable — which is exactly what this is.

WHAT HAPPENED
-------------
Test-account teardown deleted 83 subscription rows over the life of the project
while removing only 8 organizations, leaving organizations orphaned and, for two
real accounts, with no subscription row at all. A missing row resolves to `v1`
at read time (`normalize_ruleset(None)` → `v1`), which is correct for a new
organization and a silent demotion for an old one — so two pre-monetization
accounts quietly lost the FOUNDING grandfathering.

Full analysis: `docs/rca/SUBSCRIPTION_ROWS_MISSING.md`.

WHAT THIS RESTORES, AND WHAT IT DELIBERATELY DOES NOT
-----------------------------------------------------
Restored, per the approved decision (Option E):

    plan              free       ← NOT the value in organizations.plan
    plan_ruleset      founding   ← the grandfather promise
    status            active
    billing_mode      none
    billing_provider  null

**The old `enterprise` value is deliberately NOT restored.** `organizations.plan`
still reads `enterprise` for one of these organizations, but the audit log shows
it was self-granted on 21 and 24 Jul through `PATCH /org/subscription` — the
free self-upgrade hole that Phase 1 removed. Restoring it would restore an
exploit, not a plan anyone sold. Under the FOUNDING ruleset the capability set
is unchanged by the plan value anyway: founding organizations hold every feature
and no limits regardless.

The 67 orphaned QA organizations are deliberately left alone. They have no
recruiter, no members and no data; giving them founding rows would invent 67
grandfathered "customers" who do not exist and permanently misstate the base.
They are a separate data-hygiene task.

SELECTION IS BY RULE, NOT BY ID
-------------------------------
The script selects organizations that:

    1. have a live recruiter          → somebody can actually sign in
    2. were created before the cutoff → predate monetization
    3. have no subscription row       → are actually broken

That is reviewable in a way that two pasted UUIDs is not, and it re-runs safely:
once repaired, criterion 3 excludes them.

Usage
-----
  python -m scripts.restore_founding_subscriptions            # dry run (default)
  python -m scripts.restore_founding_subscriptions --apply --reason "..."
  python -m scripts.restore_founding_subscriptions --undo --reason "..."

Dry run is the default because the failure that created this problem was an
unreviewed destructive operation against production.
"""
from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone

from app.db.supabase_client import get_service_client

#: Organizations created before this predate the monetization rollout (0016).
#: Anything newer is correctly `v1` and must not be marked founding.
MONETIZATION_CUTOFF = "2026-07-31T00:00:00+00:00"

#: How many organizations this repair is expected to touch. The RCA established
#: exactly two. If the real number differs, the database is not in the state the
#: analysis described and the script refuses rather than guessing — a repair that
#: silently touches more rows than expected is the same class of accident it is
#: fixing.
EXPECTED_COUNT = 2


def _rows(resp):
    return getattr(resp, "data", None) or []


def _client():
    try:
        return get_service_client()
    except Exception as exc:  # pragma: no cover - operator feedback path
        print(f"cannot reach Supabase: {exc}")
        raise SystemExit(2)


def find_targets(client) -> list[dict]:
    """Organizations that are real, pre-monetization, and missing a subscription."""
    orgs = _rows(
        client.table("organizations")
        .select("id,name,plan,created_at")
        .lt("created_at", MONETIZATION_CUTOFF)
        .execute()
    )
    recruiters = _rows(client.table("recruiters").select("organization_id,email").execute())
    subs = _rows(client.table("subscriptions").select("organization_id").execute())

    live = {r["organization_id"]: r["email"] for r in recruiters if r.get("organization_id")}
    has_sub = {s["organization_id"] for s in subs}

    targets = []
    for org in orgs:
        if org["id"] in has_sub:
            continue
        if org["id"] not in live:
            continue  # orphaned QA shell — deliberately left alone
        targets.append({**org, "recruiter": live[org["id"]]})
    return sorted(targets, key=lambda o: o["created_at"])


def _describe(targets: list[dict]) -> None:
    print(f"\n{len(targets)} organization(s) selected:\n")
    for org in targets:
        print(f"  {org['id']}")
        print(f"    name           {org['name']}")
        print(f"    recruiter      {org['recruiter']}")
        print(f"    created        {org['created_at'][:19]}")
        print(f"    organizations.plan  {org['plan']}  <- NOT restored (see module docstring)")
        print("    will restore   plan=free  plan_ruleset=founding  status=active  billing_mode=none")
        print()


def cmd_apply(args) -> int:
    client = _client()
    targets = find_targets(client)

    if not targets:
        print("Nothing to do — every real pre-monetization organization already has a subscription.")
        return 0

    _describe(targets)

    if len(targets) != EXPECTED_COUNT and not args.force:
        print(f"REFUSING: expected {EXPECTED_COUNT} organization(s), found {len(targets)}.")
        print("The database is not in the state the RCA described. Re-read")
        print("docs/rca/SUBSCRIPTION_ROWS_MISSING.md before overriding with --force.")
        return 1

    if not args.apply:
        print("DRY RUN — nothing written. Re-run with --apply --reason \"...\" to perform it.")
        return 0

    now = datetime.now(timezone.utc).isoformat()
    written = 0
    for org in targets:
        client.table("subscriptions").insert({
            "organization_id": org["id"],
            "plan": "free",
            "status": "active",
            "plan_ruleset": "founding",
            "billing_mode": "none",
            "limits": {},
        }).execute()
        client.table("audit_logs").insert({
            "organization_id": org["id"],
            "action": "subscription.restored",
            "resource_type": "subscription",
            "metadata": {
                "reason": args.reason,
                "plan_ruleset": "founding",
                "plan": "free",
                "organizations_plan_at_restore": org["plan"],
                "rca": "docs/rca/SUBSCRIPTION_ROWS_MISSING.md",
                "restored_at": now,
            },
        }).execute()
        written += 1
        print(f"  restored  {org['id']}  {org['recruiter']}")

    print(f"\n{written} subscription(s) restored as FOUNDING. Audited as subscription.restored.")
    return 0


def cmd_undo(args) -> int:
    """Remove rows this script created. Reversibility, not a general delete tool."""
    client = _client()
    restored = _rows(
        client.table("audit_logs")
        .select("organization_id")
        .eq("action", "subscription.restored")
        .execute()
    )
    org_ids = sorted({r["organization_id"] for r in restored if r.get("organization_id")})
    if not org_ids:
        print("No subscription.restored audit entries — nothing this script created.")
        return 0

    print(f"\n{len(org_ids)} organization(s) were restored by this script:")
    for oid in org_ids:
        print(f"  {oid}")

    if not args.apply:
        print("\nDRY RUN — nothing deleted. Re-run with --apply --reason \"...\".")
        return 0

    for oid in org_ids:
        # Only rows still matching what we wrote. A row someone has since
        # changed is no longer ours to remove.
        client.table("subscriptions").delete() \
            .eq("organization_id", oid).eq("plan_ruleset", "founding").eq("plan", "free").execute()
        client.table("audit_logs").insert({
            "organization_id": oid,
            "action": "subscription.restore_reverted",
            "resource_type": "subscription",
            "metadata": {"reason": args.reason},
        }).execute()
        print(f"  reverted  {oid}")
    return 0


def cmd_verify(args) -> int:
    """Read-only: what the repair produced."""
    client = _client()
    subs = _rows(client.table("subscriptions").select("*").execute())
    orgs = _rows(client.table("organizations").select("id,name").execute())
    names = {o["id"]: o["name"] for o in orgs}

    print(f"\nsubscriptions: {len(subs)}")
    for s in sorted(subs, key=lambda x: x.get("created_at") or ""):
        print(f"  {s['organization_id']}  plan={s['plan']:<6} ruleset={s['plan_ruleset']:<9} "
              f"status={s['status']:<8} billing_mode={s.get('billing_mode')}  "
              f"{names.get(s['organization_id'], '?')[:34]}")

    remaining = find_targets(client)
    print(f"\nreal pre-monetization organizations still missing a subscription: {len(remaining)}")
    return 0 if not remaining else 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Restore founding subscriptions for real pre-monetization organizations.",
    )
    sub = parser.add_subparsers(dest="cmd")

    p_run = sub.add_parser("run", help="Restore the missing rows (dry run unless --apply)")
    p_run.add_argument("--apply", action="store_true", help="actually write")
    p_run.add_argument("--reason", default="", help="why (recorded in the audit row)")
    p_run.add_argument("--force", action="store_true",
                       help=f"proceed even if the count is not {EXPECTED_COUNT}")
    p_run.set_defaults(func=cmd_apply)

    p_undo = sub.add_parser("undo", help="Remove rows this script created")
    p_undo.add_argument("--apply", action="store_true", help="actually delete")
    p_undo.add_argument("--reason", default="", help="why (recorded in the audit row)")
    p_undo.set_defaults(func=cmd_undo)

    p_ver = sub.add_parser("verify", help="Read-only report")
    p_ver.set_defaults(func=cmd_verify)

    args = parser.parse_args(argv)
    if not getattr(args, "cmd", None):
        args = parser.parse_args(["run"])

    if getattr(args, "apply", False) and not args.reason:
        print("--reason is required with --apply. A repair with no recorded reason is")
        print("indistinguishable from the unreviewed operation that caused this.")
        return 1

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
