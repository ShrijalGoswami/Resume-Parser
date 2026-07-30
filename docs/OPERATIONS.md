# Operations

> Running HireLens once it is live. Getting it there is
> [DEPLOYMENT.md](./DEPLOYMENT.md); what to watch is
> [MONITORING.md](./MONITORING.md); backup and restore procedures are
> [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md).

## Contents

1. [Operating model](#1-operating-model)
2. [Routine tasks](#2-routine-tasks)
3. [Runbooks](#3-runbooks)
4. [Incident response](#4-incident-response)
5. [Secrets and rotation](#5-secrets-and-rotation)
6. [Data subject requests](#6-data-subject-requests)
7. [Known operational limits](#7-known-operational-limits)

---

## 1. Operating model

Three independently deployable planes:

| Plane | State | Recovery |
|---|---|---|
| Frontend (Vercel) | none | Instant rollback |
| Backend (Render) | none — all state is in Supabase | Redeploy |
| Supabase (Postgres · Auth · Storage) | **all durable state** | Restore |

The consequence worth internalising: **code is always safe to roll back; data
never is.** Backend recovery is a redeploy. Durable-data recovery is a restore,
and a restore is not reversible.

### Degradation ladder

The system is designed to lose capability rather than availability. Know which
rung you are on before acting:

| Failure | Effect | Action |
|---|---|---|
| LLM provider down | Analysis degrades; results marked `degraded`; parsing and scoring still work | None — the orchestrator falls back |
| Groq quota exhausted | AI endpoints 503 | Raise the plan ceiling. Quota errors are deliberately **not** retried |
| Supabase unreachable | Authenticated product down; stateless AI endpoints still serve | Check Supabase status before touching the app |
| Backend down | Everything authenticated down; the marketing page still serves | Roll back or fix config |

---

## 2. Routine tasks

| Cadence | Task | Command / where |
|---|---|---|
| Every release | Release gate against staging | `release-gate.yml` (workflow dispatch) |
| Every release | DR drill | `python -m scripts.dr_drill` |
| Weekly | Backup + **verify** | §3.1 |
| Weekly | Orphaned-storage check | §3.4 |
| Monthly | Confirm PITR is enabled and its window | Supabase dashboard |
| Monthly | Review `audit_logs` growth | §7 |
| Quarterly | Rotate the service-role key | §5 |
| Quarterly | Dependency refresh | `DEPLOYMENT.md` §2 |
| Quarterly | Restore rehearsal into a scratch project | DR §4.2 |

**A backup that has not been verified is not a backup.** `verify` re-hashes every
artifact and is proven to detect single-byte corruption; skipping it means finding
out during an incident.

---

## 3. Runbooks

### 3.1 Take and verify a backup

```bash
cd backend
python -m scripts.backup_restore backup /backups/hirelens/$(date -u +%F-%H%M)
python -m scripts.backup_restore verify /backups/hirelens/<dir>     # never skip
```

Covers 28 tables and the storage buckets with a per-object manifest. `audit_logs`
is backed up but **refused on restore** — it is append-only, and a restore that
rewrote the audit trail would destroy the record of the incident being recovered
from.

### 3.2 Run the DR drill

```bash
cd backend
python -m scripts.dr_drill        # expect PASSED 9/9
```

Creates throwaway data, deletes it through the real deletion path, restores it,
asserts byte-level parity of the recovered résumé, and cleans up. Safe against a
live project. Run it before every release — it is the only thing that proves the
restore path still works, and it has already caught two defects that would
otherwise have surfaced mid-incident.

### 3.3 Recover accidentally deleted data

Full detail in DR §4.1. In short: **scoped restore before cluster restore.** A
cluster restore rolls back every tenant, so using it to fix one customer's mistake
creates a second, larger incident.

```bash
python -m scripts.backup_restore restore /backups/<dir> --table candidates --org <org-id>
HL_ALLOW_DESTRUCTIVE_TESTS=1 python -m tests.test_tenant_isolation   # before reopening
```

### 3.4 Check for orphaned storage objects

Deleting a campaign or bulk-deleting candidates removes the storage prefix as well
as the rows. If the counts diverge, résumés — real personal data — are sitting in
the bucket with no candidate row: invisible to the product and undeletable through
it.

Compare the storage object count against the candidate row count. A persistent
divergence is a bug, not drift; capture the prefixes before deleting anything.

### 3.5 Raise log verbosity during an incident

Set `LOG_LEVEL=DEBUG` and restart. No code change, no redeploy of a new build.
**Put it back to `INFO`** — DEBUG is noisy and log ingest is billed by volume.

### 3.6 Rotate a compromised key

See §5. The service-role key is the one that matters: it bypasses RLS entirely.

### 3.7 Investigate a user-reported error

1. Ask for the **request ID** (returned in `X-Request-ID` on every response).
2. Grep the logs for it. Every line emitted during that request carries it,
   including from inside the parser and the LLM stack.
3. If the report predates the guard on inbound request IDs, treat a suspiciously
   readable ID with caution — callers could once supply arbitrary values.

### 3.8 Diagnose `503 "Organization lookup failed."`

This is the failure that took a session to find once already. Full analysis:
`docs/rca/UPLOAD_503.md`. **Do not treat it as "Supabase is down"** — it was a
client-side transport fault, and the symptom looks identical.

**Symptoms.** Intermittent `503 {"detail":"Organization lookup failed."}` on any
authenticated endpoint that resolves org context — most visibly résumé upload
(`POST /campaigns/{id}/candidates/{id}/resume`) and `GET /org/context`. Fails in
about 1.5s, not on a timeout. Supabase's own status page is green and the
database is healthy. Retrying often works, which makes it look like flakiness.

**One grep decides it.** Every 503 now logs its cause:

```
grep "org-context read failed" <log>
```

Read two fields on that line:

| Field | Meaning |
|---|---|
| `failed_branches=1/4` | One query failed. A real query, RLS or permission problem — read `query=` for which, and the `exc=` chain. |
| `failed_branches=4/4` | **The shared HTTP connection died.** All four reads went down together, so this is the transport, not the data. |
| `query=` | Which of `org` / `member` / `sub` / `flags` failed. |
| `branch_ms=` / `fan_ms=` | Per-branch and total fan-out latency. |
| `exc=` | The full `cause <- cause` chain. This is the field that names the real fault. |

**If it is `4/4` and `exc=` mentions `RemoteProtocolError` / `ConnectionTerminated`
/ `_sync/http2.py`:** HTTP/2 has been re-enabled for the Supabase transport.
That is the regression. Check `app/db/supabase_client.py` for `http2=False` and
that both `get_user_client` and `get_service_client` still pass
`httpx_client=_transport()`. Run `pytest tests/test_supabase_transport.py` — it
fails on exactly this. `error_code:1` is a stream-ordering violation,
`error_code:9` an HPACK corruption; both mean the same thing here.

**If it is `4/4` and `exc=` mentions `handshake operation timed out` /
`ConnectTimeout`:** connection *churn*, not the protocol bug — the shared pool is
not being reused. Confirm `_transport()` returns a singleton and that
`init_transport()` still runs in the app lifespan.

**Related silent failures** (added at the same time, same cause family):

* `postgrest.auth() failed …` — clients fell back to the anon key, so every
  RLS-scoped read returns empty. Presents as "no organization" or blank
  dashboards, *not* as an error.
* `org_id_for failed for recruiter=…` — usage attribution degraded. Harmless to
  the request; a burst of them is not.

**Do not "fix" this by adding a retry around the fan-out.** It papers over a
corrupted connection and roughly doubles the latency of the failure path.

---

## 4. Incident response

1. **Stop the bleeding.** If data is actively being lost or corrupted, scale the
   API to 0 *before* diagnosing. Diagnosis is not worth more lost rows.
2. **Preserve evidence.** Take a backup of the current state and export the
   relevant `audit_logs` rows **before** repairing. Never restore over evidence —
   a restore is not reversible, and the pre-repair state is often the only record
   of what happened.
3. **Classify.**
   - Availability → [DEPLOYMENT.md](./DEPLOYMENT.md) §8 rollback
   - Data loss → DR §4.1 (scoped), then §4.2 (cluster)
   - Security → §4.1 below
   - Cost / abuse → check the 429 rate and Groq spend; tighten the edge limiter
4. **Communicate scope and blast radius before ETA.** Which tenants, which data,
   what window. An ETA without a blast radius is not useful to anyone.
5. **Verify before reopening.** Isolation suite (25 checks) plus the production
   smoke test. Always, after any restore.
6. **Write it up:** what was lost, what was recovered, the gap between those two,
   and the fix.

### 4.1 Security-specific

| Signal | First action |
|---|---|
| Suspected token compromise | Rotate `SUPABASE_SERVICE_ROLE_KEY`; invalidate Supabase sessions. JWKS keys are public and need no rotation |
| Prompt-injection warnings spiking | Identify the uploading account. The defences hold, but a sustained campaign is worth blocking upstream |
| Cross-tenant data suspicion | Run the isolation suite immediately — it is the fastest authoritative answer |
| Unexpected AI spend | Check 429s and `ALLOWED_ORIGINS`. The AI endpoints are unauthenticated by design |
| Erasure request | §6 |

---

## 5. Secrets and rotation

| Secret | Blast radius | Rotation |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **Total** — bypasses RLS on every table | Supabase dashboard → update the backend env → restart. Rotate quarterly and immediately on suspicion |
| `SUPABASE_ANON_KEY` | Low — RLS still applies | Rotate with the project; requires a frontend rebuild (it is inlined at build time) |
| `GROQ_API_KEY` | Financial | Groq console → update → restart |
| `SUPABASE_JWT_SECRET` | Auth bypass (legacy HS256 only) | Rotating invalidates every issued token: all users are signed out |
| Staging secrets in GitHub | Staging data | Repository → Settings → Secrets |

Rules that are not negotiable:

- The service-role key **never** carries a `NEXT_PUBLIC_` prefix. There it is a
  full RLS bypass compiled into the browser bundle.
- Secrets are never committed to `render.yaml` — they are `sync: false`, prompted
  for at apply time. A committed key is in the git history permanently.
  `test_deployment_config.py` enforces this.
- `.dockerignore` excludes `.env` in both images. A `COPY . .` with an unignored
  `.env` bakes the key into an image layer, where deleting the file in a later
  layer does not remove it.

---

## 6. Data subject requests

### Erasure

1. Delete the role/campaign through the product. This removes the rows **and** the
   storage prefix.
2. **Confirm absence from the bucket listing** — not with a download.

That second step is not pedantry. Supabase serves a just-deleted object from cache
for a short window, so a successful `download()` is **not** evidence the object
exists, and a failed one is not evidence it is gone. The bucket listing is
authoritative. Attesting erasure on the basis of a download result would be
attesting something you did not verify.

3. Note that backups still contain the data until they age out. State the backup
   retention window in the response; do not claim the data is gone from every copy
   when it is not.
4. `audit_logs` retains the *record* of the actions, by design. That record is what
   makes the deletion auditable.

### Export

Analysis results are stored verbatim in `candidate_analyses.result`, so an export
reflects what the recruiter actually saw rather than a fresh re-analysis that could
differ.

---

## 7. Known operational limits

Honest list. None block a pilot; each is a real constraint.

| Limit | Consequence | Mitigation |
|---|---|---|
| **No PITR on the Supabase free tier** | No automated backups. Recovery depends on manual backups being taken | Paid tier. This is a purchasing decision, not an engineering one |
| **Full-cluster restore never rehearsed** | The procedure is documented but untested; `supabase db dump` needs Docker | Rehearse into a scratch project — DR §4.2 |
| **Rate limiter is in-process** | Does not span replicas: N replicas ⇒ N× the configured limit | Edge rate limit / WAF |
| **No WAF on the unauthenticated AI endpoints** | Cost exposure | Edge rules in front of the three AI paths |
| **`audit_logs` grows unbounded** | Table bloat over time | Archival policy — not yet defined |
| **No screen-reader pass** | The AA claim rests on structural validation, not an assistive-technology run | NVDA / VoiceOver session |
| **Backgrounded-tab empty state** | A tab left in the background can render an empty state instead of a loading state | Requires an `isLoading` → `isPending` sweep across 28 files; deliberately deferred as a change too broad for a frozen release |
| **JWKS cache TTL 600 s** | A revoked signing key could verify for up to 10 minutes | Lower `JWKS_CACHE_SECONDS` at the cost of more refetches |
| **`supabase db dump` unavailable without Docker** | Logical backup is documented but UNVERIFIED | Run it once from a machine with Docker and record the result |
