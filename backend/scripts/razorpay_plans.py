"""
Create (or inspect) the Razorpay plans this product sells.

    python -m scripts.razorpay_plans --doctor        # is anything even reachable?
    python -m scripts.razorpay_plans                 # inspect; changes nothing
    python -m scripts.razorpay_plans --create        # create what is missing
    python -m scripts.razorpay_plans --manual        # print dashboard/cURL steps

Start with `--doctor`. A 401 from the Subscriptions API looks exactly like a bad
secret and usually is not one — see that function for the distinction.

WHY A SCRIPT AND NOT LAZY CREATION AT RUNTIME
---------------------------------------------
`plans.py` explains the rule this obeys: the application BINDS to plans, it
never creates them. Creating lazily means a typo, a race or a retried request
produces a SECOND plan with the same intent and a different id, and half the
customers end up on a plan nobody knows exists. Worse, Razorpay plans are
IMMUTABLE — "once a Plan is created, you cannot edit or delete it" — so the
duplicate cannot be cleaned up, only abandoned.

So creation is a deliberate, human-run act. This script is idempotent by
SEARCHING before it creates: it lists existing plans and matches on amount,
period and currency, so running it twice does not produce two plans.

DRY RUN BY DEFAULT. Creating a plan is irreversible; a script that does it
without being asked is a script that does it by accident.
"""
from __future__ import annotations

import argparse
import os
import sys
from typing import Optional

# Import the app package so `.env` / `.env.local` are exported to os.environ.
from app.core.config import settings  # noqa: F401  (import for its side effect)
from app.billing.providers.razorpay import plans as plan_bindings
from app.billing.providers.razorpay.config import is_configured, load_settings

#: Razorpay plan definitions, derived from the published prices so the script
#: and the boot check can never disagree about what a plan should cost.
PLAN_SPECS = {
    plan: {
        "period": "monthly",
        "interval": 1,
        "item": {
            "name": f"HireLens {plan.capitalize()}",
            "amount": money.minor_units,
            "currency": money.currency,
            "description": f"HireLens {plan.capitalize()} — monthly subscription (GST inclusive)",
        },
        "notes": {"hirelens_plan": plan},
    }
    for plan, money in plan_bindings.PUBLISHED_PRICE.items()
}


def _client():
    import razorpay

    cfg = load_settings(require_webhook_secret=False)
    if not cfg.is_test_mode:
        # A guard, not a preference. This script is for Test Mode; creating live
        # plans is a commercial act that should not be reachable by forgetting
        # which shell you are in.
        raise SystemExit(
            f"REFUSING: {cfg.key_id[:12]}… is a LIVE key. This script only "
            "operates in Test Mode. Set test credentials, or create live plans "
            "from the dashboard deliberately."
        )
    return razorpay.Client(auth=(cfg.key_id, cfg.key_secret))


def _find_existing(client, spec: dict) -> Optional[dict]:
    """A plan already charging the right amount, period and currency.

    Matched on the ITEM rather than on the name, because the name is cosmetic
    and the amount is the thing a customer's card feels. A plan named
    "HireLens Plus" that charges ₹1,999 is not the plan we want, and a plan
    named "plus-v2" that charges ₹999 is.
    """
    try:
        response = client.plan.all({"count": 100})
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"could not list plans: {exc}")

    want = spec["item"]
    for existing in (response or {}).get("items", []):
        item = existing.get("item") or {}
        if (
            existing.get("period") == spec["period"]
            and int(existing.get("interval") or 0) == spec["interval"]
            and int(item.get("amount") or -1) == want["amount"]
            and (item.get("currency") or "").upper() == want["currency"]
        ):
            return existing
    return None


def doctor() -> int:
    """Diagnose what is and is not working, without revealing a secret.

    THE DIAGNOSIS THIS EXISTS FOR. On 4 Aug 2026 `/v1/plans` returned
    `401 Unauthorized` with credentials that were entirely valid. Read alone,
    that sends you hunting for a mistyped secret — the wrong hunt, and a long
    one, because the secret is correct and looks correct.

    The tell is that `/v1/payments` returns **200** with the same credentials.
    Authentication is fine; it is the SUBSCRIPTIONS PRODUCT that is not enabled
    on the account. Razorpay gates Subscriptions behind account activation, so
    a merchant whose KYC is pending gets a 401 that says nothing about
    subscriptions.

    Probing an endpoint that is known to work is what separates "your key is
    wrong" from "this product is not switched on", and those have completely
    different fixes.
    """
    import requests

    print("Razorpay preflight\n" + "=" * 60)

    if not is_configured():
        print("\n  ✗ credentials are not set")
        print("    Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env.local")
        return 1

    cfg = load_settings(require_webhook_secret=False)
    print(f"\n  key id     {cfg.key_id[:12]}…")
    print(f"  mode       {'TEST' if cfg.is_test_mode else 'LIVE'}")
    print(f"  secret     set ({len(cfg.key_secret)} chars)")
    webhook = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()
    print(f"  webhook    {'set' if webhook else '— NOT SET —'}")

    probes = {
        "authentication": "/v1/payments?count=1",
        "subscriptions": "/v1/subscriptions?count=1",
        "plans": "/v1/plans?count=1",
    }
    results: dict[str, int] = {}
    print()
    for label, path in probes.items():
        try:
            response = requests.get(
                "https://api.razorpay.com" + path,
                auth=(cfg.key_id, cfg.key_secret), timeout=20,
            )
            results[label] = response.status_code
            mark = "✓" if response.status_code == 200 else "✗"
            print(f"  {mark} {label:<16} HTTP {response.status_code}")
        except Exception as exc:  # noqa: BLE001
            results[label] = 0
            print(f"  ? {label:<16} could not reach Razorpay: {exc}")

    print("\n" + "─" * 60)
    if results.get("authentication") == 200 and results.get("subscriptions") != 200:
        print("DIAGNOSIS: the credentials are VALID — authentication succeeds.")
        print("The Subscriptions product is not enabled on this account.\n")
        print("  Razorpay gates Subscriptions behind account activation, so this")
        print("  is expected while KYC is pending. It is NOT a bad key.\n")
        print("  Fix: Dashboard → Account & Settings → Products, request/enable")
        print("  Subscriptions. If it cannot be enabled before KYC completes,")
        print("  subscriptions cannot be created even in Test Mode.")
        return 2
    if results.get("authentication") != 200:
        print("DIAGNOSIS: authentication itself is failing.")
        print("  The key id and secret do not form a valid pair. Regenerate them")
        print("  in Dashboard → Account & Settings → API Keys and update .env.local.")
        return 1
    print("DIAGNOSIS: Subscriptions is reachable. Run --create to make the plans.")
    return 0


def inspect_plans() -> int:
    print("Razorpay plan bindings\n" + "─" * 60)
    if not is_configured():
        print("  credentials: NOT SET")
        print(f"  set {', '.join(sorted(plan_bindings.PLAN_ENV_VARS.values()))} after creating plans")
        print("\nRun with --manual for exactly what to create.")
        return 1

    cfg = load_settings(require_webhook_secret=False)
    print(f"  key id: {cfg.key_id[:12]}…   mode: {'TEST' if cfg.is_test_mode else 'LIVE'}")

    configured = plan_bindings.configured_plans()
    missing = [p for p in PLAN_SPECS if p not in configured]

    for plan, spec in PLAN_SPECS.items():
        want = spec["item"]
        bound = configured.get(plan)
        amount = f"{want['currency']} {want['amount'] / 100:,.0f}"
        env_var = plan_bindings.PLAN_ENV_VARS[plan]
        print(f"\n  {plan:<5} {amount:>12}   {env_var}")
        print(f"        bound to: {bound or '— NOT SET —'}")

    if missing:
        print(f"\n  {len(missing)} plan(s) not bound: {', '.join(missing)}")
        print("  Run with --create to create them, or --manual for the dashboard steps.")
        return 1

    # Everything bound — verify the gateway agrees with the published prices.
    try:
        client = _client()
        problems = plan_bindings.verify_bindings(lambda pid: client.plan.fetch(pid))
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f"\n  could not verify against the gateway: {exc}")
        return 1

    if problems:
        print("\n  MISMATCH — the gateway does not charge what the page advertises:")
        for problem in problems:
            print(f"    ✗ {problem}")
        return 1

    print("\n  ✓ every bound plan charges what the pricing page advertises")
    return 0


def create_plans() -> int:
    if not is_configured():
        raise SystemExit(
            "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set. "
            "Add them to backend/.env.local first."
        )
    client = _client()
    created: dict[str, str] = {}
    reused: dict[str, str] = {}

    for plan, spec in PLAN_SPECS.items():
        existing = _find_existing(client, spec)
        if existing:
            # Idempotence. Creating a second identical plan is not recoverable:
            # plans cannot be deleted.
            reused[plan] = existing["id"]
            print(f"  = {plan}: already exists as {existing['id']}")
            continue
        try:
            made = client.plan.create(spec)
        except Exception as exc:  # noqa: BLE001
            raise SystemExit(f"could not create the {plan} plan: {exc}")
        created[plan] = made["id"]
        print(f"  + {plan}: created {made['id']}")

    print("\nAdd these to backend/.env.local:\n")
    for plan in PLAN_SPECS:
        plan_id = created.get(plan) or reused.get(plan)
        print(f"    {plan_bindings.PLAN_ENV_VARS[plan]}={plan_id}")
    print("\nThen restart the backend and check the boot log for")
    print("    Razorpay plan bindings verified: plus, pro")
    return 0


def manual_instructions() -> int:
    """Exactly what to create by hand, for someone who would rather not run a
    script against their gateway account."""
    print("Create two plans in the Razorpay Dashboard (Test Mode)")
    print("=" * 60)
    print("\nDashboard → Subscriptions → Plans → + New Plan\n")
    for plan, spec in PLAN_SPECS.items():
        item = spec["item"]
        print(f"  {plan.upper()}")
        print(f"    Plan name        {item['name']}")
        print(f"    Billing frequency Monthly, every 1 cycle")
        print(f"    Amount           ₹{item['amount'] / 100:,.0f}  (enter {item['amount'] / 100:.0f}, not {item['amount']})")
        print(f"    Currency         {item['currency']}")
        print(f"    Description      {item['description']}")
        print(f"    → copy the plan_… id into {plan_bindings.PLAN_ENV_VARS[plan]}\n")

    print("Or with cURL (substitute your test key id and secret):\n")
    for plan, spec in PLAN_SPECS.items():
        item = spec["item"]
        print(f"  # {plan}")
        print("  curl -u $RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET \\")
        print("    -X POST https://api.razorpay.com/v1/plans \\")
        print("    -H 'Content-Type: application/json' \\")
        print("    -d '{")
        print(f'      "period": "monthly", "interval": 1,')
        print(f'      "item": {{ "name": "{item["name"]}", "amount": {item["amount"]},')
        print(f'                "currency": "{item["currency"]}" }},')
        print(f'      "notes": {{ "hirelens_plan": "{plan}" }}')
        print("    }'\n")

    print("IMPORTANT")
    print("  • Amounts are in PAISE. ₹999 is 99900. Getting this wrong by 100×")
    print("    is the defect the boot check exists to catch.")
    print("  • The advertised price is GST-INCLUSIVE — do not add tax on top.")
    print("  • Plans are IMMUTABLE. A wrong amount means creating a new plan and")
    print("    rebinding; it cannot be edited or deleted.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--create", action="store_true",
                       help="create any plan that does not already exist")
    group.add_argument("--manual", action="store_true",
                       help="print dashboard and cURL instructions instead")
    group.add_argument("--doctor", action="store_true",
                       help="diagnose credentials and account capabilities")
    args = parser.parse_args()

    if args.doctor:
        return doctor()
    if args.manual:
        return manual_instructions()
    if args.create:
        return create_plans()
    return inspect_plans()


if __name__ == "__main__":
    sys.exit(main())
