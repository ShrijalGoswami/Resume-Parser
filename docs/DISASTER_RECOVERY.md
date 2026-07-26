# HireLens — Backup & Disaster Recovery

Audience: whoever is on call. Assume they have not read the codebase.

Everything marked **VERIFIED** was executed against the live project on
2026-07-26 and passed. Everything marked **UNVERIFIED** is documented but has not
been rehearsed in this environment — treat those steps as untested until someone
runs them.

---

## 1. What has to survive

| Asset | Store | Loss impact | Recoverable by |
|---|---|---|---|
| Tenant rows (campaigns, candidates, analyses, notes, ledger) | Supabase Postgres | Hiring history gone | PITR, or `scripts/backup_restore.py` |
| Résumé binaries | Supabase Storage `resumes` bucket | Candidate PII gone, unrecoverable from DB | Bucket backup, or `scripts/backup_restore.py` |
| `audit_logs` | Supabase Postgres | Compliance trail gone | PITR only — **never** restored by tooling (see §6) |
| Embeddings | Supabase Postgres | Semantic search degrades | Regenerable: `POST /campaigns/{id}/embeddings/reindex` |
| Auth users | Supabase Auth | Nobody can sign in | Supabase project backup |
| Secrets | Render / Vercel env | Service cannot start | Password manager — **not** in this repo |

Embeddings are the only asset that is cheaper to recompute than to restore.

## 2. Two layers, on purpose

**Layer 1 — physical (primary).** Supabase PITR. Covers the whole cluster
including `audit_logs` and Auth. This is what you use when the database is
damaged or a bad migration lands.

**Layer 2 — logical (row-level).** `backend/scripts/backup_restore.py`. Covers
tenant tables and the résumé bucket as portable JSON + bytes. This is what you use
for the incident that actually happens: *someone deleted the wrong role*. PITR
cannot fix that without rolling back everyone else's work too.

Deleting a campaign now permanently removes its résumé binaries (by design — the
confirmation dialog promises it). **Layer 2 is the only undo for that**, so its
schedule is not optional.

## 3. Backup procedure

### 3.1 Physical — Supabase PITR — **UNVERIFIED**

Requires a paid Supabase plan. On the free tier **there is no PITR and no
automated backup**; §3.2 is your only protection.

1. Supabase dashboard → Database → Backups → enable PITR (7 days minimum).
2. Confirm the dashboard shows a recent restore point.
3. Record the retention window in the on-call notes.

`supabase db dump` was **attempted and could not run here**: the CLI shells out to
`pg_dump` inside Docker, and Docker was unavailable. On a machine with Docker:

```bash
supabase db dump --linked -s public -f schema.sql          # schema
supabase db dump --linked --data-only -f data.sql          # data
supabase db dump --linked --role-only -f roles.sql         # roles
```

Store all three together; schema without roles will not restore RLS ownership
correctly.

### 3.2 Logical — `backup_restore.py` — **VERIFIED**

```bash
cd backend
python -m scripts.backup_restore backup  /backups/hirelens/$(date -u +%F-%H%M)
python -m scripts.backup_restore verify  /backups/hirelens/<dir>     # ALWAYS
```

Verified run: **28 tables, 412 rows, 1 storage object**, all checksums matched.
`verify` re-hashes every artifact against the manifest and was confirmed to
**detect a single corrupted byte**. A backup you have not verified is a hope.

Schedule: nightly, plus on demand before any destructive bulk operation.
Retention: 30 days. Store off-Supabase (S3/GCS with object-lock or versioning) —
a backup living in the system it protects is not a backup.

## 4. Restore procedures

### 4.1 Recover an accidentally deleted role — **VERIFIED**

The rehearsed path. `scripts/dr_drill.py` performs exactly this end to end and
**passed 9/9 checks**: rows, foreign keys, analysis scores, and résumé bytes all
restored byte-identical, with the project returned to its starting state.

```bash
cd backend
python -m scripts.backup_restore verify  /backups/hirelens/<dir>
python -m scripts.backup_restore restore /backups/hirelens/<dir> --dry-run
python -m scripts.backup_restore restore /backups/hirelens/<dir> \
    --tables campaigns,candidates,candidate_analyses,candidate_uploads,recruiter_notes \
    --storage
```

Then re-index so semantic search sees the restored candidates:

```
POST /api/v1/campaigns/{campaign_id}/embeddings/reindex
```

Restore is **upsert on primary key**: idempotent, and a restored role is the same
row rather than a copy, so foreign keys and permalinks still resolve.

### 4.2 Full database restore — **UNVERIFIED**

1. Put the API into maintenance (scale Render to 0, or point the frontend at a
   status page). Do not leave it writing during a restore.
2. Supabase dashboard → Backups → choose the restore point → restore.
3. Apply any migrations newer than the restore point: `supabase db push`.
4. Run the isolation suite before reopening — it proves RLS survived:
   ```bash
   HL_ALLOW_DESTRUCTIVE_TESTS=1 ENVIRONMENT=staging \
     python -m tests.test_tenant_isolation      # expect 25 pass, 0 fail
   ```
5. Run the smoke tests in `docs/DEPLOYMENT.md`.
6. Scale the API back up.

### 4.3 Storage bucket restore — **VERIFIED**

```bash
python -m scripts.backup_restore restore /backups/hirelens/<dir> --storage
```

**Content type is mandatory.** The bucket enforces a MIME allowlist, and
supabase-py defaults an untyped upload to `text/plain`, which the bucket rejects
with `415 invalid_mime_type`. The drill caught this failing silently — every file
was skipped while the run still reported success. The tool now records
`content_type` per object at backup time and replays it. If you write your own
restore, set the header or you will restore nothing.

### 4.4 Known nuance: deleted objects stay readable briefly

After deletion an object disappears from the bucket listing immediately, but
Supabase's cache can still serve `download()` for a short window. The **bucket
listing is authoritative**, not a successful download.

This matters for erasure requests: if you must attest that a résumé is
unreadable, confirm absence from the listing and allow the cache to expire before
attesting.

## 5. Recovery objectives

| | Target | Basis |
|---|---|---|
| RPO — row-level | ≤ 24 h | nightly logical backup |
| RPO — with PITR | ≤ 5 min | Supabase PITR, once enabled |
| RTO — single role | ≤ 15 min | measured: drill completes in ~2 min |
| RTO — full database | ≤ 2 h | **estimate, unverified** |

The single-role number is the one that has been measured. Treat the full-database
figure as an estimate until §4.2 has been rehearsed against a staging project.

## 6. Rules

1. **Never restore `audit_logs`.** The tool refuses by design. It is an
   append-only compliance record; rewriting it destroys the thing it exists for.
   It is still *captured* in backups so an investigator can read it.
2. **Always `verify` before you restore.** It is one command and it has already
   caught corruption once.
3. **Always `--dry-run` first** on a production restore.
4. **Never restore into production from an unverified directory.**
5. **Restore order is fixed** — parents before children. The tool enforces it;
   ad-hoc SQL does not.
6. **Secrets are not in backups.** Rotate from the password manager.

## 7. Rehearsal schedule

| Drill | Command | Cadence | Last result |
|---|---|---|---|
| Accidental deletion | `python -m scripts.dr_drill` | every release | **PASSED** 2026-07-26 (9/9) |
| Backup integrity | `backup_restore verify <latest>` | nightly, automated | **PASSED** 2026-07-26 |
| Full DB restore | §4.2 against staging | quarterly | **never run** |
| Isolation after restore | `tests.test_tenant_isolation` | after any restore | **PASSED** 2026-07-26 (25/25) |

`dr_drill.py` is safe to run against a live project: it creates its own throwaway
campaign, destroys it through the real deletion path, restores it, asserts parity,
and cleans up. It leaves the project as it found it.

## 8. Escalation

1. **Stop the bleeding** — if data is actively being lost, scale the API to 0 first.
2. Capture evidence before repairing: `backup_restore backup` the current state,
   and export the relevant `audit_logs` rows.
3. Recover using §4.1 (scoped) in preference to §4.2 (cluster) — scoped restores
   do not roll back other tenants.
4. After any restore, run the isolation suite (§4.2 step 4) before reopening.
5. Record what was lost, what was recovered, and the gap in the incident log.
