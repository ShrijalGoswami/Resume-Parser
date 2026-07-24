-- ===========================================================================
-- 0015 — Decision-ledger immutability (Launch Sprint A2)
-- ---------------------------------------------------------------------------
-- The Decision Ledger is the canonical PERMANENT RECORD of AI recommendations
-- that reached a decision. Once a recommendation is decided it must never be
-- re-decided, and the decision metadata must be frozen. This is enforced at the
-- DATABASE layer — the authority — so that even a direct user-token client under
-- the permissive UPDATE RLS policy cannot rewrite history. The service layer adds
-- a clean 409 for UX; the trigger below is the guarantee.
--
-- Approved state machine (the ONLY permitted status transitions):
--     pending  -> approved | rejected | dismissed     (human decision)
--     approved -> executed                             (system, future sprint)
-- Everything else is rejected. No transition back to pending; no re-decision.
--
-- Idempotent + safe to re-run.
-- ===========================================================================

-- 1. Immutable decision metadata.
alter table public.agent_recommendations
    add column if not exists decided_at timestamptz,
    add column if not exists decided_by uuid;

-- 2. Finality enforcement: legal-transition check + write-once decision stamp.
create or replace function public.enforce_recommendation_decision_finality()
returns trigger
language plpgsql
as $$
begin
    -- Validate the status transition against the approved state machine.
    if new.status is distinct from old.status then
        if not (
            (old.status = 'pending'  and new.status in ('approved', 'rejected', 'dismissed'))
            or (old.status = 'approved' and new.status = 'executed')
        ) then
            raise exception
                'decision ledger: illegal status transition % -> % (decisions are final)',
                old.status, new.status
                using errcode = 'check_violation';
        end if;

        -- Stamp the decision moment on the human decision (pending -> terminal).
        if old.status = 'pending' then
            new.decided_at := now();
        end if;
    end if;

    -- decided_at / decided_by are write-once — freeze them once set, regardless
    -- of what any later UPDATE tries to write.
    if old.decided_at is not null then
        new.decided_at := old.decided_at;
    end if;
    if old.decided_by is not null then
        new.decided_by := old.decided_by;
    end if;

    return new;
end;
$$;

drop trigger if exists trg_agent_rec_decision_finality on public.agent_recommendations;
create trigger trg_agent_rec_decision_finality
    before update on public.agent_recommendations
    for each row execute function public.enforce_recommendation_decision_finality();

-- 3. Backfill: existing resolved rows get a decision timestamp from their last
-- update (the closest available proxy). decided_by stays NULL for historical rows
-- (the original decider was not captured) — recorded honestly, not fabricated.
update public.agent_recommendations
   set decided_at = updated_at
 where status <> 'pending'
   and decided_at is null;
