-- ===========================================================================
-- 0029 — Persist a scheduled plan change
-- ---------------------------------------------------------------------------
-- THE DEFECT
-- ----------
-- Plus -> Pro is scheduled at the gateway for the end of the paid period, and
-- the fact was held nowhere but in the browser tab that requested it. A refresh
-- forgot it. Settings then offered "Upgrade to Pro" to a customer who had
-- already scheduled exactly that, and the only thing standing between them and
-- a second attempt was the gateway's own pending-update check.
--
-- The scheduled change is a FACT ABOUT THE SUBSCRIPTION, so it belongs on the
-- subscription. Reading it back from Razorpay on every page load would put a
-- gateway call on a read path, which BILLING_ARCHITECTURE.md §18 forbids for
-- exactly the reason it matters here: a gateway incident would then break the
-- billing screen for customers who are not doing anything.
--
-- WHY TWO COLUMNS AND NOT A JSONB
-- -------------------------------
-- They are asked about separately. "Is an upgrade pending?" gates the CTA;
-- "when?" is rendered as a date. A jsonb blob would make both a parse, and the
-- CHECK below could not exist.
--
-- WHAT THIS IS NOT
-- ----------------
-- It is NOT an entitlement. `plan` remains the only column the entitlement
-- resolver reads, and it stays `plus` for the whole time a Pro upgrade is
-- pending. A customer who has scheduled Pro has not bought Pro yet and must not
-- receive it — the scheduled columns are a promise about the future, and
-- nothing in `app/enterprise/**` may ever consult them.
--
-- LIFECYCLE
--   schedule   plan='plus'  scheduled_plan='pro'   effective_at=<period end>
--   confirmed  plan='pro'   scheduled_plan=null    effective_at=null
--
-- The clear-on-confirm happens in the webhook path, in the same write as the
-- plan change, so the two can never disagree.
--
-- Additive, nullable and idempotent — safe to re-run, and safe to apply before
-- or after the code that reads it. The repository degrades to its previous
-- behaviour when these columns are absent.
-- ===========================================================================

alter table public.subscriptions
    add column if not exists scheduled_plan              text,
    add column if not exists scheduled_plan_effective_at timestamptz;

do $$
begin
    -- The same vocabulary `plan` uses. Pinned so a typo in application code
    -- fails at the write rather than becoming an unreadable row later, and so a
    -- scheduled change can never name a tier that does not exist.
    if not exists (
        select 1 from pg_constraint where conname = 'subscriptions_scheduled_plan_chk'
    ) then
        alter table public.subscriptions
            add constraint subscriptions_scheduled_plan_chk
            check (scheduled_plan is null or scheduled_plan in (
                'free', 'plus', 'pro', 'enterprise'
            ));
    end if;

    -- A date with nothing scheduled is meaningless, and a schedule with no date
    -- cannot be rendered. Neither is a state the application can produce; the
    -- constraint is here so a hand-edited row cannot produce one either.
    if not exists (
        select 1 from pg_constraint where conname = 'subscriptions_scheduled_plan_pairing_chk'
    ) then
        alter table public.subscriptions
            add constraint subscriptions_scheduled_plan_pairing_chk
            check (
                (scheduled_plan is null and scheduled_plan_effective_at is null)
                or (scheduled_plan is not null)
            );
    end if;

    -- A subscription scheduled to move to the plan it is already on is a
    -- contradiction, and the most likely way to reach it is a clear-on-confirm
    -- that did not run. Refusing it at the database makes that bug loud.
    if not exists (
        select 1 from pg_constraint where conname = 'subscriptions_scheduled_plan_differs_chk'
    ) then
        alter table public.subscriptions
            add constraint subscriptions_scheduled_plan_differs_chk
            check (scheduled_plan is null or scheduled_plan <> plan);
    end if;
end $$;

comment on column public.subscriptions.scheduled_plan is
    'Plan this subscription will move to at the end of the current period. NOT an entitlement — `plan` remains authoritative until the gateway confirms the change. Null when nothing is scheduled.';
comment on column public.subscriptions.scheduled_plan_effective_at is
    'When the scheduled change takes effect, as reported by the gateway. Null when nothing is scheduled.';

-- No backfill. No subscription has ever had a scheduled change: the feature did
-- not exist before this migration, so null is the correct and only honest value
-- for every existing row.
