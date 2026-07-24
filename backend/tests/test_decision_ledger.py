"""
Runtime Decision-Ledger Immutability Suite — the canonical runtime validation for
A2 (Launch Sprint).

Behavioral proof that a decided recommendation is a PERMANENT record: it cannot be
re-decided, its decision metadata is frozen, and the DB trigger enforces this even
when the service-layer guard is bypassed (direct user-token client). Complements
A1 (cross-tenant denial) and A6 (workflow success).

Guarantees validated (all against the live backend + live Supabase):
  * G1  Schema live — decided_at / decided_by columns exist (migration 0015).
  * G2  Deciding a pending rec stamps decided_at + decided_by and sets status.
  * G3  Re-deciding via the API is rejected (409); ground truth unchanged.
  * G4  Un-deciding / invalid targets rejected (400); ground truth unchanged.
  * G5  DB trigger is the authority — a direct user-client re-decision is blocked.
  * G6  decided_at is frozen across every rejected attempt.
  * G7  Approve is idempotent — a second approve is impossible (409), so its
        integration/knowledge side-effects cannot re-fire.

SAFETY: destructive. Reuses the A1 preflight gate + teardown. Runs only when
HL_ALLOW_DESTRUCTIVE_TESTS=1, ENVIRONMENT is non-production, Supabase configured,
and only as __main__.

Run:  python -m tests.test_decision_ledger      (from backend/, venv active)
Writes docs/qa/RUNTIME_VALIDATION_A2.md from the results.
"""
from __future__ import annotations

import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from app.core.config import settings
from tests import _authz_helpers as H

# Diagnostics-only: force UTF-8 on the console streams (Windows cp1252 safety).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, ValueError):  # pragma: no cover
        pass

REPO_ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = REPO_ROOT / "docs" / "qa" / "RUNTIME_VALIDATION_A2.md"

RESULTS: list[dict] = []


def record(g: str, name: str, status: str, detail: str = "") -> None:
    RESULTS.append({"g": g, "name": name, "status": status, "detail": detail})
    print(f"  [{status:8}] {name}" + (f" — {detail}" if detail else ""))


def check(g: str, name: str, cond: bool, detail: str = "") -> bool:
    record(g, name, "PASS" if cond else "FAIL", detail)
    return bool(cond)


# ── Fixture ──────────────────────────────────────────────────────────────────
def enable_agent_feature(svc: Any, actor: H.Actor) -> None:
    """Fixture-only: the /agent router is gated by feature_gate('autonomous_agent'),
    which the auto-provisioned Free-plan org does not enable. Provision the test org
    into a supported configuration (business/enterprise plans enable it by default)
    via the standard org feature override so the gated decision endpoint is
    reachable. Touches ONLY the test org's feature flags — no product/migration/logic
    change and no runtime assertion is altered."""
    H.load_org(svc, actor)  # resolves actor.org_id from the signup-provisioned org
    if not actor.org_id:
        raise RuntimeError("could not resolve test org id to enable autonomous_agent")
    svc.table("org_feature_flags").upsert(
        {"organization_id": actor.org_id, "flag": "autonomous_agent", "enabled": True},
        on_conflict="organization_id,flag",
    ).execute()


def seed_pending_rec(svc: Any, actor: H.Actor) -> str:
    """Create a campaign (API, under the user's token) + one PENDING recommendation
    (service client — no LLM call)."""
    r = H.api("POST", "/campaigns", token=actor.token,
              json={"title": "A2 Ledger", "job_description": "A2 immutability fixture."})
    if r.status_code not in (200, 201):
        raise RuntimeError(f"seed campaign failed: {r.status_code} {r.text}")
    campaign_id = r.json()["id"]
    rec = svc.table("agent_recommendations").insert({
        "recruiter_id": actor.user_id, "workflow": "a2_test",
        "dedupe_key": f"a2-{uuid.uuid4().hex[:12]}", "title": "A2 fixture rec",
        "campaign_id": campaign_id, "status": "pending",
    }).execute().data[0]
    return rec["id"]


def _status_of(svc: Any, rec_id: str) -> Optional[str]:
    row = H.svc_row(svc, "agent_recommendations", rec_id)
    return (row or {}).get("status")


def _decided_at_of(svc: Any, rec_id: str) -> Any:
    row = H.svc_row(svc, "agent_recommendations", rec_id)
    return (row or {}).get("decided_at")


# ── Stages ───────────────────────────────────────────────────────────────────
def run_ledger_checks(svc: Any, actor: H.Actor, rec_id: str) -> None:
    # G1 — schema live (columns exist)
    schema_ok = True
    try:
        svc.table("agent_recommendations").select("decided_at,decided_by").limit(1).execute()
    except Exception:
        schema_ok = False
    check("G1", "decided_at/decided_by columns exist (migration 0015 applied)", schema_ok)

    # G2 — decide a pending rec (pending → approved) stamps metadata
    dec = H.api("PATCH", f"/agent/recommendations/{rec_id}", token=actor.token,
                json={"status": "approved"})
    body = dec.json() if dec.status_code == 200 else {}
    check("G2", "Decide pending → approved (200)", dec.status_code == 200,
          f"status={dec.status_code}")
    check("G2", "Decision stamps decided_at (immutable metadata set)",
          bool(body.get("decided_at")))
    check("G2", "Decision records decided_by = the deciding recruiter",
          body.get("decided_by") == actor.user_id)
    frozen_decided_at = _decided_at_of(svc, rec_id)

    # G3 — re-decide via API is rejected (409), ground truth intact
    re = H.api("PATCH", f"/agent/recommendations/{rec_id}", token=actor.token,
               json={"status": "rejected"})
    check("G3", "Re-decide approved → rejected via API is rejected (409)",
          re.status_code == 409, f"status={re.status_code}")
    check("G3", "Ground truth unchanged after re-decide attempt (still approved)",
          _status_of(svc, rec_id) == "approved")

    # G4 — invalid target (un-decide to pending) rejected (400)
    un = H.api("PATCH", f"/agent/recommendations/{rec_id}", token=actor.token,
               json={"status": "pending"})
    check("G4", "Un-decide approved → pending is rejected (400)",
          un.status_code == 400, f"status={un.status_code}")
    check("G4", "Ground truth unchanged after un-decide attempt (still approved)",
          _status_of(svc, rec_id) == "approved")

    # G5 — DB trigger is the authority: bypass the service, hit the row directly
    # as the user (RLS allows the row; the trigger must still refuse the change).
    uca = H.user_client(actor.token)
    direct_blocked = False
    try:
        uca.table("agent_recommendations").update({"status": "rejected"}).eq("id", rec_id).execute()
        # If no exception, the change must NOT have taken effect.
        direct_blocked = _status_of(svc, rec_id) == "approved"
    except Exception:
        direct_blocked = True  # trigger raised — the authoritative block
    check("G5", "DB trigger blocks a direct user-client re-decision (authority)",
          direct_blocked and _status_of(svc, rec_id) == "approved")

    # G6 — decided_at frozen across all rejected attempts
    check("G6", "decided_at is frozen (unchanged after every rejected attempt)",
          _decided_at_of(svc, rec_id) == frozen_decided_at)

    # G7 — approve idempotency: a second approve is impossible (409), so the
    # approval side-effects (integration dispatch + knowledge ingest) cannot re-fire.
    again = H.api("PATCH", f"/agent/recommendations/{rec_id}", token=actor.token,
                  json={"status": "approved"})
    check("G7", "Second approve is rejected (409) → side-effects cannot re-fire",
          again.status_code == 409, f"status={again.status_code}")


# ── Report ───────────────────────────────────────────────────────────────────
def _mask(url: str) -> str:
    return (url or "").split("//")[-1].split(".")[0] + ".supabase.co" if url else "(unset)"


def write_report() -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    n_pass = sum(1 for r in RESULTS if r["status"] == "PASS")
    n_fail = sum(1 for r in RESULTS if r["status"] == "FAIL")
    n_skip = sum(1 for r in RESULTS if r["status"] == "SKIPPED")
    overall = "FAIL" if n_fail else "PASS"

    L: list[str] = []
    L.append("# Runtime Validation Report — A2 Decision-Ledger Immutability")
    L.append("")
    L.append("> **Generated** by `backend/tests/test_decision_ledger.py`. Do not edit by hand — re-run the suite.")
    L.append("")
    L.append("## 1. Environment")
    L.append("")
    L.append(f"- **Backend URL:** `{H.BASE_URL}`")
    L.append(f"- **Supabase project:** `{_mask(settings.SUPABASE_URL)}`")
    L.append(f"- **Environment:** `{settings.ENVIRONMENT}`")
    L.append(f"- **Date/time:** {ts}")
    L.append("")
    L.append("## 2. Execution summary")
    L.append("")
    L.append(f"- **Total PASS:** {n_pass}")
    L.append(f"- **Total FAIL:** {n_fail}")
    L.append(f"- **Total SKIPPED:** {n_skip}")
    L.append(f"- **Overall:** {'✅ PASS' if overall == 'PASS' else '❌ FAIL'}")
    L.append("")
    L.append("## 3. Detailed checks")
    L.append("")
    L.append("| Guarantee | Check | Result | Detail |")
    L.append("|---|---|---|---|")
    for r in RESULTS:
        badge = {"PASS": "✅", "FAIL": "❌", "SKIPPED": "⚠️"}[r["status"]]
        L.append(f"| {r['g']} | {r['name']} | {badge} {r['status']} | {r['detail']} |")
    L.append("")
    L.append("## 4. Failure classification")
    L.append("")
    non_pass = [r for r in RESULTS if r["status"] != "PASS"]
    if not non_pass:
        L.append("No failures or skips — every check passed. Nothing to classify.")
    else:
        L.append("| Result | Check | Classification |")
        L.append("|---|---|---|")
        for r in non_pass:
            cls = "External Dependency" if r["status"] == "SKIPPED" else "REQUIRES ROOT-CAUSE"
            L.append(f"| {r['status']} | {r['name']} | {cls} |")
    L.append("")
    L.append("## 5. Scope & notes")
    L.append("")
    L.append("- **Database is the authority.** G5 bypasses the service guard and mutates the row "
             "directly as the user; the finality trigger (migration 0015) refuses it. The 409s in "
             "G3/G4/G7 are the service layer's clean UX on top of that guarantee.")
    L.append("- **Idempotency (G7).** Because a second approve is refused, the approval side-effects "
             "(integration dispatch + knowledge ingest) are structurally unable to re-fire.")
    L.append("- **Content was already write-once** (agent scan inserts; no field-edit path), so no "
             "decision-time snapshot table is needed — only status finality + frozen decision metadata.")
    L.append("")
    L.append("## 6. Release recommendation")
    L.append("")
    if n_fail:
        L.append("❌ **Do not close A2.** " + f"{n_fail} check(s) FAILED — stop for root-cause per protocol.")
    else:
        L.append("✅ **Ready to close A2.** Decided recommendations are permanent: re-decision is "
                 "refused at the DB (authority) and the API (409), decision metadata is frozen, and "
                 "approvals are idempotent — all proven against live infrastructure.")
    L.append("")
    L.append("_A1 = cross-tenant denial · A6 = workflow success · A2 = decision-ledger immutability._")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"\nReport written: {REPORT_PATH}")


# ── Orchestration ────────────────────────────────────────────────────────────
def main() -> int:
    try:
        H.preflight()
    except H.GuardError as e:
        print(f"ABORT: {e}")
        return 2

    print(f"Runtime decision-ledger suite — target {H.BASE_URL} (ENVIRONMENT={settings.ENVIRONMENT})")
    svc = H.service_client()

    actor = None
    try:
        H.purge_test_users(svc)
        actor = H.create_actor(svc, "a2")
        H.sign_in(actor)
        enable_agent_feature(svc, actor)  # reach the feature-gated /agent endpoint
        rec_id = seed_pending_rec(svc, actor)
        run_ledger_checks(svc, actor, rec_id)
    except Exception as e:
        record("G0", f"suite error: {type(e).__name__}", "FAIL", str(e))
    finally:
        H.teardown(svc, actor)

    write_report()
    n_pass = sum(1 for r in RESULTS if r["status"] == "PASS")
    n_fail = sum(1 for r in RESULTS if r["status"] == "FAIL")
    n_skip = sum(1 for r in RESULTS if r["status"] == "SKIPPED")
    print(f"\n{n_pass} pass, {n_fail} fail, {n_skip} skipped")
    return 1 if n_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
