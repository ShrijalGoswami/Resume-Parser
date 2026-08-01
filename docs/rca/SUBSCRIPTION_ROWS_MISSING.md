# RCA — 69 of 70 organizations have no subscription row

**Status: ROOT CAUSE ESTABLISHED. RECOVERED 1 Aug 2026 (Option E).**

> **Resolution.** The two real organizations were restored as `founding` by
> `scripts/restore_founding_subscriptions.py`. The 67 orphaned QA organizations
> were deliberately left untouched — see `docs/OPERATIONAL_HARDENING_BACKLOG.md`
> OPS-6. The old `enterprise` value was NOT restored: the audit log shows it came
> from the self-upgrade exploit Phase 1 removed. Post-state: 3 subscriptions —
> 2 `founding`, 1 `v1` (an organization created after monetization, correct).
> The process failures this exposed are tracked as OPS-1 … OPS-6.
**Date:** 1 Aug 2026 · **Found during:** Phase 4 Step 1 pre-migration snapshot

*Every query in the investigation below was read-only. The only production write
was the approved recovery described above — 2 inserts, audited, reversible.*

---

## 0. Answer

Subscription rows were **deleted directly**, over the life of the project, by
test-account teardown that removed recruiters and their subscriptions but left
the organizations behind. Postgres' own statistics prove 83 subscription rows
were deleted while only 8 organizations ever were — so at most 8 deletions came
from the `ON DELETE CASCADE`, and **at least 75 were direct**.

**But the headline is smaller than it looks.** Only **3 of the 70 organizations
are real**. The other 67 are orphaned shells with no recruiter, no members and
no data — nobody can sign in to them. Of the 3 real ones, **2 are missing their
subscription row**; the third was created today and is correct.

The grandfathering promise was made to customers. There are two.

---

## 1. Observed state

```
organizations   70        subscriptions      1
recruiters       3        entitlement_grants 0
```

| Organization | Created | `organizations.plan` | Subscription | Members | Data |
|---|---|---|---|---|---|
| `518db52a` akademy38education@gmail.com | 21 Jul | **enterprise** | **MISSING** | 2 | none |
| `e68e91b7` shrijal.24bai10489@vitbhopal.ac.in | 28 Jul | free | **MISSING** | 1 | none |
| `51c02854` ai.workspace38@gmail.com | 1 Aug | free | `free / v1` ✅ | 1 | 1 campaign, 2 uploads |
| **67 others** | 19–29 Jul | free (mostly) | MISSING | **0** | none |

- **67 organizations are orphaned** — no recruiter, no members, no campaigns.
- **68 organizations were created before 31 Jul**, which is exactly the "68
  organizations" the handoff recorded. That figure was correct when written.

---

## 2. What the deletion could NOT have been

Each ruled out with evidence, not reasoning.

### Not a migration

No migration contains a `delete` against `subscriptions`. 0016 only *inserts*
(`insert … select … left join … where s.id is null`, no `ON CONFLICT`, no skip
condition) and *updates*. Migrations 0001–0026 all show `remote` applied in
`supabase migration list`.

### Not organization-deletion cascade

`subscriptions.organization_id` is `ON DELETE CASCADE`, so deleting an org does
remove its subscription. But:

```
organizations   n_tup_del = 8
subscriptions   n_tup_del = 83
```

**Only 8 organizations have ever been deleted.** Cascade can account for at most
8 of 83. The remaining ~75 were deleted directly from `subscriptions`.

### Not the backup/restore tooling

`scripts/backup_restore.py` restores by **upsert on the primary key** and never
deletes. `scripts/dr_drill.py` deletes only the throwaway campaign it created.

### Not application code

No route, repository or service issues a delete against `subscriptions`. The
only mention is a comment in `routes/org.py` noting that 0016 revoked client
writes. The client roles cannot delete: migration 0016 revoked
`insert/update/delete` on `subscriptions` from `authenticated` and `anon`, so
the deletion was performed with the **service role** or directly in SQL.

### Not the provisioning trigger

`provision_default_org()` (migration 0008, trigger `on_recruiter_provision_org`)
*creates* a subscription for every new organization:

```sql
insert into public.subscriptions (organization_id, plan) values (org_id, 'free');
```

This is what proves the rows existed. Every organization got one at signup, and
0016 backfilled any that somehow lacked one. There is no path by which 69 orgs
were simply never given a row.

---

## 3. What it was

The row-level statistics show one coherent signature:

| table | live | inserted | updated | **deleted** |
|---|---|---|---|---|
| recruiters | 3 | 96 | 93 | **89** |
| subscriptions | 1 | 87 | 231 | **83** |
| organization_members | 4 | 82 | 21 | **75** |
| organizations | 70 | 85 | 258 | 8 |
| workspaces | 70 | 81 | 176 | 8 |

**89 recruiters, 83 subscriptions and 75 memberships deleted — against 8
organizations and 8 workspaces.** That is test-account teardown: it removed the
user, their membership and their subscription, and left the organization and
workspace orphaned. Repeated across ~89 throwaway accounts between 19 Jul and
1 Aug, it produces exactly the state observed — a pile of empty organizations
and almost no subscriptions.

`subscriptions.n_tup_upd = 231` is consistent with the Phase 1 verification
described in the handoff, which repeatedly flipped `plan_ruleset` between
`founding` and `v1` to prove grandfathering worked.

### Precise timing cannot be established

`pg_stat_user_tables` gives cumulative counters, not timestamps.
`supabase_migrations.schema_migrations` stores no application time.
`audit_logs` records **only API actions** — it contains 9 `subscription.changed`
entries (19–27 Jul, all through the self-upgrade endpoint that Phase 1 removed)
and **no deletion of any kind**, because raw SQL and service-role writes are
never audited.

So: *when* is unknowable from the database. *What* and *by what mechanism* are
established. The teardown script itself is not in the repository — it was either
ad-hoc SQL run in the Supabase dashboard or an unversioned local script.

**This is the real process failure.** A destructive operation ran repeatedly
against production with no audit trail and no version-controlled artifact.

---

## 4. Can it be reconstructed?

### No — there is no backup

```json
{"pitr_enabled": false, "backups": []}
```

Point-in-time recovery is **off** and the API lists **no restorable backup**.
The deleted rows cannot be recovered from the platform.

### Permanently lost

- **`plan_ruleset` per organization** — the actual grandfathering marker. Which
  organizations were `founding` is gone.
- `status`, `plan_started_at`, `plan_expires_at`, `current_period_start/end`,
  `trial_ends_at`, `limit_overrides`, `plan_version`.
- Any way to distinguish a genuine pre-monetization customer from a test
  account, other than by inference.

### Survives, and is usable for reconstruction

- **`organizations.plan`** — the denormalized read-model mirror, written in the
  same transaction as `subscriptions.plan`. Still holds `enterprise` ×2,
  `business` ×1, `free` ×67.
- **`organizations.created_at`** — establishes pre/post-monetization age.
- **`recruiters` / `organization_members`** — establishes which organizations
  have a human attached. This is the single most useful surviving signal.
- **`audit_logs`** — 9 plan changes across 5 organizations.

### One caveat that matters

`organizations.plan = 'enterprise'` for `518db52a` is **not evidence of a
commercial relationship.** The audit log shows that value was set by
`akademy38education@gmail.com` on 21 and 24 Jul through
`PATCH /org/subscription` — the self-upgrade hole that let any owner grant
themselves Enterprise for free, and which Phase 1 removed for exactly this
reason. Restoring it would restore an exploit, not a plan anyone sold.

---

## 5. Recovery options

**None of these have been executed.** Row counts: 2 real organizations affected,
67 orphaned shells, 1 correct.

### Option A — Recreate all 69 as `founding`

Insert a `founding` row for every organization lacking one, taking plan from
`organizations.plan`.

- **Customer impact:** the 2 real organizations regain unlimited access. Honours
  the original promise for anyone who might return.
- **Commercial impact:** creates 67 "founding" organizations that **do not
  exist as customers**. Every future report of "how many grandfathered accounts
  do we carry?" is wrong by 67, and the founding capability set must stay frozen
  in the catalog forever partly on their account.
- **Technical risk:** low. Additive insert, constraints already satisfied.
- **Reversibility:** high — the inserted rows are identifiable by
  `created_at` and can be deleted.
- **Verdict:** achieves the goal, but permanently misstates the customer base.

### Option B — Recreate all 69 as `v1`

Same, with `plan_ruleset = 'v1'`.

- **Customer impact:** **the 2 real organizations lose grandfathering
  permanently.** One of them belongs to the project owner; the other is a real
  user from 28 Jul, before monetization.
- **Commercial impact:** breaks the stated promise — "never take something away
  from someone who already had it" — for the only two people it could apply to.
- **Technical risk:** low.
- **Reversibility:** high, but the *decision* is what matters, not the SQL.
- **Verdict:** materially identical to doing nothing, with extra rows.

### Option C — Recreate by creation date

`founding` if `created_at < ` the monetization date, else `v1`.

- **Customer impact:** correct for all 3 real organizations.
- **Commercial impact:** same 67-phantom-founding problem as A.
- **Technical risk:** low, but the cutoff is a guess — 0016 has no recorded
  application time (§3), so the boundary would be chosen, not recovered.
- **Reversibility:** high.
- **Verdict:** the most faithful reconstruction of intent, applied to the
  largest number of rows that do not matter.

### Option D — Manual recovery, per organization

Decide each case by hand.

- **Customer impact:** correct by construction.
- **Commercial impact:** none adverse.
- **Technical risk:** low; 3 decisions, not 69.
- **Reversibility:** high.
- **Verdict:** viable precisely because the real population is 3, not 70.

### Option E — Restore the real organizations; treat the shells separately ✅ recommended

Two independent decisions instead of one:

**E1 — Restore the 2 real organizations as `founding`** (`518db52a`,
`e68e91b7`), with `organizations.plan` as the plan **except** for the enterprise
value obtained through the self-upgrade hole (§4), which should be set
deliberately rather than inherited.

**E2 — Leave the 67 orphaned shells with no subscription row**, and handle them
as the data-hygiene problem they are: they have no user, no members and no data.
Either purge them, or leave them inert.

- **Customer impact:** identical to A and C for everyone who exists.
- **Commercial impact:** the founding cohort stays truthful — 2, not 69. Any
  future statement about grandfathered accounts is defensible.
- **Technical risk:** lowest — 2 inserts, reviewable line by line.
- **Reversibility:** highest — 2 rows, trivially removable.
- **Why it is better than D:** same correctness, but it names the second problem
  (67 orphaned organizations) instead of quietly papering over it with rows.

### Doing nothing is also an option, and should be stated

The 2 affected organizations currently resolve to **v1 Free** and would meet
locks and a 2-résumé wall. Neither has any candidate data. If both are
internal/test accounts in practice, the cost of doing nothing is close to zero —
but the *promise* is then broken in the data even if nobody is hurt, and the
next audit will find it again.

---

## 6. Separate defects this exposed

1. **A missing subscription row fails silently and generously in the wrong
   direction.** *(Scheduled: Phase 4 Step 2 adds a health invariant.)* `get_subscription()` returns a default and
   `normalize_ruleset(None)` resolves to `v1` — correct for a new organization,
   silently *demoting* for an old one. Nothing alerts. A reconciliation check
   for "organizations with no subscription row" belongs in Phase 4 Step 2.
2. **Destructive operations ran against production with no audit trail and no
   versioned script.** Whatever performed the teardown should exist in the repo,
   be reviewable, and refuse to run against the production project without an
   explicit flag.
3. **No PITR on a database holding customer records.** For a product about to
   take payments, that is worth fixing before billing, not after.
4. **The handoff's verification was true when written and is no longer true.**
   Nothing re-checked it. Documented verification needs a date and a re-check
   trigger, which `RELEASE_CANDIDATE_CHECKLIST.md` should own.

---

## 7. Evidence index

| Claim | Source |
|---|---|
| 70 orgs, 1 subscription, 3 recruiters | `select count(*)` per table |
| 83 subscriptions deleted, 8 orgs deleted | `pg_stat_user_tables.n_tup_del` |
| Every org gets a subscription at signup | `provision_default_org()`, migration 0008 line 170 |
| 0016 would have backfilled the rest | migration 0016 step 3 |
| Restore tooling cannot delete | `scripts/backup_restore.py` — upsert only |
| No deletion in the audit trail | `audit_logs` — 9 `subscription.changed`, 19–27 Jul |
| Enterprise came from the self-upgrade hole | `audit_logs` 21 & 24 Jul, `akademy38education@gmail.com` |
| No backup to restore from | `supabase backups list` → `pitr_enabled: false`, `backups: []` |
| 67 orgs orphaned | `organizations` with no `recruiters` row and no members |
