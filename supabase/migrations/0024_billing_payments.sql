-- ===========================================================================
-- 0024 — Phase 4 Step 1: billing_payments (money that actually moved)
-- ---------------------------------------------------------------------------
-- Schema only. No payment code exists yet.
--
-- One row per charge attempt, successful or not. This is the record of what a
-- customer was actually charged — separate from `billing_invoices` (0025),
-- which records what they were BILLED. The two differ more often than is
-- comfortable: a retried charge, a partial capture, a refund.
--
-- MINOR UNITS, ALWAYS
-- -------------------
-- `amount_minor` is paise for INR and cents for USD. Never rupees, never a
-- float. Razorpay speaks paise, and a rupee/paise mix-up is a 100× billing
-- error in whichever direction hurts most — either we charge a customer a
-- hundred times the price, or we hand the product away for one.
--
-- `bigint` rather than `integer`: ₹21,474,836.47 is an implausible SaaS charge
-- but a perfectly plausible annual Enterprise contract, and the ceiling costs
-- four bytes.
--
-- 'manual' IS A VALID SOURCE
-- --------------------------
-- Enterprise is invoiced and paid offline. A bank transfer against a contract
-- is money that moved and belongs in this table; it simply has no gateway
-- object behind it. Modelling only gateway payments would push half the
-- revenue record into a spreadsheet.
--
-- Additive and idempotent — safe to re-run.
-- ===========================================================================

create table if not exists public.billing_payments (
    id                       uuid primary key default gen_random_uuid(),
    organization_id          uuid        not null references public.organizations(id) on delete cascade,

    provider                 text        not null,
    -- For provider = 'manual' this is the operator's own reference (a bank
    -- transaction id, a cheque number). Still required, still unique: a payment
    -- nobody can trace back to anything is not a record.
    provider_payment_id      text        not null,
    provider_subscription_id text,
    provider_invoice_id      text,

    amount_minor             bigint      not null,
    currency                 text        not null,
    status                   text        not null,
    -- upi | card | netbanking | emandate | wallet | offline …
    -- Deliberately free text and NOT constrained: payment method names are the
    -- gateway's vocabulary and change without notice. A CHECK here would turn a
    -- new UPI variant into a failed webhook.
    method                   text,

    authorized_at            timestamptz,
    captured_at              timestamptz,
    failed_at                timestamptz,
    failure_reason           text,
    refunded_amount_minor    bigint      not null default 0,

    raw                      jsonb       not null default '{}'::jsonb,
    created_at               timestamptz not null default now(),
    updated_at               timestamptz not null default now(),

    unique (provider, provider_payment_id)
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'billing_payments_provider_chk') then
        alter table public.billing_payments
            add constraint billing_payments_provider_chk
            check (provider in ('razorpay', 'manual'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_payments_currency_chk') then
        alter table public.billing_payments
            add constraint billing_payments_currency_chk
            check (currency in ('INR', 'USD'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_payments_status_chk') then
        alter table public.billing_payments
            add constraint billing_payments_status_chk
            check (status in ('created', 'authorized', 'captured', 'failed', 'refunded'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_payments_amount_chk') then
        alter table public.billing_payments
            add constraint billing_payments_amount_chk
            check (amount_minor >= 0);
    end if;

    -- A refund larger than the payment is arithmetic nobody intended.
    if not exists (select 1 from pg_constraint where conname = 'billing_payments_refund_chk') then
        alter table public.billing_payments
            add constraint billing_payments_refund_chk
            check (refunded_amount_minor >= 0 and refunded_amount_minor <= amount_minor);
    end if;

    -- A captured payment without a capture time cannot be reconciled against a
    -- settlement report, which is the one thing this row exists for.
    if not exists (select 1 from pg_constraint where conname = 'billing_payments_captured_at_chk') then
        alter table public.billing_payments
            add constraint billing_payments_captured_at_chk
            check (status <> 'captured' or captured_at is not null);
    end if;
end $$;

create index if not exists idx_billing_payments_org
    on public.billing_payments(organization_id, created_at desc);

create index if not exists idx_billing_payments_subscription
    on public.billing_payments(provider_subscription_id)
    where provider_subscription_id is not null;

create index if not exists idx_billing_payments_invoice
    on public.billing_payments(provider_invoice_id)
    where provider_invoice_id is not null;

-- Dunning and failure alerting read only failures.
create index if not exists idx_billing_payments_failed
    on public.billing_payments(organization_id, failed_at desc)
    where status = 'failed';

drop trigger if exists trg_billing_payments_updated_at on public.billing_payments;
create trigger trg_billing_payments_updated_at
    before update on public.billing_payments
    for each row execute function public.set_updated_at();

-- ── RLS: service role only ────────────────────────────────────────────────
-- No policy, so RLS denies every non-service role. Customers see INVOICES
-- (0025), which is the document they need; raw charge attempts, failure reasons
-- and gateway metadata are internal reconciliation data.
alter table public.billing_payments enable row level security;
revoke select, insert, update, delete on public.billing_payments from authenticated, anon;

comment on table public.billing_payments is
    'One row per charge attempt. What the customer was CHARGED — see billing_invoices for what they were BILLED.';
comment on column public.billing_payments.amount_minor is
    'Minor units always: paise for INR, cents for USD. Never rupees, never a float.';
comment on column public.billing_payments.provider is
    'razorpay = gateway charge | manual = offline payment against an Enterprise contract, recorded by an operator.';
comment on column public.billing_payments.method is
    'Gateway payment method (upi, card, netbanking, emandate…). Deliberately unconstrained: these names are the gateway''s and change without notice.';
