-- ===========================================================================
-- 0017 — Monetization Phase 1: atomic usage counters
-- ---------------------------------------------------------------------------
-- `UsageRepository.increment` was a read-modify-write: SELECT the current value,
-- add one, UPSERT the result. Two concurrent uploads read the same value and
-- write the same value+1, so N uploads could record fewer than N. That was
-- tolerable while counters were statistics; it is not tolerable now that a
-- counter decides whether a résumé may be uploaded at all — the lost update IS
-- the quota bypass, and the upload path is inherently concurrent (a batch is
-- analysed in a pool).
--
-- `on conflict do update` performs the read and the write in ONE statement under
-- the row lock the unique index already provides, so concurrent callers serialise
-- correctly and each increment lands exactly once.
--
-- The `period` column carries either a month key ('2026-07') or the literal
-- 'lifetime'. FREE counts résumés for the lifetime of the organization, PLUS/PRO
-- per calendar month — same table, same function, no schema fork.
--
-- Idempotent — `create or replace`.
-- ===========================================================================

create or replace function public.increment_usage(
    p_org    uuid,
    p_period text,
    p_metric text,
    p_delta  bigint default 1
) returns bigint
language sql
security definer
set search_path = public
as $$
    insert into public.org_usage_counters (organization_id, period, metric, value)
    values (p_org, p_period, p_metric, p_delta)
    on conflict (organization_id, period, metric)
        do update set value      = org_usage_counters.value + excluded.value,
                      updated_at = now()
    returning value;
$$;

comment on function public.increment_usage(uuid, text, text, bigint) is
    'Atomically add p_delta to one (org, period, metric) counter and return the new value. '
    'The ONLY sanctioned way to move a usage counter — see migration 0017.';

-- Callable by the backend's service role only. A client that could increment its
-- own counters could also decrement them.
revoke all on function public.increment_usage(uuid, text, text, bigint) from public;
revoke all on function public.increment_usage(uuid, text, text, bigint) from anon, authenticated;


-- The companion read function, `usage_snapshot`, lives in migration 0021: it
-- counts campaigns per organization, and `campaigns.organization_id` does not
-- exist until 0018. Defining it here failed with "column g.organization_id does
-- not exist" — a function body IS validated at creation time for SQL-language
-- functions, so a forward reference to a later migration's column is a hard
-- error, not a deferred one.
