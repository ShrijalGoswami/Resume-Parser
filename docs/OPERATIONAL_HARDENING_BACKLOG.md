# Operational Hardening Backlog

**Opened:** 1 Aug 2026 · **Status:** OPEN · **Owner:** unassigned
**Not billing work. Not scheduled. Nothing here is implemented.**

Raised by [`rca/SUBSCRIPTION_ROWS_MISSING.md`](./rca/SUBSCRIPTION_ROWS_MISSING.md),
which found that 83 subscription rows had been deleted from production over the
life of the project with **no audit trail, no versioned script, and no backup to
restore from**. The data damage was small — two real organizations, both
recovered. The gap that allowed it is not small, and it is worse now than it was
then, because the next thing this database holds is payment records.

Each item states the failure it prevents, not just the task.

---

## OPS-1 — Enable PITR and verify a restore (P0 before billing)

**Today:** `pitr_enabled: false`, `backups: []`. There is no point-in-time
recovery and no restorable backup exposed for this project.

**The failure it prevents:** exactly what happened. Rows were deleted and could
not be recovered, so the only options were reconstruct-by-inference or accept
the loss. Once `billing_payments` and `billing_invoices` carry real money, "we
cannot restore" stops being an inconvenience and becomes a compliance problem —
GST invoices are statutory records with a retention obligation.

**Done when:** PITR is enabled, retention is chosen deliberately, **and a
restore has actually been performed into a scratch project.** A backup nobody
has restored is a hypothesis. `docs/DISASTER_RECOVERY.md` already marks each
procedure VERIFIED or UNVERIFIED — this one is currently neither, because the
capability does not exist.

**Blocks:** taking a first real payment.

---

## OPS-2 — Audit trail for destructive administrative operations

**Today:** `audit_logs` records API actions only. A service-role delete, a
dashboard SQL statement, or a local script leaves no trace. The RCA could
establish *what* happened and *by what mechanism*, but never *when* or *by
whom* — the timing came from `pg_stat_user_tables` counters, which are
cumulative and reset.

**The failure it prevents:** an unattributable production data loss. This one
was benign. The same blind spot over `billing_invoices` would be a dispute with
no evidence on our side.

**Sketch, not a design:**
- A `destructive_operations` log written by any operator tool before it acts.
- Database-level triggers on the tables that must never lose rows silently
  (`subscriptions`, `billing_invoices`, `billing_payments`), recording deletes
  with `current_user`, timestamp and the prior row.
- Consider `on delete restrict` for `billing_invoices` — a statutory record
  should resist casual deletion, not cascade quietly.

---

## OPS-3 — Every destructive script lives in the repository

**Today:** the teardown that deleted 83 subscription rows **is not in this
repository.** It was ad-hoc SQL or an unversioned local script. It ran against
production, repeatedly, and cannot be reviewed because it does not exist as an
artifact.

**The failure it prevents:** unreviewable production changes. A script in the
repo is a script someone can read before it runs and read again afterwards to
understand what it did.

**Standard to adopt** — `scripts/restore_founding_subscriptions.py` is the
worked example:
- **dry run by default**, `--apply` to write
- `--reason` mandatory when writing, recorded in `audit_logs`
- a **refusal condition** when the affected row count differs from what was
  expected (a repair that touches more rows than intended is the accident it is
  trying to fix)
- selection **by rule, not by pasted id**, so the intent is reviewable
- an `undo` path that only touches rows the script itself created

---

## OPS-4 — Production data-retention policy

**Today:** none. `billing_events` is documented as "retained indefinitely" on the
reasoning that storage is cheaper than a billing dispute — a defensible default
that nobody has actually decided.

**Needs deciding, per class:**
- **Statutory** — `billing_invoices`, `billing_payments`. Indian GST records
  carry a retention obligation. Deletion is not ours to choose.
- **Operational** — `billing_events`, `billing_reconciliation_runs`,
  `audit_logs`. Real retention, real cost, our decision.
- **Personal data** — candidate résumés and analyses. An erasure request must be
  satisfiable **without** destroying a statutory financial record, and those two
  obligations conflict. That conflict needs an answer written down before
  someone has to resolve it under time pressure.

---

## OPS-5 — Documented production data deletion procedure

**Today:** `docs/OPERATIONS.md` covers erasure requests; nothing covers routine
test-data cleanup against production, which is what actually caused this.

**Should state:** that test accounts belong in a non-production project; that if
cleanup must run against production it uses a repo script meeting OPS-3; that
deleting a recruiter leaves the organization orphaned (this is why 67 empty
organizations exist); and that **`subscriptions` is never a cleanup target** —
it is the record of what a customer is entitled to.

---

## OPS-6 — Purge the 67 orphaned organizations

**Today:** 67 organizations with no recruiter, no members, no campaigns and no
data. Inert, but they distort every count and were the reason a two-organization
problem first read as a sixty-nine-organization one.

**Deliberately deferred.** Deleting them cascades to `workspaces`,
`organization_members` and `subscriptions`, which is the same operation that
caused the incident. It should be the **first exercise of OPS-1 and OPS-3**: a
reviewed script, run after PITR is enabled and verified, not before.

---

## Sequencing

`OPS-1` → `OPS-3` → `OPS-6`, in that order. The cleanup that started this must
not run again until there is a way back and a record of what ran.

`OPS-2`, `OPS-4` and `OPS-5` are independent and can proceed in parallel.
