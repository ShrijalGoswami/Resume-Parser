-- ===========================================================================
-- 0026 — Phase 4 Step 1: billing reconciliation runs
-- ---------------------------------------------------------------------------
-- Schema only. No reconciliation job exists yet.
--
-- WHY DRIFT NEEDS A TABLE AND NOT A LOG LINE
-- ------------------------------------------
-- Webhook delivery is not a guarantee. A design that assumes it is will be
-- correct until the first outage and wrong afterwards, with no way to notice —
-- so a reconciler compares our subscriptions against the gateway's and corrects
-- what has drifted (BILLING_ARCHITECTURE.md §7.4).
--
-- A reconciler that repairs SILENTLY hides the bug that caused the drift. Drift
-- is a defect, not routine. Recording each run makes two questions answerable
-- that a log line cannot answer a month later:
--
--     "is drift getting worse?"          — needs history
--     "when did this org last agree
--      with the gateway?"                — needs per-org detail
--
-- `details` holds the per-organization findings for the run rather than a
-- second table: findings are read as a set, always for one run, and never
-- joined. A table would buy query shapes nobody needs and cost a foreign key
-- on the hot path of a nightly job.
--
-- Additive and idempotent — safe to re-run.
-- ===========================================================================

create table if not exists public.billing_reconciliation_runs (
    id                uuid        primary key default gen_random_uuid(),
    status            text        not null default 'running',

    started_at        timestamptz not null default now(),
    finished_at       timestamptz,

    checked_count     integer     not null default 0,
    drift_count       integer     not null default 0,
    corrected_count   integer     not null default 0,
    error_count       integer     not null default 0,

    -- [{organization_id, field, ours, theirs, action}, …]
    details           jsonb       not null default '[]'::jsonb,
    error             text,

    -- 'scheduled' | 'manual' — a run someone triggered while investigating
    -- should not be mistaken for the nightly baseline when reading the trend.
    triggered_by      text        not null default 'scheduled',

    created_at        timestamptz not null default now()
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'billing_reconciliation_status_chk') then
        alter table public.billing_reconciliation_runs
            add constraint billing_reconciliation_status_chk
            check (status in ('running', 'completed', 'failed'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_reconciliation_trigger_chk') then
        alter table public.billing_reconciliation_runs
            add constraint billing_reconciliation_trigger_chk
            check (triggered_by in ('scheduled', 'manual'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_reconciliation_counts_chk') then
        alter table public.billing_reconciliation_runs
            add constraint billing_reconciliation_counts_chk
            check (checked_count >= 0 and drift_count >= 0
                   and corrected_count >= 0 and error_count >= 0
                   -- Correcting more rows than were found to have drifted means
                   -- the reconciler changed something it never reported.
                   and corrected_count <= drift_count);
    end if;

    -- A finished run must say when. A run stuck in 'running' with a finish time
    -- is the shape of a crashed job, and should look wrong.
    if not exists (select 1 from pg_constraint where conname = 'billing_reconciliation_finished_chk') then
        alter table public.billing_reconciliation_runs
            add constraint billing_reconciliation_finished_chk
            check ((status = 'running') = (finished_at is null));
    end if;
end $$;

create index if not exists idx_billing_reconciliation_started
    on public.billing_reconciliation_runs(started_at desc);

-- "Did anything drift recently?" and "is a run wedged?" are the two queries the
-- alerting will make, and both read the small minority of rows.
create index if not exists idx_billing_reconciliation_attention
    on public.billing_reconciliation_runs(started_at desc)
    where status <> 'completed' or drift_count > 0;

-- ── RLS: service role only ────────────────────────────────────────────────
-- Operational data about our own correctness. No customer surface reads it.
alter table public.billing_reconciliation_runs enable row level security;
revoke select, insert, update, delete on public.billing_reconciliation_runs from authenticated, anon;

comment on table public.billing_reconciliation_runs is
    'One row per reconciliation pass over gateway subscriptions. Drift is a defect, not routine — recording each run is what makes it visible rather than silently repaired.';
comment on column public.billing_reconciliation_runs.details is
    'Per-organization findings for this run: [{organization_id, field, ours, theirs, action}, …].';
comment on column public.billing_reconciliation_runs.triggered_by is
    'scheduled = the nightly baseline | manual = someone investigating. Kept apart so an investigation does not distort the trend.';
