"""
Runtime Tenant-Isolation Suite — the canonical runtime authorization validation
for HireLens (A1 Execution).

Behavioral proof only: it exercises the two live enforcement layers (the backend
API and the Supabase user-token client under RLS) with two real tenants and
asserts that cross-tenant access always fails. It does NOT inspect SQL/policies
directly — behaviour is the proof.

Scope (only): authentication, authorization, RLS, storage isolation, cross-tenant
denial. NOT performance, load, contract, or UI testing.

SAFETY: destructive (creates/deletes real users & data). Runs only when
  * HL_ALLOW_DESTRUCTIVE_TESTS=1
  * ENVIRONMENT is non-production
  * Supabase is fully configured
…and only as __main__. See _authz_helpers.preflight().

Run:  python -m tests.test_tenant_isolation      (from backend/, venv active)
Env:  HL_ALLOW_DESTRUCTIVE_TESTS=1 ENVIRONMENT=staging SUPABASE_URL=... \
      SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_JWT_SECRET=... \
      HL_TEST_BASE_URL=http://localhost:8000

On completion it writes docs/security/RUNTIME_VALIDATION_A1.md from the results.
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from tests import _authz_helpers as H

# Diagnostics-only: this suite prints Unicode (→, —, ✅) to stdout. On a default
# Windows console the interpreter's stdout defaults to a legacy codepage (cp1252)
# that cannot encode those characters, which would crash the print path — not any
# test. Force UTF-8 on the diagnostic streams so the harness runs identically on
# any platform without needing PYTHONUTF8/PYTHONIOENCODING. This touches ONLY the
# console encoding; no test logic, assertion, or product behaviour is affected.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, ValueError):  # pragma: no cover - older/wrapped streams
        pass

REPO_ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = REPO_ROOT / "docs" / "security" / "RUNTIME_VALIDATION_A1.md"

# The eight security invariants from docs/security/TENANT_ISOLATION.md §13.
INVARIANTS = [
    ("INV1", "The browser never accesses tenant data directly from Supabase."),
    ("INV2", "Every backend request derives recruiter_id from the JWT."),
    ("INV3", "organization_id is never accepted from client input."),
    ("INV4", "Every recruiter-scoped query includes recruiter_id filtering."),
    ("INV5", "Every service-role query includes organization_id filtering."),
    ("INV6", "Storage object paths are always tenant namespaced."),
    ("INV7", "Cross-tenant access must always fail."),
    ("INV8", "Runtime authorization tests must pass before release."),
]

RESULTS: list[dict] = []


def record(invariant: str, name: str, status: str, detail: str = "") -> None:
    RESULTS.append({"invariant": invariant, "name": name, "status": status, "detail": detail})
    print(f"  [{status:7}] {name}" + (f" — {detail}" if detail else ""))


def check(invariant: str, name: str, cond: bool, detail: str = "") -> bool:
    record(invariant, name, "PASS" if cond else "FAIL", detail)
    return bool(cond)


def skip(invariant: str, name: str, detail: str) -> None:
    record(invariant, name, "SKIPPED", detail)


# ── Stages ───────────────────────────────────────────────────────────────────
ALL_TABLES = [
    # recruiter-scoped
    "recruiters", "campaigns", "candidates", "candidate_analyses", "recruiter_notes",
    "copilot_conversations", "copilot_messages", "interview_packs", "activity_events",
    "candidate_embeddings", "agent_recommendations", "candidate_uploads",
    # org-scoped
    "organizations", "workspaces", "organization_members", "audit_logs",
    "org_usage_counters", "subscriptions", "org_feature_flags", "api_keys",
    "integration_connections", "automation_rules", "integration_executions",
    "webhook_endpoints", "knowledge_items", "knowledge_edges",
    "prediction_snapshots", "digital_twin_state",
]


def stage_schema(svc) -> None:
    """Migrations applied: every tenant table exists (service client, RLS bypassed)."""
    missing = []
    for t in ALL_TABLES:
        try:
            svc.table(t).select("*").limit(1).execute()
        except Exception:
            missing.append(t)
    check("INV8", f"All {len(ALL_TABLES)} tenant tables exist (migrations applied)",
          not missing, ("missing: " + ", ".join(missing)) if missing else "")


def stage_auth_gate(a) -> None:
    secret = settings.SUPABASE_JWT_SECRET
    check("INV2", "Valid token → 200", H.api("GET", "/campaigns", token=a.token).status_code == 200)
    check("INV2", "No token → 401", H.api("GET", "/campaigns", token=None).status_code == 401)
    check("INV2", "Expired token → 401",
          H.api("GET", "/campaigns", token=H.forge_jwt(secret, exp_delta=-3600)).status_code == 401)
    check("INV2", "Bad-signature token → 401",
          H.api("GET", "/campaigns", token=H.forge_jwt(secret, key="wrong-" + (secret or "x"))).status_code == 401)
    check("INV2", "Wrong-audience token → 401",
          H.api("GET", "/campaigns", token=H.forge_jwt(secret, aud="not-authenticated")).status_code == 401)


def stage_cross_tenant_api(svc, a, b) -> None:
    # positive control
    check("INV4", "A reads own campaign (200)",
          H.api("GET", f"/campaigns/{a.campaign_id}", token=a.token).status_code == 200)

    # reads of B's resources
    check("INV7", "A cannot read B's campaign (404)",
          H.api("GET", f"/campaigns/{b.campaign_id}", token=a.token).status_code == 404)
    check("INV7", "A cannot read B's candidate (404)",
          H.api("GET", f"/campaigns/{b.campaign_id}/candidates/{b.candidate_id}", token=a.token).status_code == 404)
    lst = H.api("GET", f"/campaigns/{b.campaign_id}/candidates", token=a.token)
    leaked = lst.status_code == 200 and any((c or {}).get("id") == b.candidate_id for c in (lst.json() or []))
    check("INV7", "A's listing of B's candidates leaks nothing",
          (lst.status_code == 404) or (lst.status_code == 200 and not leaked), f"status={lst.status_code}")

    # mutations of B's resources → verify B's ground truth is untouched (scoped
    # mutations can be silent no-ops, so status alone is not sufficient proof).
    before = H.svc_row(svc, "campaigns", b.campaign_id) or {}
    H.api("PATCH", f"/campaigns/{b.campaign_id}", token=a.token, json={"title": "HIJACKED"})
    after = H.svc_row(svc, "campaigns", b.campaign_id) or {}
    check("INV4", "A cannot modify B's campaign (title intact)",
          after.get("title") == before.get("title") and after.get("title") != "HIJACKED")

    H.api("DELETE", f"/campaigns/{b.campaign_id}", token=a.token)
    check("INV4", "A cannot delete B's campaign (still exists)",
          H.svc_row(svc, "campaigns", b.campaign_id) is not None)

    H.api("DELETE", f"/campaigns/{b.campaign_id}/candidates/{b.candidate_id}/notes/{b.note_id}", token=a.token)
    check("INV4", "A cannot delete B's note (still exists)",
          H.svc_row(svc, "recruiter_notes", b.note_id) is not None)

    rec_before = H.svc_row(svc, "agent_recommendations", b.rec_id) or {}
    H.api("PATCH", f"/agent/recommendations/{b.rec_id}", token=a.token, json={"status": "approved"})
    rec_after = H.svc_row(svc, "agent_recommendations", b.rec_id) or {}
    check("INV4", "A cannot modify B's recommendation (status intact)",
          rec_after.get("status") == rec_before.get("status") and rec_after.get("status") != "approved")


def stage_direct_db_rls(a, b) -> None:
    uca = H.user_client(a.token)
    own = uca.table("campaigns").select("id").eq("id", a.campaign_id).execute().data
    check("INV4", "A's user-client sees own campaign (RLS allows own)", len(own) == 1)
    for table, val in [("campaigns", b.campaign_id), ("candidates", b.candidate_id),
                       ("recruiter_notes", b.note_id), ("agent_recommendations", b.rec_id)]:
        rows = uca.table(table).select("*").eq("id", val).execute().data
        check("INV7", f"A's user-client sees 0 of B's {table}", len(rows) == 0)


def stage_storage(svc, a, b) -> None:
    if not a.resume_path or not b.resume_path:
        skip("INV6", "Storage isolation", "résumé upload unavailable; stage skipped")
        return
    ra = H.api("GET", f"/campaigns/{a.campaign_id}/candidates/{a.candidate_id}/resume-url", token=a.token)
    check("INV6", "A gets a signed URL for own résumé (200)",
          ra.status_code == 200 and bool((ra.json() or {}).get("url")))
    rb = H.api("GET", f"/campaigns/{b.campaign_id}/candidates/{b.candidate_id}/resume-url", token=a.token)
    check("INV7", "A cannot get a signed URL for B's résumé (404)", rb.status_code == 404)

    uca = H.user_client(a.token)
    denied = False
    try:
        data = uca.storage.from_(settings.STORAGE_BUCKET_RESUMES).download(b.resume_path)
        denied = not data
    except Exception:
        denied = True
    check("INV6", "A's user-client cannot download B's résumé object", denied)


def stage_org(a, b) -> None:
    if b.org_id:
        uca = H.user_client(a.token)
        orgs = uca.table("organizations").select("*").eq("id", b.org_id).execute().data
        check("INV5", "A's user-client sees 0 of B's organization", len(orgs) == 0)
        kn = uca.table("knowledge_items").select("*").eq("organization_id", b.org_id).execute().data
        check("INV5", "A's user-client sees 0 of B's knowledge_items (org RLS)", len(kn) == 0)
    else:
        skip("INV5", "Org isolation", "B org_id unavailable (auto-provision not observed)")


# ── Report generation ────────────────────────────────────────────────────────
def _aggregate(invariant: str) -> str:
    statuses = [r["status"] for r in RESULTS if r["invariant"] == invariant]
    if not statuses:
        return "SKIPPED"
    if "FAIL" in statuses:
        return "FAIL"
    if any(s == "PASS" for s in statuses):
        return "PASS"
    return "SKIPPED"


def _mask(url: str) -> str:
    # show only the project ref host, never keys
    return (url or "").split("//")[-1].split(".")[0] + ".supabase.co" if url else "(unset)"


def write_report() -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    n_pass = sum(1 for r in RESULTS if r["status"] == "PASS")
    n_fail = sum(1 for r in RESULTS if r["status"] == "FAIL")
    n_skip = sum(1 for r in RESULTS if r["status"] == "SKIPPED")
    overall = "FAIL" if n_fail else "PASS"

    lines = []
    lines.append("# Runtime Validation Report — A1 Tenant Isolation")
    lines.append("")
    lines.append("> **Generated** by `backend/tests/test_tenant_isolation.py`. Do not edit by hand — re-run the suite.")
    lines.append("")
    lines.append(f"- **Run at:** {ts}")
    lines.append(f"- **Environment:** `{settings.ENVIRONMENT}`")
    lines.append(f"- **Backend target:** `{H.BASE_URL}`")
    lines.append(f"- **Supabase project:** `{_mask(settings.SUPABASE_URL)}`")
    lines.append(f"- **Totals:** {n_pass} PASS · {n_fail} FAIL · {n_skip} SKIPPED")
    lines.append(f"- **Overall:** {'✅ PASS' if overall == 'PASS' else '❌ FAIL'}")
    lines.append("")
    lines.append("## Invariant summary")
    lines.append("")
    lines.append("| Invariant | Statement | Result |")
    lines.append("|---|---|---|")
    for inv, statement in INVARIANTS:
        agg = _aggregate(inv)
        badge = {"PASS": "✅ PASS", "FAIL": "❌ FAIL", "SKIPPED": "⚠️ SKIPPED"}[agg]
        lines.append(f"| {inv} | {statement} | {badge} |")
    lines.append("")
    lines.append("## Detailed checks")
    lines.append("")
    lines.append("| Invariant | Check | Result | Detail |")
    lines.append("|---|---|---|---|")
    for r in RESULTS:
        badge = {"PASS": "✅", "FAIL": "❌", "SKIPPED": "⚠️"}[r["status"]]
        lines.append(f"| {r['invariant']} | {r['name']} | {badge} {r['status']} | {r['detail']} |")
    lines.append("")
    lines.append("## Notes")
    lines.append("")
    lines.append("- **INV1** is a static frontend property (the browser never queries Supabase for data), "
                 "verified in the A1 frontend audit; it is not exercisable by this backend suite and is reported SKIPPED.")
    lines.append("- **INV3** (`organization_id` never accepted from client input) is a server-derived property; "
                 "its runtime shadow is INV5's org-RLS denial. Endpoints expose no client `organization_id` to target.")
    lines.append("- Cross-tenant *mutation* checks assert the victim's ground truth is unchanged (scoped writes can be "
                 "silent no-ops), not merely the HTTP status.")
    lines.append("- Multi-member RBAC (403) is out of scope here (orgs auto-provision single-member); to be added when "
                 "team membership ships.")
    lines.append("")
    lines.append("_Reference: `docs/security/TENANT_ISOLATION.md` (§11 checklist, §13 invariants)._")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nReport written: {REPORT_PATH}")


# ── Orchestration ────────────────────────────────────────────────────────────
def main() -> int:
    try:
        H.preflight()
    except H.GuardError as e:
        print(f"ABORT: {e}")
        return 2

    print(f"Runtime tenant-isolation suite — target {H.BASE_URL} (ENVIRONMENT={settings.ENVIRONMENT})")
    svc = H.service_client()

    # INV1 is static (frontend); record as skipped up front.
    skip("INV1", "Browser never queries Supabase for data (frontend, static)",
         "verified in A1 frontend audit; not exercisable by this backend suite")

    a = b = None
    try:
        H.purge_test_users(svc)  # idempotency: clear any prior-run leftovers

        stage_schema(svc)

        a = H.create_actor(svc, "a"); H.sign_in(a); H.load_org(svc, a)
        b = H.create_actor(svc, "b"); H.sign_in(b); H.load_org(svc, b)
        H.seed_tenant(svc, a); H.seed_tenant(svc, b)

        stage_auth_gate(a)
        stage_cross_tenant_api(svc, a, b)
        stage_direct_db_rls(a, b)
        stage_storage(svc, a, b)
        stage_org(a, b)
    except Exception as e:  # a stage crash becomes a FAIL, teardown still runs
        record("INV8", f"suite error: {type(e).__name__}", "FAIL", str(e))
    finally:
        H.teardown(svc, a, b)

    # INV8 meta-invariant: all exercised checks must pass.
    n_fail = sum(1 for r in RESULTS if r["status"] == "FAIL")
    record("INV8", "All runtime authorization checks pass", "PASS" if n_fail == 0 else "FAIL",
           "" if n_fail == 0 else f"{n_fail} failing check(s)")

    write_report()
    n_pass = sum(1 for r in RESULTS if r["status"] == "PASS")
    n_skip = sum(1 for r in RESULTS if r["status"] == "SKIPPED")
    print(f"\n{n_pass} pass, {n_fail} fail, {n_skip} skipped")
    return 1 if n_fail else 0


if __name__ == "__main__":
    raise SystemExit(main())
