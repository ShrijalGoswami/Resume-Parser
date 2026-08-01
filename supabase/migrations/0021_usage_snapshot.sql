-- ===========================================================================
-- 0021 — Monetization Phase 1: usage_snapshot
-- ---------------------------------------------------------------------------
-- Every number a quota decision needs, in ONE round trip.
--
-- `OrgContext` is resolved on essentially every authenticated request and is
-- deliberately never cached (a revoked role or a lapsed plan must take effect on
-- the very next request). Its reads were already fanned out in parallel after a
-- measured ~1s of serial waiting; adding three more branches for usage would
-- push that fan-out to seven connections per request. One function returning all
-- four counts keeps the addition to a single branch.
--
-- Ordering: this belongs topically with 0017 (the counter migration) but must
-- run AFTER 0018, because it counts `campaigns.organization_id` and a
-- SQL-language function body is validated when the function is created — a
-- forward reference to a later migration's column fails outright rather than
-- resolving later. It was defined in 0017 first, and that is exactly how it
-- failed.
--
-- Idempotent — `create or replace`.
-- ===========================================================================

create or replace function public.usage_snapshot(p_org uuid, p_period text)
returns table (
    resumes_lifetime bigint,
    resumes_period   bigint,
    members          bigint,
    campaigns        bigint
)
language sql
security definer
stable
set search_path = public
as $$
    select
        coalesce((select c.value from public.org_usage_counters c
                   where c.organization_id = p_org and c.period = 'lifetime'
                     and c.metric = 'resumes'), 0)::bigint,
        coalesce((select c.value from public.org_usage_counters c
                   where c.organization_id = p_org and c.period = p_period
                     and c.metric = 'resumes'), 0)::bigint,
        (select count(*) from public.organization_members m
          where m.organization_id = p_org and m.status = 'active')::bigint,
        (select count(*) from public.campaigns g
          where g.organization_id = p_org)::bigint;
$$;

comment on function public.usage_snapshot(uuid, text) is
    'All quota-relevant counts for one organization in a single round trip (migration 0021).';

revoke all on function public.usage_snapshot(uuid, text) from public;
revoke all on function public.usage_snapshot(uuid, text) from anon, authenticated;
