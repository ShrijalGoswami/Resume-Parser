-- ===========================================================================
-- 0027 — BILL-1: make the billing state survive a database round trip
-- ---------------------------------------------------------------------------
-- THE DEFECT
-- ----------
-- The domain reasons about EIGHT states; `subscriptions.status` persists FIVE.
-- That projection is deliberate and stays — the five-value vocabulary has been
-- CHECK-pinned since 0016 and is read by the entitlement resolver, the Settings
-- badge and the client. Widening it would touch all of them.
--
-- The mistake was assuming the projection could be INVERTED from the other
-- columns. It cannot:
--
--   past_due  -> payment_failed | grace
--   canceled  -> free | suspended | cancelled
--
-- `payment_failed` and `grace` were being told apart by whether
-- `grace_period_ends_at` was set — but `state_machine.transition()` sets it for
-- BOTH, on purpose, because the grace window must open at failure time so every
-- surface gives the same answer to "how long do they have?". So every dunning
-- row read back as `grace`, and the "gateway has stopped retrying" beat was
-- lost entirely.
--
-- `free` and `cancelled` had the same problem: keyed off whether a gateway
-- subscription id was present, which survives a `cancelled -> free` transition.
--
-- WHY ONE COLUMN AND NOT TWO
-- --------------------------
-- The obvious narrow fix is `retries_exhausted_at`, which separates the first
-- pair and leaves the second broken — and would need a third column the next
-- time a state is added. Storing the state itself closes both ambiguities, and
-- every future one, with one column.
--
-- IT IS AN ENRICHMENT, NEVER A CONTRADICTION
-- ------------------------------------------
-- `status` remains authoritative. `billing_state` adds back the detail the
-- projection drops.
--
-- This matters because `status` has TWO writers: billing, and the operator path
-- (`OrgRepository.update_subscription`, `scripts/set_org_plan.py`) which sets a
-- plan and a status without knowing the state machine exists. A support ticket
-- moving an org to `active` would leave a stale `billing_state` behind.
--
-- So the repository requires the two to AGREE — `billing_state.to_status()`
-- must equal `status` — and falls back to deriving from `status` when they do
-- not. A stale enrichment degrades to the old behaviour; it can never override
-- the column the rest of the product reads.
--
-- NULLABLE, AND THE BACKFILL IS DELIBERATELY PARTIAL
-- --------------------------------------------------
-- Null means "no enrichment recorded" and is handled. Only rows whose status
-- maps to exactly one state are backfilled; `past_due` and `canceled` are left
-- null rather than guessed, because guessing is what caused this.
--
-- Additive, nullable and idempotent — safe to re-run, and safe to apply before
-- or after the code that reads it.
-- ===========================================================================

alter table public.subscriptions
    add column if not exists billing_state text;

do $$
begin
    -- The eight members of `BillingState`. Pinned so a typo in application code
    -- fails at the write rather than becoming an unreadable row later.
    if not exists (
        select 1 from pg_constraint where conname = 'subscriptions_billing_state_chk'
    ) then
        alter table public.subscriptions
            add constraint subscriptions_billing_state_chk
            check (billing_state is null or billing_state in (
                'free',
                'pending_activation',
                'trialing',
                'active',
                'payment_failed',
                'grace',
                'suspended',
                'cancelled'
            ));
    end if;
end $$;

-- ── Backfill: only where the projection is unambiguous ─────────────────────
-- `past_due` and `canceled` are left null on purpose. There is no honest way to
-- recover which of their two/three states a historical row was in, and writing
-- a plausible guess is exactly the failure this migration exists to remove.
update public.subscriptions
   set billing_state = case status
                           when 'active'     then 'active'
                           when 'trialing'   then 'trialing'
                           when 'incomplete' then 'pending_activation'
                       end
 where billing_state is null
   and status in ('active', 'trialing', 'incomplete');

comment on column public.subscriptions.billing_state is
    'The domain BillingState (8 values). An ENRICHMENT of status (5 values), never a contradiction: readers must verify billing_state projects onto status and fall back to deriving from status when it does not, because status has other writers. Null means no enrichment recorded.';

-- NOTE ON WRITES
-- Service role only, like every other column on this table. 0016 revoked
-- insert/update/delete from authenticated and anon and that stands unchanged.
