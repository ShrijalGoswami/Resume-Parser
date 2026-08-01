-- ===========================================================================
-- 0018 — Monetization Phase 1: org-scope the tables quotas are counted from
-- ---------------------------------------------------------------------------
-- `candidate_uploads` and `campaigns` are recruiter-scoped: both carry
-- `recruiter_id` and reach an organization only by joining through
-- `public.recruiters`. But the résumé credit and the campaign ("role") allowance
-- are ORGANIZATION limits. Counting them per recruiter would give a three-person
-- organization three independent free quotas, which is not a quota.
--
-- Adding the column (rather than joining at read time) also keeps the quota read
-- to a single indexed count on the hot upload path.
--
-- The columns are nullable: existing RLS and every existing query are unaffected,
-- and a row that somehow arrives without an organization is visible as such
-- rather than being silently attributed to the wrong tenant.
--
-- Additive and idempotent — safe to re-run.
-- ===========================================================================

alter table public.candidate_uploads
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

alter table public.campaigns
    add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_candidate_uploads_org on public.candidate_uploads(organization_id);
create index if not exists idx_campaigns_org         on public.campaigns(organization_id);

-- Backfill from the recruiter's tenant anchor (added in 0008). Re-running only
-- touches rows still missing an organization.
update public.candidate_uploads u
   set organization_id = r.organization_id
  from public.recruiters r
 where r.id = u.recruiter_id
   and u.organization_id is null
   and r.organization_id is not null;

update public.campaigns c
   set organization_id = r.organization_id
  from public.recruiters r
 where r.id = c.recruiter_id
   and c.organization_id is null
   and r.organization_id is not null;
