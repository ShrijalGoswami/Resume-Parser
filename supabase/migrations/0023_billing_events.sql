-- ===========================================================================
-- 0023 — Phase 4 Step 1: billing_events (webhook idempotency + audit trail)
-- ---------------------------------------------------------------------------
-- Schema only. No webhook endpoint exists yet.
--
-- THE PRIMARY KEY IS THE IDEMPOTENCY MECHANISM
-- --------------------------------------------
-- `(provider, event_id)`. The future handler inserts FIRST; a unique violation
-- means "already seen" and the handler returns 200 without doing anything.
--
-- Deduplication deliberately lives in the database rather than in application
-- memory, because memory does not survive a restart in the middle of a
-- redelivery — and redelivery is normal, not exceptional. A gateway retries on
-- any non-2xx, and a slow handler turns one event into a storm.
--
-- `provider` is in the key so a second gateway's event ids can never collide
-- with Razorpay's.
--
-- WHY organization_id IS NULLABLE
-- -------------------------------
-- An event may arrive for a customer we cannot resolve — a subscription created
-- outside the product, a customer deleted, a mis-configured account. Refusing
-- the row to satisfy a foreign key would DISCARD the only record of something we
-- could not explain. Storing it unattributed, for a human to read, is strictly
-- better than losing it.
--
-- RETENTION
-- ---------
-- Indefinite for now. This is the audit trail behind every charge, and storage
-- is cheaper than a billing dispute with no record.
--
-- Additive and idempotent — safe to re-run.
-- ===========================================================================

create table if not exists public.billing_events (
    provider        text        not null,
    event_id        text        not null,
    event_type      text        not null,
    organization_id uuid        references public.organizations(id) on delete set null,

    -- Exactly what the gateway sent, unmodified. Kept for investigation, never
    -- read to decide anything: the handler re-fetches from the API rather than
    -- trusting a payload that is a snapshot at emit time
    -- (BILLING_ARCHITECTURE.md §1.4).
    payload         jsonb       not null,

    status          text        not null default 'received',
    received_at     timestamptz not null default now(),
    processed_at    timestamptz,
    attempts        integer     not null default 0,
    error           text,

    primary key (provider, event_id)
);

do $$
begin
    if not exists (select 1 from pg_constraint where conname = 'billing_events_provider_chk') then
        alter table public.billing_events
            add constraint billing_events_provider_chk
            check (provider in ('razorpay'));
    end if;

    -- 'ignored' is distinct from 'processed' on purpose: an event we chose not
    -- to act on and an event we acted on must stay distinguishable during an
    -- investigation, and both differ from one we never received at all.
    if not exists (select 1 from pg_constraint where conname = 'billing_events_status_chk') then
        alter table public.billing_events
            add constraint billing_events_status_chk
            check (status in ('received', 'processed', 'ignored', 'failed'));
    end if;

    if not exists (select 1 from pg_constraint where conname = 'billing_events_attempts_chk') then
        alter table public.billing_events
            add constraint billing_events_attempts_chk
            check (attempts >= 0);
    end if;
end $$;

-- "What happened to this organization's billing?" — the first question asked in
-- any support conversation.
create index if not exists idx_billing_events_org
    on public.billing_events(organization_id, received_at desc)
    where organization_id is not null;

-- The retry sweep and the alerting query both read only unfinished work, which
-- is always the small minority.
create index if not exists idx_billing_events_unprocessed
    on public.billing_events(received_at)
    where status in ('received', 'failed');

create index if not exists idx_billing_events_type
    on public.billing_events(event_type, received_at desc);

-- ── RLS: service role only ────────────────────────────────────────────────
-- No policy is created, which under RLS denies every non-service role. Raw
-- gateway payloads can carry contact and payment metadata, and no product
-- surface needs them — Settings reads invoices (0025), not events.
alter table public.billing_events enable row level security;
revoke select, insert, update, delete on public.billing_events from authenticated, anon;

comment on table public.billing_events is
    'Every webhook received, once. (provider, event_id) is the idempotency key: insert first, and a unique violation means already-processed.';
comment on column public.billing_events.payload is
    'Raw gateway event, unmodified. For investigation only — never read to decide state; the handler re-fetches from the API.';
comment on column public.billing_events.status is
    'received = accepted, not yet processed | processed = applied | ignored = deliberately not acted on | failed = threw, will retry.';
