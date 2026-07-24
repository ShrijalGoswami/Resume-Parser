"""
Runtime Résumé-Storage Suite — the canonical runtime validation for A3
(Launch Sprint).

Behavioral proof that a résumé BINARY survives the full storage round-trip against
live infrastructure: upload → metadata persisted → signed URL → download → the
downloaded bytes are byte-identical to the original (SHA-256 equality). This is the
end-to-end proof that the existing storage endpoint actually persists and serves
the real file — beyond A1, which only proved cross-tenant isolation of the bucket.

Scope (what A3 proves live):
  * R1  Upload stores the binary and persists metadata (resume_path + filename).
  * R2  A signed download URL is issued for the stored object.
  * R3  Downloading the signed URL returns the EXACT original bytes (SHA-256 match).
  * R4  Ground truth: resume_path is persisted on the candidate row.

Out of scope (consistent with A6): the browser add-candidates orchestration
(analyze → persist → hash-map → upload) is validated by the frontend unit test
(tests/resume-upload.test.ts); no browser automation (no Playwright).

SAFETY: destructive. Reuses the A1 preflight gate + teardown. Runs only when
HL_ALLOW_DESTRUCTIVE_TESTS=1, ENVIRONMENT is non-production, Supabase configured,
and only as __main__.

Run:  python -m tests.test_resume_storage      (from backend/, venv active)
Writes docs/qa/RUNTIME_VALIDATION_A3.md from the results.
"""
from __future__ import annotations

import hashlib
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx

from app.core.config import settings
from tests import _authz_helpers as H

# Diagnostics-only: force UTF-8 on the console streams (Windows cp1252 safety).
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, ValueError):  # pragma: no cover
        pass

REPO_ROOT = Path(__file__).resolve().parents[2]
REPORT_PATH = REPO_ROOT / "docs" / "qa" / "RUNTIME_VALIDATION_A3.md"

# A unique, valid PDF so the SHA-256 is meaningful for this run (magic bytes pass
# the endpoint's content validation; the trailing marker makes the hash distinct).
RESUME_BYTES = H.PDF_BYTES + b"%% A3 resume-storage fixture unique marker\n"
RESUME_SHA256 = hashlib.sha256(RESUME_BYTES).hexdigest()

RESULTS: list[dict] = []


def record(r: str, name: str, status: str, detail: str = "") -> None:
    RESULTS.append({"r": r, "name": name, "status": status, "detail": detail})
    print(f"  [{status:8}] {name}" + (f" — {detail}" if detail else ""))


def check(r: str, name: str, cond: bool, detail: str = "") -> bool:
    record(r, name, "PASS" if cond else "FAIL", detail)
    return bool(cond)


def run_storage_checks(svc: Any, actor: H.Actor) -> None:
    # Fixture: campaign (API) + candidate (service client — no LLM).
    camp = H.api("POST", "/campaigns", token=actor.token,
                 json={"title": "A3 Storage", "job_description": "A3 résumé-storage fixture."})
    if camp.status_code not in (200, 201):
        raise RuntimeError(f"seed campaign failed: {camp.status_code} {camp.text}")
    campaign_id = camp.json()["id"]
    cand = svc.table("candidates").insert({
        "campaign_id": campaign_id, "recruiter_id": actor.user_id,
        "full_name": "A3 Candidate", "stage": "sourced",
    }).execute().data[0]
    candidate_id = cand["id"]

    # R1 — upload the binary; metadata persisted on the returned candidate.
    up = H.api("POST", f"/campaigns/{campaign_id}/candidates/{candidate_id}/resume",
               token=actor.token,
               files={"file": ("a3_resume.pdf", RESUME_BYTES, "application/pdf")})
    ok = up.status_code in (200, 201)
    body = up.json() if ok else {}
    check("R1", "Upload résumé binary → 200/201", ok, f"status={up.status_code}")
    check("R1", "Response persists resume_path + resume_filename",
          bool(body.get("resume_path")) and body.get("resume_filename") == "a3_resume.pdf")

    # R4 — ground truth: resume_path is on the candidate row.
    row = H.svc_row(svc, "candidates", candidate_id) or {}
    check("R4", "Ground truth: resume_path persisted on candidate row",
          bool(row.get("resume_path")))

    # R2 — signed download URL issued.
    urlresp = H.api("GET", f"/campaigns/{campaign_id}/candidates/{candidate_id}/resume-url",
                    token=actor.token)
    signed = (urlresp.json() or {}).get("url") if urlresp.status_code == 200 else None
    check("R2", "Signed download URL issued (200 + url)",
          urlresp.status_code == 200 and bool(signed), f"status={urlresp.status_code}")

    # R3 — download the signed URL and prove byte-identity via SHA-256.
    if signed:
        try:
            with httpx.Client(timeout=30.0, follow_redirects=True) as c:
                dl = c.get(signed)
            got_sha = hashlib.sha256(dl.content).hexdigest()
            check("R3", "Downloaded bytes are byte-identical to the original (SHA-256 match)",
                  dl.status_code == 200 and got_sha == RESUME_SHA256,
                  f"status={dl.status_code}, sha_match={got_sha == RESUME_SHA256}")
        except Exception as e:  # a transport error here is a real storage failure
            check("R3", "Downloaded bytes are byte-identical to the original (SHA-256 match)",
                  False, f"download error: {type(e).__name__}")
    else:
        check("R3", "Downloaded bytes are byte-identical to the original (SHA-256 match)",
              False, "no signed URL to download")


def _mask(url: str) -> str:
    return (url or "").split("//")[-1].split(".")[0] + ".supabase.co" if url else "(unset)"


def write_report() -> None:
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    n_pass = sum(1 for r in RESULTS if r["status"] == "PASS")
    n_fail = sum(1 for r in RESULTS if r["status"] == "FAIL")
    n_skip = sum(1 for r in RESULTS if r["status"] == "SKIPPED")
    overall = "FAIL" if n_fail else "PASS"

    L: list[str] = []
    L.append("# Runtime Validation Report — A3 Résumé Binary Storage")
    L.append("")
    L.append("> **Generated** by `backend/tests/test_resume_storage.py`. Do not edit by hand — re-run the suite.")
    L.append("")
    L.append("## 1. Environment")
    L.append("")
    L.append(f"- **Backend URL:** `{H.BASE_URL}`")
    L.append(f"- **Supabase project:** `{_mask(settings.SUPABASE_URL)}`")
    L.append(f"- **Environment:** `{settings.ENVIRONMENT}`")
    L.append(f"- **Date/time:** {ts}")
    L.append(f"- **Original SHA-256:** `{RESUME_SHA256}`")
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
    L.append("| Check id | Check | Result | Detail |")
    L.append("|---|---|---|---|")
    for r in RESULTS:
        badge = {"PASS": "✅", "FAIL": "❌", "SKIPPED": "⚠️"}[r["status"]]
        L.append(f"| {r['r']} | {r['name']} | {badge} {r['status']} | {r['detail']} |")
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
    L.append("- **True round-trip integrity.** R3 downloads the signed URL and compares SHA-256 to the "
             "original bytes — proving the private bucket stores and serves the exact file, not just that "
             "a row exists (which A1 covered).")
    L.append("- **No new storage surface.** Reuses the existing `POST …/resume` endpoint (private bucket, "
             "recruiter-namespaced key, magic-byte + size validation) proven isolated by A1.")
    L.append("- **Browser orchestration out of scope.** The add-candidates analyze→persist→hash-map→upload "
             "flow is validated by the frontend unit test `tests/resume-upload.test.ts` (content-hash "
             "mapping, collision-proof); full browser E2E is out of scope (no Playwright), as in A6.")
    L.append("")
    L.append("## 6. Release recommendation")
    L.append("")
    if n_fail:
        L.append("❌ **Do not close A3.** " + f"{n_fail} check(s) FAILED — stop for root-cause per protocol.")
    else:
        L.append("✅ **Ready to close A3.** Résumé binaries are stored and served intact end-to-end "
                 "(upload → metadata → signed URL → download → SHA-256 match) on live infrastructure, "
                 "under the A1-proven private, tenant-isolated bucket.")
    L.append("")
    L.append("_A1 = tenant isolation · A6 = workflow · A2 = ledger immutability · A3 = résumé storage._")

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"\nReport written: {REPORT_PATH}")


def main() -> int:
    try:
        H.preflight()
    except H.GuardError as e:
        print(f"ABORT: {e}")
        return 2

    print(f"Runtime résumé-storage suite — target {H.BASE_URL} (ENVIRONMENT={settings.ENVIRONMENT})")
    svc = H.service_client()

    actor = None
    try:
        H.purge_test_users(svc)
        actor = H.create_actor(svc, "a3")
        H.sign_in(actor)
        run_storage_checks(svc, actor)
    except Exception as e:
        record("R0", f"suite error: {type(e).__name__}", "FAIL", str(e))
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
