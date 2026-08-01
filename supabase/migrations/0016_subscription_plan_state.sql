-- ===========================================================================
-- 0016 — Monetization Phase 1: subscription plan state
-- ---------------------------------------------------------------------------
-- The plan becomes SERVER-AUTHORITATIVE. Until now `PATCH /org/subscription`
-- let anyone holding ORG_MANAGE — i.e. every organization owner — set their own
-- plan to 'enterprise' at no cost. The route is gone; this migration removes the
-- database's willingness to accept such a write at all, so the API and the data
-- layer independently refuse it.
--
-- FOUNDING ruleset
-- ---------------
-- Every organization that exists at monetization release is marked
-- `plan_ruleset = 'founding'` and keeps exactly the capabilities and (absence of)
-- limits it has today. Only organizations created afterwards resolve against the
-- new 'v1' catalog. One column, not a scatter of per-org grant rows: the
-- grandfather promise is then a single value you can read, test, and reverse.
--
-- On `status` vs a separate `plan_status`
-- --------------------------------------
-- The Phase 1 plan sketched a `plan_status` column. It is deliberately NOT added:
-- `subscriptions.status` already carries exactly that fact and is already read by
-- the Settings UI. Two columns for one fact is how they drift. This migration
-- instead pins the vocabulary with a CHECK so the values stay a closed set.
--
-- Additive and idempotent — safe to re-run.
-- ===========================================================================

-- 1. Plan state columns. The stripe_* pair lands unused so the Phase 3 billing
--    work needs no migration against a hot table.
alter table public.subscriptions
    add column if not exists plan_ruleset           text        not null default 'v1',
    add column if not exists plan_started_at        timestamptz not null default now(),
    add column if not exists plan_expires_at        timestamptz,
    add column if not exists cancel_at_period_end   boolean     not null default false,
    add column if not exists trial_ends_at          timestamptz,
    add column if not exists limit_overrides        jsonb       not null default '{}'::jsonb,
    add column if not exists plan_version           integer     not null default 1,
    add column if not exists stripe_customer_id     text,
    add column if not exists stripe_subscription_id text;

-- 2. Grandfather every organization that exists RIGHT NOW.
--    The column default is 'v1' (correct for future rows); every row present at
--    migration time predates monetization and is therefore founding.
update public.subscriptions
   set plan_ruleset = 'founding'
 where plan_ruleset = 'v1';

-- 3. Organizations with no subscription row are equally pre-existing — give them
--    an explicit founding row rather than letting them fall through to the
--    'free' default at read time, which would silently apply the NEW free limits
--    to an old account.
insert into public.subscriptions (organization_id, plan, status, plan_ruleset, limits)
select o.id, coalesce(o.plan, 'free'), 'active', 'founding', '{}'::jsonb
  from public.organizations o
  left join public.subscriptions s on s.organization_id = o.id
 where s.id is null;

-- 4. Closed vocabularies.
do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'subscriptions_ruleset_chk') then
        alter table public.subscriptions
            add constraint subscriptions_ruleset_chk
            check (plan_ruleset in ('founding', 'v1'));
    end if;
    if not exists (select 1 from pg_constraint where conname = 'subscriptions_status_chk') then
        alter table public.subscriptions
            add constraint subscriptions_status_chk
            check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete'));
    end if;
end $$;

create unique index if not exists idx_subscriptions_stripe_customer
    on public.subscriptions(stripe_customer_id)
    where stripe_customer_id is not null;

-- 5. No client-role write path to the plan. Reads stay open to members (RLS on
--    this table already scopes by membership); writes require the service role,
--    which means the billing webhook or `scripts/set_org_plan.py` — both audited.
revoke insert, update, delete on public.subscriptions from authenticated, anon;
