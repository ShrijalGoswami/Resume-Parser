"""
Logical backup / restore for HireLens tenant data.

This is the *row-level recovery* tool. It is not a substitute for a physical
cluster backup (see `docs/DISASTER_RECOVERY.md` — Supabase PITR / `pg_dump` is the
primary strategy). It exists because the incident that actually happens in
production is not "the cluster is gone", it is "a recruiter deleted the wrong
role" — and since deleting a campaign now permanently removes the résumé binaries
too, that operation has no undo without this.

What it captures:
  * every recruiter-scoped and org-scoped table, as JSON
  * every object in the résumé storage bucket, as bytes

What it deliberately does not do:
  * touch `audit_logs` on restore. The audit trail is append-only by design; a
    restore must never rewrite history. It is still *captured* so an investigator
    can read it.
  * generate IDs. Rows restore with their original primary keys so foreign keys
    line up and a restored role is the same role, not a copy.

Usage
-----
  python -m scripts.backup_restore backup  <dir> [--recruiter EMAIL]
  python -m scripts.backup_restore verify  <dir>
  python -m scripts.backup_restore restore <dir> [--tables campaigns,candidates]
                                                 [--storage] [--dry-run]

Restore is upsert-based and idempotent: running it twice leaves the same state.
Always `verify` a backup directory before relying on it.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import settings
from app.db.supabase_client import get_service_client

# Restore order matters: parents before children, so foreign keys resolve.
TABLES_IN_DEPENDENCY_ORDER = [
    "recruiters",
    "organizations",
    "organization_members",
    "workspaces",
    "subscriptions",
    "org_feature_flags",
    "campaigns",
    "candidates",
    "candidate_analyses",
    "candidate_uploads",
    "candidate_embeddings",
    "recruiter_notes",
    "interview_packs",
    "agent_recommendations",
    "activity_events",
    "copilot_conversations",
    "copilot_messages",
    "knowledge_items",
    "knowledge_edges",
    "prediction_snapshots",
    "digital_twin_state",
    "integration_connections",
    "automation_rules",
    "webhook_endpoints",
    "integration_executions",
    "org_usage_counters",
    "api_keys",
]

# Captured for forensics, never written back.
APPEND_ONLY = {"audit_logs"}

MANIFEST = "manifest.json"

# The résumé bucket enforces an allowed-MIME-type list (migration 0003). supabase-py
# defaults an upload with no explicit type to `text/plain`, which the bucket rejects
# with 415 — so a restore that does not carry the content type silently fails to put
# any file back. The drill caught this; it would otherwise have surfaced mid-incident.
_CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
}


def _content_type_for(key: str) -> str:
    suffix = Path(key).suffix.lower()
    return _CONTENT_TYPES.get(suffix, "application/octet-stream")


def _sb():
    return get_service_client()


def _walk_bucket(sb, bucket: str, prefix: str = "", depth: int = 0) -> list[str]:
    if depth > 4:
        return []
    try:
        entries = sb.storage.from_(bucket).list(prefix) or []
    except Exception as exc:
        print(f"  ! storage list failed at {prefix!r}: {exc}")
        return []
    found: list[str] = []
    for entry in entries:
        name = entry.get("name")
        if not name:
            continue
        path = f"{prefix}/{name}" if prefix else name
        if entry.get("id") is None:
            found.extend(_walk_bucket(sb, bucket, path, depth + 1))
        else:
            found.append(path)
    return found


def backup(out_dir: Path) -> int:
    sb = _sb()
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "tables").mkdir(exist_ok=True)
    (out_dir / "storage").mkdir(exist_ok=True)

    manifest: dict = {
        "created_at": datetime.now(timezone.utc).isoformat(),
        "project_url": settings.SUPABASE_URL,
        "tables": {},
        "storage": {},
    }

    print("Tables")
    for table in [*TABLES_IN_DEPENDENCY_ORDER, *sorted(APPEND_ONLY)]:
        try:
            rows = sb.table(table).select("*").execute().data or []
        except Exception as exc:
            print(f"  {table:26} SKIP ({str(exc)[:60]})")
            manifest["tables"][table] = {"error": str(exc)[:200]}
            continue
        blob = json.dumps(rows, indent=1, default=str).encode("utf-8")
        (out_dir / "tables" / f"{table}.json").write_bytes(blob)
        manifest["tables"][table] = {
            "rows": len(rows),
            "sha256": hashlib.sha256(blob).hexdigest(),
            "append_only": table in APPEND_ONLY,
        }
        print(f"  {table:26} {len(rows):>6} rows")

    print("Storage")
    bucket = settings.STORAGE_BUCKET_RESUMES
    keys = _walk_bucket(sb, bucket)
    for key in keys:
        try:
            data = sb.storage.from_(bucket).download(key)
        except Exception as exc:
            print(f"  ! download failed {key}: {exc}")
            continue
        safe = hashlib.sha256(key.encode()).hexdigest()[:32]
        (out_dir / "storage" / safe).write_bytes(data)
        manifest["storage"][key] = {
            "file": safe,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "content_type": _content_type_for(key),
        }
    print(f"  {bucket:26} {len(manifest['storage']):>6} objects")

    (out_dir / MANIFEST).write_text(json.dumps(manifest, indent=1), encoding="utf-8")
    print(f"\nBackup written to {out_dir}")
    return 0


def verify(out_dir: Path) -> int:
    """Re-hash every artifact against the manifest. A backup you have not verified
    is a hope, not a backup."""
    manifest = json.loads((out_dir / MANIFEST).read_text(encoding="utf-8"))
    problems: list[str] = []

    for table, meta in manifest["tables"].items():
        if "error" in meta:
            continue
        path = out_dir / "tables" / f"{table}.json"
        if not path.exists():
            problems.append(f"{table}: file missing")
            continue
        actual = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual != meta["sha256"]:
            problems.append(f"{table}: checksum mismatch")
        rows = json.loads(path.read_text(encoding="utf-8"))
        if len(rows) != meta["rows"]:
            problems.append(f"{table}: row count {len(rows)} != manifest {meta['rows']}")

    for key, meta in manifest["storage"].items():
        path = out_dir / "storage" / meta["file"]
        if not path.exists():
            problems.append(f"storage {key}: file missing")
            continue
        blob = path.read_bytes()
        if hashlib.sha256(blob).hexdigest() != meta["sha256"]:
            problems.append(f"storage {key}: checksum mismatch")
        if len(blob) != meta["bytes"]:
            problems.append(f"storage {key}: size mismatch")

    total_rows = sum(m.get("rows", 0) for m in manifest["tables"].values())
    print(f"manifest created_at : {manifest['created_at']}")
    print(f"tables              : {len(manifest['tables'])} ({total_rows} rows)")
    print(f"storage objects     : {len(manifest['storage'])}")
    if problems:
        print("\nFAILED")
        for p in problems:
            print(f"  {p}")
        return 1
    print("\nVERIFIED — every artifact matches its recorded checksum")
    return 0


def restore(out_dir: Path, tables: list[str] | None, do_storage: bool, dry_run: bool) -> int:
    sb = _sb()
    manifest = json.loads((out_dir / MANIFEST).read_text(encoding="utf-8"))
    wanted = tables or TABLES_IN_DEPENDENCY_ORDER

    print("DRY RUN — nothing will be written\n" if dry_run else "")
    print("Tables")
    for table in TABLES_IN_DEPENDENCY_ORDER:
        if table not in wanted:
            continue
        if table in APPEND_ONLY:
            print(f"  {table:26} REFUSED (append-only audit trail)")
            continue
        path = out_dir / "tables" / f"{table}.json"
        if not path.exists():
            continue
        rows = json.loads(path.read_text(encoding="utf-8"))
        if not rows:
            print(f"  {table:26} {0:>6} rows")
            continue
        if dry_run:
            print(f"  {table:26} {len(rows):>6} rows would be upserted")
            continue
        try:
            # Upsert on the primary key so a restore is idempotent and preserves
            # identity — a restored role must be the same row, not a duplicate.
            for i in range(0, len(rows), 200):
                sb.table(table).upsert(rows[i : i + 200], on_conflict="id").execute()
            print(f"  {table:26} {len(rows):>6} rows restored")
        except Exception as exc:
            print(f"  {table:26} FAILED: {str(exc)[:90]}")

    if do_storage:
        print("Storage")
        bucket = settings.STORAGE_BUCKET_RESUMES
        for key, meta in manifest["storage"].items():
            blob = (out_dir / "storage" / meta["file"]).read_bytes()
            if dry_run:
                print(f"  would restore {key} ({len(blob)} bytes)")
                continue
            try:
                sb.storage.from_(bucket).upload(
                    path=key,
                    file=blob,
                    file_options={
                        "upsert": "true",
                        # Required: the bucket rejects `text/plain`, which is what
                        # supabase-py sends when no type is given.
                        "content-type": meta.get("content_type")
                        or _content_type_for(key),
                    },
                )
                print(f"  restored {key} ({len(blob)} bytes)")
            except Exception as exc:
                print(f"  FAILED {key}: {str(exc)[:90]}")

    print("\nRestore complete" if not dry_run else "\nDry run complete")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("action", choices=["backup", "verify", "restore"])
    ap.add_argument("dir", type=Path)
    ap.add_argument("--tables", help="comma-separated subset to restore")
    ap.add_argument("--storage", action="store_true", help="also restore storage objects")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.action == "backup":
        return backup(args.dir)
    if args.action == "verify":
        return verify(args.dir)
    return restore(
        args.dir,
        args.tables.split(",") if args.tables else None,
        args.storage,
        args.dry_run,
    )


if __name__ == "__main__":
    sys.exit(main())
