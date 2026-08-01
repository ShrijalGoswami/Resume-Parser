-- ===========================================================================
-- 0020 — Monetization Phase 1: seed résumé usage counters from real history
-- ---------------------------------------------------------------------------
-- The résumé counter is displayed to users ("18 of 25 used"), so it must be
-- truthful from the first render — including for FOUNDING organizations, whose
-- usage is shown even though no limit is enforced against it.
--
-- `candidate_uploads` is the authority for "a résumé entered this organization":
-- it carries one row per stored file with a UNIQUE (campaign_id, file_hash), so
-- a re-upload of the same file was already deduplicated and correctly counts
-- once. Counting `candidates` instead would over-count (a candidate can be
-- re-analysed) and counting storage objects would under-count (deleted campaigns
-- take their objects with them).
--
-- Runs AFTER 0018, which is what gives `candidate_uploads` its organization_id.
--
-- Idempotent: recomputes the value rather than adding to it, so re-running
-- repairs drift instead of doubling it.
-- ===========================================================================

insert into public.org_usage_counters (organization_id, period, metric, value)
select organization_id, 'lifetime', 'resumes', count(*)
  from public.candidate_uploads
 where organization_id is not null
 group by organization_id
on conflict (organization_id, period, metric)
    do update set value = excluded.value, updated_at = now();

-- Per-month history, so a PLUS organization's current-cycle counter is right on
-- day one rather than starting from zero mid-month.
insert into public.org_usage_counters (organization_id, period, metric, value)
select organization_id, to_char(uploaded_at, 'YYYY-MM'), 'resumes', count(*)
  from public.candidate_uploads
 where organization_id is not null
 group by organization_id, to_char(uploaded_at, 'YYYY-MM')
on conflict (organization_id, period, metric)
    do update set value = excluded.value, updated_at = now();
