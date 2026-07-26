"""
Accidental-deletion recovery drill (run this before every release).

Creates throwaway tenant data, backs it up, destroys it through the same code path
the product uses for "Delete permanently" (row delete + storage prefix removal),
then restores from the backup and asserts full parity — rows AND résumé bytes.

Leaves the project exactly as it started.
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import uuid
from pathlib import Path

from app.core.config import settings
from app.db.supabase_client import get_service_client
from app.services.storage_service import StorageService, object_key

SCRATCH = Path(
    r"C:\Users\Vansh\AppData\Local\Temp\claude\E--Resume-Parser\1b092ce9-d515-48ec-8840-53484da024ac\scratchpad"
)
RESUME = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "drill_resume.pdf"
BACKUP = SCRATCH / "dr_drill"  # override via DR_DRILL_DIR if desired
PY = str(Path(sys.executable))

RID = "f4ae92cd-1a70-4e0e-8181-c585e6c950fe"
sb = get_service_client()
storage = StorageService(sb, RID)
BUCKET = settings.STORAGE_BUCKET_RESUMES

step = 0


def say(msg: str) -> None:
    global step
    step += 1
    print(f"\n[{step}] {msg}")


def run_tool(*args: str) -> int:
    return subprocess.run(
        [PY, "-m", "scripts.backup_restore", *args], cwd=str(Path.cwd())
    ).returncode


# ── 1. Create throwaway data ────────────────────────────────────────────────
say("Create a throwaway campaign, candidate, analysis and stored résumé")
cid = str(uuid.uuid4())
cand_id = str(uuid.uuid4())
sb.table("campaigns").insert(
    {
        "id": cid,
        "recruiter_id": RID,
        "title": "DR-DRILL Role",
        "job_description": "Throwaway role used to validate restore. Safe to delete.",
        "status": "active",
    }
).execute()
sb.table("candidates").insert(
    {
        "id": cand_id,
        "recruiter_id": RID,
        "campaign_id": cid,
        "full_name": "DR Drill Candidate",
        "email": "dr.drill@example.com",
        "resume_filename": RESUME.name,
        "stage": "sourced",
    }
).execute()
sb.table("candidate_analyses").insert(
    {
        "candidate_id": cand_id,
        "recruiter_id": RID,
        "campaign_id": cid,
        "overall_score": 71,
        "ats_score": 66,
        "result": {"candidate_summary": "drill", "matching_skills": ["Python"]},
    }
).execute()

key = object_key(RID, cid, cand_id, RESUME.name)
original = RESUME.read_bytes()
storage.upload(BUCKET, key, original, "application/pdf")
sb.table("candidates").update({"resume_path": key}).eq("id", cand_id).execute()
original_sha = hashlib.sha256(original).hexdigest()
print(f"    campaign  {cid}")
print(f"    candidate {cand_id}")
print(f"    object    {key} ({len(original)} bytes, sha {original_sha[:16]})")

# ── 2. Back up ──────────────────────────────────────────────────────────────
say("Back up and verify")
if run_tool("backup", str(BACKUP)) != 0:
    sys.exit("backup failed")
if run_tool("verify", str(BACKUP)) != 0:
    sys.exit("verify failed")

# ── 3. Destroy, exactly as the product does ─────────────────────────────────
say("Delete permanently (storage prefix removal + row delete, as the API does)")
removed = storage.remove_prefix(BUCKET, object_key(RID, cid))
sb.table("campaigns").delete().eq("id", cid).execute()
print(f"    storage objects removed: {removed}")

gone_campaign = not (sb.table("campaigns").select("id").eq("id", cid).execute().data or [])
gone_candidate = not (sb.table("candidates").select("id").eq("id", cand_id).execute().data or [])
# The bucket listing is authoritative. `download()` is NOT: Supabase fronts
# objects with a cache, so a just-deleted key can still return bytes for a short
# window. That nuance is documented in the DR runbook — it matters for erasure
# requests — but it must not be mistaken for a failed delete.
def _listed(k: str) -> bool:
    folder, _, name = k.rpartition("/")
    try:
        return any(e.get("name") == name for e in (sb.storage.from_(BUCKET).list(folder) or []))
    except Exception:
        return False

gone_object = not _listed(key)
print(f"    campaign gone: {gone_campaign}  candidate gone (cascade): {gone_candidate}  object gone: {gone_object}")
if not (gone_campaign and gone_candidate and gone_object):
    sys.exit("deletion did not fully take effect — drill invalid")

# ── 4. Restore ──────────────────────────────────────────────────────────────
say("Restore from backup (tables + storage)")
if run_tool("restore", str(BACKUP), "--storage") != 0:
    sys.exit("restore failed")

# ── 5. Assert parity ────────────────────────────────────────────────────────
say("Verify recovery")
camp = sb.table("campaigns").select("*").eq("id", cid).execute().data or []
cand = sb.table("candidates").select("*").eq("id", cand_id).execute().data or []
ana = sb.table("candidate_analyses").select("*").eq("candidate_id", cand_id).execute().data or []
restored, restored_sha = b"", "not restored"
if _listed(key):
    try:
        restored = sb.storage.from_(BUCKET).download(key)
        restored_sha = hashlib.sha256(restored).hexdigest()
    except Exception as exc:
        restored_sha = f"ERROR {exc}"

checks = {
    "campaign row restored": bool(camp),
    "campaign title intact": bool(camp) and camp[0]["title"] == "DR-DRILL Role",
    "candidate row restored": bool(cand),
    "candidate email intact": bool(cand) and cand[0]["email"] == "dr.drill@example.com",
    "candidate FK points at campaign": bool(cand) and cand[0]["campaign_id"] == cid,
    "analysis restored": bool(ana),
    "analysis score intact": bool(ana) and ana[0]["overall_score"] == 71,
    "résumé bytes restored": restored_sha == original_sha,
    "résumé byte length intact": len(restored) == len(original),
}
for name, ok in checks.items():
    print(f"    [{'PASS' if ok else 'FAIL'}] {name}")

# ── 6. Clean up ─────────────────────────────────────────────────────────────
say("Clean up the drill data")
storage.remove_prefix(BUCKET, object_key(RID, cid))
sb.table("campaigns").delete().eq("id", cid).execute()
left_c = len(sb.table("campaigns").select("id").eq("recruiter_id", RID).execute().data or [])
left_k = len(sb.table("candidates").select("id").eq("recruiter_id", RID).execute().data or [])
print(f"    campaigns now: {left_c}   candidates now: {left_k}")

print("\n" + "=" * 62)
if all(checks.values()) and left_c == 0 and left_k == 0:
    print("DRILL PASSED — accidental deletion is fully recoverable")
    sys.exit(0)
print("DRILL FAILED")
sys.exit(1)
