-- ============================================================================
-- HireLens AI — Content-based upload deduplication
-- Migration 0013 — candidate_uploads + (campaign_id, file_hash) unique
-- ----------------------------------------------------------------------------
-- Replaces development-grade (campaign_id, resume_filename) dedup with
-- production content hashing. Every persisted resume records the SHA-256 of its
-- file contents; a UNIQUE (campaign_id, file_hash) makes the upload pipeline
-- idempotent at the database level — the ultimate backstop against duplicate
-- candidates from double-submits, retries, React Strict Mode, or races.
--
-- Semantics:
--   * Same file twice / after retry / renamed  -> same hash -> deduped.
--   * Two different files, same filename        -> different hashes -> both kept.
--   * Existing candidates keep working: this table is additive and only governs
--     NEW persistence. No existing rows or references are modified.
-- ============================================================================

-- Convenience: store the hash on the candidate row too (nullable; backfilled
-- for new uploads only). Existing candidates simply have NULL and are untouched.
alter table public.candidates
    add column if not exists resume_hash text;

create table if not exists public.candidate_uploads (
    id            uuid primary key default gen_random_uuid(),
    campaign_id   uuid not null references public.campaigns(id)  on delete cascade,
    candidate_id  uuid not null references public.candidates(id) on delete cascade,
    recruiter_id  uuid not null references public.recruiters(id) on delete cascade,
    filename      text,
    file_hash     text not null,          -- SHA-256 hex of the file contents
    file_size     bigint,
    uploaded_at   timestamptz not null default now(),
    -- Idempotency anchor: one content hash per campaign.
    constraint candidate_uploads_campaign_hash_uniq unique (campaign_id, file_hash)
);

create index if not exists idx_candidate_uploads_campaign  on public.candidate_uploads(campaign_id);
create index if not exists idx_candidate_uploads_candidate on public.candidate_uploads(candidate_id);
create index if not exists idx_candidate_uploads_recruiter on public.candidate_uploads(recruiter_id);

-- ── RLS: recruiter-owned, mirroring the generic owner policy from 0002 ───────
alter table public.candidate_uploads enable row level security;

drop policy if exists candidate_uploads_select_own on public.candidate_uploads;
create policy candidate_uploads_select_own on public.candidate_uploads
    for select using (recruiter_id = (select auth.uid()));

drop policy if exists candidate_uploads_insert_own on public.candidate_uploads;
create policy candidate_uploads_insert_own on public.candidate_uploads
    for insert with check (recruiter_id = (select auth.uid()));

drop policy if exists candidate_uploads_update_own on public.candidate_uploads;
create policy candidate_uploads_update_own on public.candidate_uploads
    for update using (recruiter_id = (select auth.uid())) with check (recruiter_id = (select auth.uid()));

drop policy if exists candidate_uploads_delete_own on public.candidate_uploads;
create policy candidate_uploads_delete_own on public.candidate_uploads
    for delete using (recruiter_id = (select auth.uid()));

grant select, insert, update, delete on public.candidate_uploads to authenticated;
