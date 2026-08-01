-- ===========================================================================
-- 0025 — Phase 4 Step 1: billing_invoices (what the customer was billed)
-- ---------------------------------------------------------------------------
-- Schema only. No invoice code and no billing UI exist yet.
--
-- GST-INCLUSIVE PRICING (approved 1 Aug 2026)
-- -------------------------------------------
-- The advertised price IS the amount charged. ₹999 on the pricing page means
-- ₹999 leaves the customer's account — GST is inside that figure, not added at
-- checkout. So for an 18% rate:
--
--     total_minor = 99900     ← what the page said, and what was charged
--     tax_minor   = 15239     ← the GST component of it
--     net_minor   = 84661     ← the part that is revenue
--     tax_rate_bp = 1800      ← basis points, the rate applied AT THE TIME
--
-- A CHECK enforces `net + tax = total`. The split is stored rather than derived
-- because a GST rate change must not retroactively rewrite what an old invoice
-- says: an invoice is a statutory record of a past transaction, and
-- recalculating it later is how a filing stops matching its own paperwork.
-- `tax_rate_bp` in basis points, not a decimal — 18% is exactly 1800, and
-- there is no rounding to argue about.
--
-- 'manual' IS A VALID SOURCE
-- --------------------------
-- Enterprise is invoiced offline against a contract. Those invoices belong in
-- the same table as gateway ones, or half the billing history lives somewhere
-- this product cannot show.
--
-- Additive and idempotent — safe to re-run.
-- ===========================================================================

create table if not exists public.billing_invoices (
    id                       uuid primary key default gen_random_uuid(),
    organization_id          uuid        not null references public.organizations(id) on delete cascade,

    provider                 text        not null,
    -- For provider = 'manual', the operator's own invoice reference.
    provider_invoice_id      text        not null,
    provider_subscription_id text,

    -- The catalog plan this invoice covers, captured at issue time. Denormalized
    -- ON PURPOSE: a customer who later upgrades must still see what the old
    -- invoice was actually for, and joining to a mutable subscription row would
    -- silently rewrite their history.
    plan                     text        not null,

    currency                 text        not null,
    total_minor              bigint      not null,
    tax_minor                bigint      not null default 0,
    net_minor                bigint      not null,
    tax_rate_bp              integer     not null default 0,
    -- Supplied by business customers claiming input credit. Nullable: most
    -- customers have none, and an empty string is not the same as absent.
    customer_gstin           text,

    status                   text        not null,
    issued_at                timestamptz not null default now(),
    paid_at                  timestamptz,
    period_start             timestamptz,
    period_end               timestamptz,

    -- The gateway's own hosted invoice/receipt. We link to it rather than
    -- re-rendering it: their document is the one the customer's finance team
    -- will recognise, and reproducing it would create two versions of a
    -- statutory record.
    invoice_url              text,
    invoice_number           text,

    raw                      jsonb       not null default '{}'::jsonb,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now(),

    unique (provider, provider_invoice_id)
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'billing_invoices_provider_chk') then
        alter table public.billing_invoices
            add constraint billing_invoices_provider_chk
            check (provider in ('razorpay', 'manual'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_invoices_currency_chk') then
        alter table public.billing_invoices
            add constraint billing_invoices_currency_chk
            check (currency in ('INR', 'USD'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_invoices_status_chk') then
        alter table public.billing_invoices
            add constraint billing_invoices_status_chk
            check (status in ('draft', 'issued', 'paid', 'partially_paid', 'cancelled', 'expired'));
    end if;

    -- THE GST-INCLUSIVE INVARIANT. The advertised price is the total; the split
    -- must account for all of it. An invoice whose components do not sum to
    -- what was charged is unusable for a filing.
    if not exists (select 1 from pg_constraint where conname = 'billing_invoices_total_split_chk') then
        alter table public.billing_invoices
            add constraint billing_invoices_total_split_chk
            check (net_minor + tax_minor = total_minor);
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_invoices_amounts_chk') then
        alter table public.billing_invoices
            add constraint billing_invoices_amounts_chk
            check (total_minor >= 0 and tax_minor >= 0 and net_minor >= 0);
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_invoices_tax_rate_chk') then
        alter table public.billing_invoices
            add constraint billing_invoices_tax_rate_chk
            check (tax_rate_bp >= 0 and tax_rate_bp <= 10000);
    end if;

    -- A paid invoice with no payment time cannot be reconciled to a settlement.
    if not exists (select 1 from pg_constraint where conname = 'billing_invoices_paid_at_chk') then
        alter table public.billing_invoices
            add constraint billing_invoices_paid_at_chk
            check (status <> 'paid' or paid_at is not null);
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_invoices_period_chk') then
        alter table public.billing_invoices
            add constraint billing_invoices_period_chk
            check (period_end is null or period_start is null or period_end >= period_start);
    end if;
end $$;

-- The Settings ▸ Billing list: an organization's invoices, newest first.
create index if not exists idx_billing_invoices_org
    on public.billing_invoices(organization_id, issued_at desc);

create index if not exists idx_billing_invoices_subscription
    on public.billing_invoices(provider_subscription_id)
    where provider_subscription_id is not null;

create index if not exists idx_billing_invoices_unpaid
    on public.billing_invoices(organization_id, issued_at)
    where status in ('issued', 'partially_paid');

drop trigger if exists trg_billing_invoices_updated_at on public.billing_invoices;
create trigger trg_billing_invoices_updated_at
    before update on public.billing_invoices
    for each row execute function public.set_updated_at();

-- ── RLS: members may READ their organization's invoices ───────────────────
-- Unlike events and payments, an invoice is the customer's own document. They
-- are entitled to it, and Settings ▸ Billing will list it. Writes stay
-- service-role only, exactly as `subscriptions` does.
alter table public.billing_invoices enable row level security;

drop policy if exists billing_invoices_select_member on public.billing_invoices;
create policy billing_invoices_select_member on public.billing_invoices
    for select using (public.is_org_member(organization_id));

revoke insert, update, delete on public.billing_invoices from authenticated, anon;

comment on table public.billing_invoices is
    'What the customer was BILLED — see billing_payments for what was CHARGED. Readable by org members; written by the service role only.';
comment on column public.billing_invoices.total_minor is
    'The advertised, GST-INCLUSIVE amount, in minor units. This is what the customer pays; tax is inside it, never added on top.';
comment on column public.billing_invoices.tax_rate_bp is
    'Tax rate in basis points at issue time (1800 = 18% GST). Stored, not derived, so a later rate change cannot rewrite an old invoice.';
comment on column public.billing_invoices.plan is
    'Catalog plan at issue time. Denormalized so an upgrade does not rewrite what an earlier invoice was for.';
