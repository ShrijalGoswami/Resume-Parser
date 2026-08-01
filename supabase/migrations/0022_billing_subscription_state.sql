-- ===========================================================================
-- 0022 — Phase 4 Step 1: billing state on subscriptions
-- ---------------------------------------------------------------------------
-- Schema only. Nothing reads these columns yet; no billing code exists.
--
-- PROVIDER-NEUTRAL NAMES
-- ----------------------
-- 0016 landed `stripe_customer_id` / `stripe_subscription_id` unused, against a
-- Phase 3 that was expected to be Stripe. V1 is Razorpay-only (India). Those
-- names are now doubly wrong — wrong gateway, and wrong principle: the billing
-- domain must not carry a gateway's name. They are renamed BEFORE a single
-- value is ever written, which is the only cheap moment to do it.
--
-- A Razorpay id sitting in a column called `stripe_customer_id` is the kind of
-- small lie that survives for years and misleads every reader after the first.
--
-- NOT EVERY PAID ORGANIZATION HAS A GATEWAY SUBSCRIPTION
-- -----------------------------------------------------
-- Enterprise is quoted, contracted and invoiced offline. `billing_mode` makes
-- that a first-class state rather than an absence to be inferred:
--
--     none      no billing relationship (free, and every founding org)
--     provider  a gateway subscription drives the plan
--     manual    an operator activated it; there is no gateway object
--
-- Code that assumes "paid ⇒ has a subscription id" is wrong about Enterprise,
-- and this column is what lets that be checked rather than remembered.
--
-- GRACE PERIOD
-- ------------
-- A failed payment starts a 7-day window in which the organization keeps FULL
-- access (`docs/BILLING_ARCHITECTURE.md` §9). Dunning is a billing conversation,
-- not a reason to lock a hiring team out mid-week. The dates are stored so the
-- window is a fact in the row, not a calculation someone has to reproduce
-- identically in three places.
--
-- Additive and idempotent — safe to re-run.
-- ===========================================================================

-- ── 1. Rename the unused gateway columns ──────────────────────────────────
-- Guarded on both sides: renames when the old name is present and the new one
-- is not, and does nothing on a database where this already ran.
do $$
begin
    if exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'subscriptions'
           and column_name = 'stripe_customer_id'
    ) and not exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'subscriptions'
           and column_name = 'billing_customer_id'
    ) then
        alter table public.subscriptions
            rename column stripe_customer_id to billing_customer_id;
    end if;

    if exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'subscriptions'
           and column_name = 'stripe_subscription_id'
    ) and not exists (
        select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'subscriptions'
           and column_name = 'billing_subscription_id'
    ) then
        alter table public.subscriptions
            rename column stripe_subscription_id to billing_subscription_id;
    end if;
end $$;

-- Fresh databases that never ran 0016's stripe_* pair still need the columns.
alter table public.subscriptions
    add column if not exists billing_customer_id     text,
    add column if not exists billing_subscription_id text;

-- The index from 0016 follows its column through a rename but keeps its old
-- name, which would leave `idx_subscriptions_stripe_customer` on a database
-- with no Stripe in it.
do $$
begin
    if exists (select 1 from pg_class where relname = 'idx_subscriptions_stripe_customer')
       and not exists (select 1 from pg_class where relname = 'idx_subscriptions_billing_customer')
    then
        alter index public.idx_subscriptions_stripe_customer
            rename to idx_subscriptions_billing_customer;
    end if;
end $$;

create unique index if not exists idx_subscriptions_billing_customer
    on public.subscriptions(billing_customer_id)
    where billing_customer_id is not null;

-- One gateway subscription belongs to exactly one organization. Without this a
-- mis-resolved webhook could attach the same subscription to two orgs and both
-- would look legitimate.
create unique index if not exists idx_subscriptions_billing_subscription
    on public.subscriptions(billing_subscription_id)
    where billing_subscription_id is not null;

-- ── 2. Billing mode and provider ──────────────────────────────────────────
alter table public.subscriptions
    add column if not exists billing_provider text,
    add column if not exists billing_mode     text not null default 'none';

do $$
begin
    -- Razorpay only. A second provider is a migration that widens this — a
    -- deliberate, reviewed act, not an enum that was permissive before anyone
    -- decided. See BILLING_ARCHITECTURE.md §12 "Future work".
    if not exists (select 1 from pg_constraint where conname = 'subscriptions_billing_provider_chk') then
        alter table public.subscriptions
            add constraint subscriptions_billing_provider_chk
            check (billing_provider is null or billing_provider in ('razorpay'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'subscriptions_billing_mode_chk') then
        alter table public.subscriptions
            add constraint subscriptions_billing_mode_chk
            check (billing_mode in ('none', 'provider', 'manual'));
    end if;

    -- A gateway-driven subscription must name its gateway. Without this,
    -- `billing_mode = 'provider'` with a null provider is a row nothing can act
    -- on and nothing rejects.
    if not exists (select 1 from pg_constraint where conname = 'subscriptions_provider_mode_consistency_chk') then
        alter table public.subscriptions
            add constraint subscriptions_provider_mode_consistency_chk
            check (billing_mode <> 'provider' or billing_provider is not null);
    end if;
end $$;

-- ── 3. Grace period ───────────────────────────────────────────────────────
alter table public.subscriptions
    add column if not exists payment_failed_at    timestamptz,
    add column if not exists grace_period_ends_at timestamptz;

do $$
begin
    -- A grace window with no failure that opened it is incoherent, and would
    -- silently expire access for a customer who never missed a payment.
    if not exists (select 1 from pg_constraint where conname = 'subscriptions_grace_requires_failure_chk') then
        alter table public.subscriptions
            add constraint subscriptions_grace_requires_failure_chk
            check (grace_period_ends_at is null or payment_failed_at is not null);
    end if;
end $$;

-- Partial: the sweep that ends expired grace periods reads only open ones, and
-- open ones are always the small minority.
create index if not exists idx_subscriptions_grace_open
    on public.subscriptions(grace_period_ends_at)
    where grace_period_ends_at is not null;

-- ── 4. Manual activation (Enterprise) ─────────────────────────────────────
-- Who turned this on, when, and why. An Enterprise plan that appeared with no
-- gateway record and no attribution is indistinguishable from a mistake.
alter table public.subscriptions
    add column if not exists manual_activated_by   uuid references public.recruiters(id) on delete set null,
    add column if not exists manual_activated_at   timestamptz,
    add column if not exists manual_activation_note text not null default '';

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'subscriptions_manual_attribution_chk') then
        alter table public.subscriptions
            add constraint subscriptions_manual_attribution_chk
            check (billing_mode <> 'manual' or manual_activated_at is not null);
    end if;
end $$;

-- ── 5. Column documentation ───────────────────────────────────────────────
comment on column public.subscriptions.billing_provider is
    'Payment gateway backing this subscription. Null when billing_mode is none or manual. Razorpay only in V1.';
comment on column public.subscriptions.billing_mode is
    'none = no billing relationship (free, founding) | provider = a gateway subscription drives the plan | manual = operator-activated, no gateway object (Enterprise).';
comment on column public.subscriptions.billing_customer_id is
    'Gateway customer id. Provider-neutral name: never holds a value under a gateway-specific column name.';
comment on column public.subscriptions.billing_subscription_id is
    'Gateway subscription id. Unique across organizations.';
comment on column public.subscriptions.payment_failed_at is
    'When the most recent charge failed. Cleared on a successful charge.';
comment on column public.subscriptions.grace_period_ends_at is
    'End of the 7-day post-failure window. Access is retained in full until this passes (BILLING_ARCHITECTURE.md §9).';
comment on column public.subscriptions.manual_activated_by is
    'Operator who activated a manual (Enterprise) plan. Attribution for an activation with no gateway record.';

-- NOTE ON WRITES
-- 0016 revoked insert/update/delete on public.subscriptions from authenticated
-- and anon, and that stands unchanged. Every column added here is written by the
-- service role only. Nothing about this migration opens a client write path.
