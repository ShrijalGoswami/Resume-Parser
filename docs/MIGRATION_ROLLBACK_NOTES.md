# Migration Rollback Notes — 0022–0027 (Billing)

**Written:** 1 Aug 2026 · **Updated:** 5 Aug 2026 (0027)
**0022–0026 applied to** `vmqhigckfkedkwfkvnij` **on 1 Aug 2026**
**0027 written 5 Aug 2026 — NOT YET APPLIED**

There are no automatic down-migrations. This repo's rule, from
[`ROLLBACK.md`](./ROLLBACK.md), is *roll back **code** freely; roll back the
**database** only with a restore, never by blindly reverting a migration.*

These notes exist so that whoever needs to recover knows exactly what each
migration did, what a reversal costs, and — the part a `down.sql` cannot tell
you — **whether reversing is even the right move.**

---

## The short version

All six are **additive**. None drops a table, column or constraint; none
deletes or rewrites a row. The only `DROP`s are `TRIGGER`/`POLICY IF EXISTS`
immediately recreated, which is this repo's idempotency idiom. 0027 is the only
one that writes to existing rows, and it is a partial, conservative backfill of
a column it just created.

**Billing code now reads 0022–0026.** That statement was "nothing reads these
objects yet" when this document was written, and it is no longer true — Phase 4
Step 4 shipped the repository, service and routes. Reversing 0022–0026 is
therefore a code-and-schema operation now, not a free one.

**0027 is the exception and remains free to leave or drop**, because the
application tolerates its column being absent by design (see its section).

| | Reversible | Data at risk on reversal | When you would |
|---|---|---|---|
| 0022 | Yes, with care | Billing state on `subscriptions` | Never, once billing is live |
| 0023 | Yes | Every webhook ever received | Never, once billing is live |
| 0024 | Yes | Payment records | Never, once billing is live |
| 0025 | Yes | Invoices — **statutory records** | Never |
| 0026 | Yes | Reconciliation history | Low risk any time |
| 0027 | Yes, freely | None — `status` stays authoritative | Any time; the code degrades cleanly |

---

## 0022 — `billing_subscription_state`

### What it changes

- **Renames** `subscriptions.stripe_customer_id` → `billing_customer_id` and
  `stripe_subscription_id` → `billing_subscription_id`; renames the index
  `idx_subscriptions_stripe_customer` → `idx_subscriptions_billing_customer`.
- **Adds 9 columns:** `billing_provider`, `billing_mode` (NOT NULL DEFAULT
  `'none'`), `payment_failed_at`, `grace_period_ends_at`, `manual_activated_by`,
  `manual_activated_at`, `manual_activation_note` (NOT NULL DEFAULT `''`).
- **Adds 5 CHECK constraints** and a FK to `recruiters`.
- **Adds 2 indexes:** unique on `billing_subscription_id`, partial on
  `grace_period_ends_at`.

### Reversible?

**Yes, today. Not once billing is live.**

The rename is safely reversible *now* because both columns were empty at
migration time — verified before applying: 1 subscription row, both values null.
Renaming back loses nothing.

### What data would be lost

**Today: none.** Every added column is null or defaulted, and the renamed pair
held no values.

**After billing goes live:** dropping these columns discards the link between an
organization and its gateway subscription. That link cannot be reconstructed from
Razorpay alone — Razorpay knows its own customer id, not which HireLens
organization it belongs to. Losing it means every paying customer's plan has to
be re-established by hand.

### Rollback strategy

1. **First choice — leave it.** The columns are inert without billing code.
   Reverting the *code* is sufficient and carries no data risk.
2. **If the rename must be undone** (e.g. a hotfix branch still reads
   `stripe_customer_id` — nothing does today, verified by grep):
   ```sql
   alter table public.subscriptions rename column billing_customer_id     to stripe_customer_id;
   alter table public.subscriptions rename column billing_subscription_id to stripe_subscription_id;
   ```
   Safe while both columns are empty. **Check they are empty first.**
3. **If the columns must go entirely**, drop constraints before columns:
   ```sql
   alter table public.subscriptions
     drop constraint if exists subscriptions_provider_mode_consistency_chk,
     drop constraint if exists subscriptions_manual_attribution_chk,
     drop constraint if exists subscriptions_grace_requires_failure_chk,
     drop constraint if exists subscriptions_billing_mode_chk,
     drop constraint if exists subscriptions_billing_provider_chk;
   alter table public.subscriptions
     drop column if exists billing_provider,
     drop column if exists billing_mode,
     drop column if exists payment_failed_at,
     drop column if exists grace_period_ends_at,
     drop column if exists manual_activated_by,
     drop column if exists manual_activated_at,
     drop column if exists manual_activation_note;
   ```
   **Export the columns first** if any row has a non-default value.

### Gotcha

`billing_mode` is NOT NULL with a default. Dropping and re-adding it resets every
row to `'none'` — which would silently convert a manually-activated Enterprise
organization into one with no billing relationship, and nothing would flag it.
If you re-add it, restore the values from the export in the same transaction.

---

## 0023 — `billing_events`

### What it changes

Creates `public.billing_events` with the composite primary key
`(provider, event_id)` — the idempotency mechanism — plus 3 CHECK constraints,
3 indexes, RLS enabled with **no policy** (service role only).

### Reversible?

**Yes** — `drop table public.billing_events;` removes it cleanly. It has no
dependents and nothing references it.

### What data would be lost

**Today: nothing** (0 rows). **Once live: every webhook ever received.**

That is the audit trail behind every charge. Deleting it does not just lose
history — it **destroys idempotency for events already processed**, because
"have we seen this event?" is answered by this table alone. A gateway
redelivering an old event after the table is dropped would be processed a second
time, and a subscription could be granted, cancelled or charged twice.

### Rollback strategy

1. **Leave it.** An empty or historical table costs nothing.
2. If it truly must go, **export first**:
   ```sql
   \copy (select * from public.billing_events) to 'billing_events_backup.csv' csv header
   drop table public.billing_events;
   ```
3. **Never drop it while webhooks are enabled.** Disable the endpoint first,
   let the gateway's retries drain, then act.

---

## 0024 — `billing_payments`

### What it changes

Creates `public.billing_payments` — one row per charge attempt — with 6 CHECK
constraints, a unique `(provider, provider_payment_id)`, 4 indexes, an
`updated_at` trigger, RLS with no policy.

### Reversible?

**Yes**, structurally.

### What data would be lost

**Today: nothing** (0 rows). **Once live: the record of money that moved.**

This is the reconciliation source against gateway settlement reports and,
for `provider = 'manual'`, the *only* record of an offline Enterprise payment —
Razorpay has never heard of those. Losing manual rows loses the payment entirely;
there is no upstream copy to re-import.

### Rollback strategy

Export, then drop. Gateway rows can in principle be re-imported from Razorpay's
API; **`provider = 'manual'` rows cannot** — export those separately and treat
them as irreplaceable.

---

## 0025 — `billing_invoices`

### What it changes

Creates `public.billing_invoices` with 7 CHECK constraints (including the
GST-inclusive invariant `net_minor + tax_minor = total_minor`), a unique
`(provider, provider_invoice_id)`, 3 indexes, an `updated_at` trigger, RLS
**with** a member-read policy (`billing_invoices_select_member`).

### Reversible?

**Structurally yes. Practically, treat it as irreversible.**

### What data would be lost

**Invoices are statutory records.** Under Indian GST rules a tax invoice must be
retained for years, and this table holds the tax split as it was *at issue time*
— deliberately, so a later GST rate change cannot rewrite history.

Dropping it is not a schema rollback; it is destroying accounting records. The
gateway holds its own copies, but `provider = 'manual'` invoices — every
Enterprise contract — exist **only here**.

### Rollback strategy

1. **Do not drop this table once it has rows.** If the schema must change,
   migrate forward: add a column, backfill, deprecate the old one.
2. If a rollback is genuinely unavoidable, export to durable storage **and keep
   the export** — deleting the table does not delete the obligation.
3. To reverse only the *policy* (e.g. members should not read invoices yet):
   ```sql
   drop policy if exists billing_invoices_select_member on public.billing_invoices;
   ```
   That is a safe, instant, data-free reversal, and is the right lever if the
   concern is exposure rather than schema.

---

## 0026 — `billing_reconciliation_runs`

### What it changes

Creates `public.billing_reconciliation_runs` with 4 CHECK constraints, 2 indexes,
RLS with no policy.

### Reversible?

**Yes — the lowest-risk of the five.**

### What data would be lost

Operational history: which runs found drift, and when. Useful for answering "is
drift getting worse?", but it is *our* diagnostic data, not the customer's
record, and none of it is reconstructible-but-critical. No financial or
statutory content.

### Rollback strategy

`drop table public.billing_reconciliation_runs;` — acceptable at any time.
Losing it means losing the drift trend, which is a real but recoverable cost:
the next run rebuilds from the gateway.

---

## Recovering the whole set

If Phase 4 is abandoned entirely and the schema must return to its 0021 state:

1. **Confirm no billing code is deployed.** This was written when none existed.
   **It now does** (Phase 4 Step 4), so check first: with billing deployed,
   reversing 0022–0026 breaks the repository's reads outright rather than being
   a no-op. Roll the code back to before Step 4 in the same operation, or leave
   the objects — which remains the lowest-risk option.
2. **Export everything first**, `billing_invoices` and manual `billing_payments`
   above all.
3. Drop in reverse dependency order: `0026 → 0025 → 0024 → 0023`, then reverse
   0022's columns and rename.
4. **Delete the corresponding rows from `supabase_migrations.schema_migrations`**,
   or the CLI will believe they are still applied and refuse to re-push them.
5. Restart the backend and confirm `/health` and `/org/context`.

### The better option, almost always

**Restore from a Supabase backup taken before the push**, rather than
hand-unwinding DDL. Point-in-time recovery restores a consistent database; a
hand-written teardown restores whatever the person writing it remembered. See
[`DISASTER_RECOVERY.md`](./DISASTER_RECOVERY.md).

---

## 0027 — `subscriptions.billing_state` (written 5 Aug 2026, NOT YET APPLIED)

### What it does

Adds one nullable column plus a CHECK, and backfills only the rows whose
`status` maps to exactly one state (`active`, `trialing`, `incomplete`).
`past_due` and `canceled` are left null on purpose — there is no honest way to
recover which of their two/three states a historical row was in, and guessing is
the defect this migration exists to remove.

### Rolling it back

**The cheapest rollback in this whole document, and it is not "drop the
column".** The application already tolerates the column being absent: it probes
once, logs `APPLY MIGRATION 0027`, and reconstructs state from `status` exactly
as it did before. So:

1. **Do nothing.** An unused nullable column costs nothing and breaks nothing.

If it genuinely must go:

```sql
alter table public.subscriptions drop constraint if exists subscriptions_billing_state_chk;
alter table public.subscriptions drop column if exists billing_state;
```

No data is lost that is not derivable — `status` remains authoritative and is
untouched by this migration. What you lose is the ability to tell
`payment_failed` from `grace` and `free` from `cancelled`, i.e. you return to
BILL-1.

### Why the code was written to survive both states of the schema

There is no Supabase CLI and no SQL-exec RPC in this project, so migrations are
applied by hand and code deploys on its own schedule. A read naming a column the
database does not have fails the whole query, so without tolerance the gap
between deploy and migration would stop billing reading subscriptions at all.
The write path is guarded for the same reason and matters more: refusing to
record an activation because an enrichment column is missing would leave a
customer who has paid without their plan.

Verified against production on 5 Aug 2026 with the column absent — reads and
writes both succeeded, one warning logged.

---

## What was verified before applying (1 Aug 2026)

- Dry run listed exactly 0022–0026, confirming 0016–0021 already applied.
- Pre-migration snapshot: 70 organizations, **1** subscription row, 3 recruiters,
  1 campaign, 2 candidate uploads.
- Both renamed columns were **empty**, which is what makes 0022's rename cheaply
  reversible today and expensive later.
- No application code referenced `stripe_customer_id`/`stripe_subscription_id`
  (grep, whole repo).
- `Subscription` is `ConfigDict(extra="ignore")`, so `SELECT *` gaining columns
  cannot break deserialization.

---

## What was verified before writing 0027 (5 Aug 2026)

- The column does **not** exist in production — probed directly, `42703`.
- **No CLI and no SQL-exec RPC** are available in this project (`exec_sql`,
  `execute_sql`, `sql` all absent), so this migration must be applied by hand in
  the Supabase SQL editor. That is why the code was written to survive both
  states of the schema rather than assuming a deploy order.
- Reads and writes were exercised against production with the column absent:
  both succeeded, one warning logged, no behaviour change beyond the known
  BILL-1 imprecision.
- The backfill touches only `active` / `trialing` / `incomplete` rows. In
  production today that is at most 3 subscription rows, all of which are
  unambiguous.
- No CHECK is added to an existing column, and `status` is not modified — so no
  currently-valid row can become invalid.
