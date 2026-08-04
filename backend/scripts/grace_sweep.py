"""
Suspend organizations whose grace period has elapsed.

    python -m scripts.grace_sweep                 # dry run — changes nothing
    python -m scripts.grace_sweep --apply         # actually suspend
    python -m scripts.grace_sweep --at 2026-09-01T00:00:00Z   # what would happen then

DRY RUN BY DEFAULT, and `--apply` has no short form. This is the only operation
in the product that takes paid access away from a customer; it should never
happen because someone forgot a flag or mistyped one. Same posture as
`restore_founding_subscriptions.py`.

WHAT RUNS THIS
--------------
Nothing, yet — and that is deliberate. The trigger is a deployment decision that
has not been made:

  * **External cron / systemd timer** calling this script. Simplest, and the
    reason this is a script rather than an in-process loop. Once a day is
    plenty: the window is seven days, so the resolution that matters is hours.
  * **A scheduled platform job** (Vercel Cron, GitHub Actions, Supabase pg_cron
    calling an endpoint). Needs an authenticated route, which does not exist —
    an unauthenticated endpoint that suspends customers is not something to add
    speculatively.
  * **In-process scheduler.** Rejected: it dies with the process, runs once per
    worker rather than once per cluster, and makes "did it run?" unanswerable
    without reading application logs.

Until a trigger is wired, **no organization is ever suspended**. That is the
same behaviour as before this script existed, so nothing regresses by waiting —
but the grace period stays unbounded, which is BILL-2's whole point. Decide it
before the first live payment.

EXIT CODES
    0  ran cleanly (with or without suspensions)
    1  refused to run — schema not ready, or an error
    2  ran, but found stalled dunning that needs a human
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime, timezone
from typing import Optional

# Imported for its side effect: exports .env / .env.local into os.environ.
from app.core.config import settings  # noqa: F401
from app.billing.grace import GraceSweep, GraceSweepUnavailable


def _parse_at(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        raise SystemExit(f"--at is not an ISO-8601 timestamp: {value!r}")
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply", action="store_true",
        help="actually suspend. Without this, nothing is written.",
    )
    parser.add_argument(
        "--at", metavar="ISO8601",
        help="evaluate as if it were this moment (dry run planning)",
    )
    parser.add_argument(
        "--quiet", action="store_true", help="only print the summary",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.ERROR if args.quiet else logging.INFO,
        format="%(levelname)-8s %(message)s",
    )

    try:
        result = GraceSweep().run(apply=args.apply, at=_parse_at(args.at))
    except GraceSweepUnavailable as exc:
        print(f"REFUSED: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    print()
    print("Grace sweep" + ("  (DRY RUN — nothing was written)" if result.dry_run else ""))
    print("=" * 60)
    print(f"  evaluated at   {result.ran_at.isoformat() if result.ran_at else '?'}")
    print(f"  considered     {result.considered}")

    verb = "would suspend" if result.dry_run else "SUSPENDED"
    print(f"  {verb:<14} {len(result.suspended)}")
    for org in result.suspended:
        print(f"      {org}")

    if result.skipped:
        print(f"  skipped        {len(result.skipped)}")
        for item in result.skipped:
            print(f"      {item.organization_id}  — {item.reason}")

    if result.stalled:
        print()
        print(f"  ⚠ {len(result.stalled)} past their deadline but still in payment_failed.")
        print("    The gateway has not reported retries exhausted, so these are")
        print("    NOT suspended. A stuck dunning cycle looks exactly like this.")
        for org in result.stalled:
            print(f"      {org}")

    print()
    if result.dry_run and result.suspended:
        print("  Re-run with --apply to suspend.")
    return 2 if result.stalled else 0


if __name__ == "__main__":
    sys.exit(main())
