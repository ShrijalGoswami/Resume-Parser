"""
Runtime RBAC enforcement suite — proves permission gates actually DENY.

This closes the highest-priority gap left by the 28–29 Jul RBAC sweep: every
permission had been exercised **open** on a full-permission owner account and
closed only by frontend unit test. Nothing had ever confirmed that the server
returns 403 to a role that lacks a permission. A gate nobody has seen refuse is
an assumption, not a control.

Method: one throwaway user, whose `organization_members.role` is rewritten
between passes, probing the same endpoints as each role. Expectations come from
`app/enterprise/rbac.ROLE_PERMISSIONS` — the suite reads the matrix rather than
restating it, so adding a permission to a role cannot silently invalidate it.

Safety:
  * Mutating probes are only issued for roles expected to be DENIED, so a pass
    changes nothing. A mutation that wrongly succeeds is reported as a failure
    (and is exactly the bug worth finding).
  * Read probes run for every role.
  * Same destructive-run gate as the other live suites.

Run:  python -m tests.test_rbac_enforcement      (from backend/, venv active)
Writes docs/qa/RUNTIME_VALIDATION_RBAC.md
"""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

from app.enterprise.rbac import Permission, permissions_for_role
from tests import _authz_helpers as H

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, ValueError):  # pragma: no cover
        pass

REPO_ROOT = Path(__file__).resolve().parents[2]
REPORT = REPO_ROOT / "docs" / "qa" / "RUNTIME_VALIDATION_RBAC.md"

ROLES = ["viewer", "interviewer", "recruiter", "hiring_manager", "admin"]

# (label, method, path template, permission required, mutating?)
# `{c}` = campaign id, `{cand}` = candidate id — substituted per run.
PROBES: list[tuple[str, str, str, Permission, bool]] = [
    ("list campaigns",      "GET",   "/campaigns",                         Permission.CAMPAIGN_VIEW,    False),
    ("read campaign",       "GET",   "/campaigns/{c}",                     Permission.CAMPAIGN_VIEW,    False),
    ("list candidates",     "GET",   "/campaigns/{c}/candidates",          Permission.CANDIDATE_VIEW,   False),
    ("read candidate",      "GET",   "/campaigns/{c}/candidates/{cand}",   Permission.CANDIDATE_VIEW,   False),
    ("campaign activity",   "GET",   "/campaigns/{c}/activity",            Permission.CAMPAIGN_VIEW,    False),
    ("org usage",           "GET",   "/org/usage",                         Permission.USAGE_VIEW,       False),
    ("audit log",           "GET",   "/org/audit-logs",                    Permission.AUDIT_VIEW,       False),
    ("api keys",            "GET",   "/org/api-keys",                      Permission.API_KEY_MANAGE,   False),
    ("analytics",           "GET",   "/analytics/overview",                Permission.USAGE_VIEW,       False),
    ("create campaign",     "POST",  "/campaigns",                         Permission.CAMPAIGN_MANAGE,  True),
    ("update campaign",     "PATCH", "/campaigns/{c}",                     Permission.CAMPAIGN_MANAGE,  True),
    ("delete campaign",     "DELETE", "/campaigns/{c}",                    Permission.CAMPAIGN_DELETE,  True),
    ("move stage",          "PATCH", "/campaigns/{c}/candidates/{cand}/stage", Permission.CANDIDATE_MANAGE, True),
    ("add note",            "POST",  "/campaigns/{c}/candidates/{cand}/notes", Permission.CANDIDATE_MANAGE, True),
    ("invite member",       "POST",  "/org/members",                       Permission.MEMBER_MANAGE,    True),
    ("create workspace",    "POST",  "/org/workspaces",                    Permission.WORKSPACE_MANAGE, True),
    ("set feature flag",    "PUT",   "/org/feature-flags",                 Permission.FEATURE_FLAG_MANAGE, True),
]

BODIES = {
    "create campaign": {"title": "RBAC probe", "job_description": "probe"},
    "update campaign": {"title": "RBAC probe renamed"},
    "move stage": {"stage": "screening"},
    "add note": {"body": "rbac probe note"},
    "invite member": {"email": "rbac-probe@example.com", "role": "viewer"},
    "create workspace": {"name": "RBAC probe workspace"},
    "set feature flag": {"flag": "ask", "enabled": True},
}

RESULTS: list[dict] = []


def record(role: str, label: str, expected: str, got: int, status: str, note: str = "") -> None:
    RESULTS.append({"role": role, "probe": label, "expected": expected,
                    "got": got, "status": status, "note": note})


def set_role(svc, actor: H.Actor, role: str) -> None:
    svc.table("organization_members").update({"role": role}) \
        .eq("organization_id", actor.org_id).eq("user_id", actor.user_id).execute()


def main() -> int:
    H.preflight()
    svc = H.service_client()
    actor = None
    try:
        H.purge_test_users(svc)
        actor = H.create_actor(svc, "rbac")
        H.sign_in(actor)
        H.load_org(svc, actor)
        if not actor.org_id:
            print("!! no organization provisioned; aborting")
            return 2

        # Fixtures created as owner, before any role is downgraded.
        r = H.api("POST", "/campaigns", token=actor.token,
                  json={"title": "RBAC fixture", "job_description": "fixture"})
        if r.status_code not in (200, 201):
            print(f"!! fixture campaign failed: {r.status_code} {r.text[:200]}")
            return 2
        actor.campaign_id = r.json()["id"]
        cand = svc.table("candidates").insert({
            "campaign_id": actor.campaign_id, "recruiter_id": actor.user_id,
            "full_name": "RBAC Fixture", "stage": "sourced"}).execute().data[0]
        actor.candidate_id = cand["id"]

        print(f"user={actor.user_id} org={actor.org_id}\n")

        for role in ROLES:
            set_role(svc, actor, role)
            granted = permissions_for_role(role)
            print(f"── {role} ({len(granted)} permissions) " + "─" * 30)

            for label, method, tpl, perm, mutating in PROBES:
                allowed = perm in granted
                # Never issue a mutation we expect to succeed: it would alter the
                # fixtures mid-suite. Denials are inert by definition.
                if mutating and allowed:
                    record(role, label, "allowed", 0, "SKIPPED",
                           "mutation expected to succeed — not issued")
                    continue

                path = tpl.format(c=actor.campaign_id, cand=actor.candidate_id)
                resp = H.api(method, path, token=actor.token, json=BODIES.get(label))
                got = resp.status_code

                if allowed:
                    ok = got < 400
                    expected = "allowed (2xx)"
                else:
                    ok = got == 403
                    expected = "denied (403)"

                status = "PASS" if ok else "FAIL"
                note = ""
                if not ok and not allowed and got < 400:
                    note = "GATE OPEN — role acted without the permission"
                elif not ok and not allowed:
                    note = f"denied, but with {got} rather than 403"
                elif not ok:
                    note = "permitted role was refused"
                record(role, label, expected, got, status, note)

                mark = "PASS" if ok else "FAIL"
                print(f"  [{mark}] {label:<18} {method:<6} -> {got:<4} (expected {expected})"
                      + (f"  {note}" if note else ""))
            print()

        fails = [r for r in RESULTS if r["status"] == "FAIL"]
        passes = [r for r in RESULTS if r["status"] == "PASS"]
        skips = [r for r in RESULTS if r["status"] == "SKIPPED"]
        print("=" * 70)
        print(f"  {len(passes)} pass, {len(fails)} fail, {len(skips)} skipped")
        if fails:
            print("\n  FAILURES:")
            for f in fails:
                print(f"    {f['role']:<15} {f['probe']:<18} got {f['got']} — {f['note']}")
        print("=" * 70)

        write_report(passes, fails, skips)
        return 0 if not fails else 1
    finally:
        if actor:
            set_role(svc, actor, "owner")
        H.teardown(svc, actor)


def write_report(passes, fails, skips) -> None:
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Runtime Validation — RBAC enforcement (gates verified CLOSED)",
        "",
        f"Generated {datetime.now(timezone.utc).isoformat(timespec='seconds')} by "
        "`python -m tests.test_rbac_enforcement`.",
        "",
        "Proves the server **denies** a role that lacks a permission — the half of the",
        "RBAC sweep that had never been exercised. Expectations are read from",
        "`app/enterprise/rbac.ROLE_PERMISSIONS`, not restated here.",
        "",
        f"**{len(passes)} pass · {len(fails)} fail · {len(skips)} skipped**",
        "",
        "Skipped probes are mutations a role is *entitled* to perform; issuing them",
        "would alter the suite's own fixtures, and a permitted mutation is not what",
        "this suite exists to check.",
        "",
        "| Role | Probe | Expected | Got | Result |",
        "|---|---|---|---|---|",
    ]
    for r in RESULTS:
        got = r["got"] or "—"
        note = f" — {r['note']}" if r["note"] else ""
        lines.append(f"| {r['role']} | {r['probe']} | {r['expected']} | {got} | {r['status']}{note} |")
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nReport written: {REPORT}")


if __name__ == "__main__":
    raise SystemExit(main())
