-- ============================================================================
-- HireLens AI — V4 Sprint 1: Supabase Foundation
-- Migration 0001 — Core schema (tables, enums, indexes, triggers)
-- ----------------------------------------------------------------------------
-- Converts HireLens from a stateless AI app into a persistent SaaS platform.
--
-- Design principles:
--   * One recruiter (auth.users) owns many campaigns.
--   * A campaign owns its job description, candidates, notes, conversations.
--   * AI outputs are STORED, never recomputed. `candidate_analyses.result`
--     holds the exact CandidateResult JSON produced by the existing pipeline.
--   * `recruiter_id` is denormalized onto every table so RLS policies are a
--     single index-backed equality check (`recruiter_id = auth.uid()`), never
--     a multi-hop join. This is the standard Supabase multi-tenant pattern.
--   * Everything is future-proofed: jsonb payloads for evolving AI shapes,
--     enums for controlled vocabularies, updated_at triggers, soft ordering.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy search on names/titles

-- ---------------------------------------------------------------------------
-- Enumerated types (controlled vocabularies)
-- ---------------------------------------------------------------------------
do $$ begin
    create type campaign_status as enum ('draft', 'active', 'paused', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
    -- Recruiting pipeline stage for a candidate within a campaign.
    create type pipeline_stage as enum (
        'sourced', 'screening', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'
    );
exception when duplicate_object then null; end $$;

do $$ begin
    create type message_role as enum ('user', 'assistant', 'system');
exception when duplicate_object then null; end $$;

do $$ begin
    create type activity_type as enum (
        'campaign_created', 'campaign_updated', 'campaign_archived',
        'batch_analyzed', 'candidate_added', 'candidate_stage_changed',
        'note_added', 'copilot_message', 'interview_pack_generated',
        'resume_uploaded'
    );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at trigger helper (reused by every mutable table)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ===========================================================================
-- recruiters — profile row mirroring auth.users (1:1)
-- ---------------------------------------------------------------------------
-- Supabase owns identity in auth.users; this table holds product-facing
-- profile data and is the anchor all other tables reference. Auto-populated
-- by an auth trigger (see migration 0004) so a profile always exists.
-- ===========================================================================
create table if not exists public.recruiters (
    id           uuid primary key references auth.users(id) on delete cascade,
    email        text not null,
    full_name    text,
    company      text,
    job_title    text,
    avatar_url   text,
    onboarded    boolean not null default false,
    metadata     jsonb   not null default '{}'::jsonb,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

drop trigger if exists trg_recruiters_updated_at on public.recruiters;
create trigger trg_recruiters_updated_at
    before update on public.recruiters
    for each row execute function public.set_updated_at();

-- ===========================================================================
-- campaigns — one hiring process (e.g. "Backend Engineer Hiring")
-- ===========================================================================
create table if not exists public.campaigns (
    id                uuid primary key default gen_random_uuid(),
    recruiter_id      uuid not null references public.recruiters(id) on delete cascade,
    title             text not null,
    role_title        text,
    department        text,
    location          text,
    employment_type   text,
    job_description   text not null default '',
    jd_storage_path   text,                    -- optional uploaded JD file (job-descriptions bucket)
    -- Ranking weights used for this campaign; mirrors RankingWeights schema.
    ranking_weights   jsonb not null default jsonb_build_object(
                          'skills', 30, 'experience', 20, 'projects', 15,
                          'ats', 10, 'education', 10, 'semantic', 10, 'achievements', 5),
    status            campaign_status not null default 'draft',
    metadata          jsonb not null default '{}'::jsonb,
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists idx_campaigns_recruiter    on public.campaigns(recruiter_id, created_at desc);
create index if not exists idx_campaigns_status        on public.campaigns(recruiter_id, status);
create index if not exists idx_campaigns_title_trgm    on public.campaigns using gin (title gin_trgm_ops);

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
    before update on public.campaigns
    for each row execute function public.set_updated_at();

-- ===========================================================================
-- candidates — a person/resume within a campaign
-- ---------------------------------------------------------------------------
-- Durable identity for a candidate (the pipeline's candidate_id is ephemeral).
-- Holds contact info + resume file location + pipeline stage. The heavy AI
-- output lives in candidate_analyses (1:N, versioned) to avoid duplication.
-- ===========================================================================
create table if not exists public.candidates (
    id                 uuid primary key default gen_random_uuid(),
    campaign_id        uuid not null references public.campaigns(id) on delete cascade,
    recruiter_id       uuid not null references public.recruiters(id) on delete cascade,
    full_name          text not null default '',
    email              text,
    phone              text,
    -- Private Storage object key in the `resumes` bucket. Never a public URL.
    resume_path        text,
    resume_filename    text,
    -- Correlates candidates persisted from the same batch-analysis request.
    source_batch_id    uuid,
    stage              pipeline_stage not null default 'sourced',
    is_favorite        boolean not null default false,
    metadata           jsonb not null default '{}'::jsonb,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists idx_candidates_campaign   on public.candidates(campaign_id, created_at desc);
create index if not exists idx_candidates_recruiter   on public.candidates(recruiter_id);
create index if not exists idx_candidates_stage        on public.candidates(campaign_id, stage);
create index if not exists idx_candidates_batch        on public.candidates(source_batch_id);
create index if not exists idx_candidates_name_trgm    on public.candidates using gin (full_name gin_trgm_ops);

drop trigger if exists trg_candidates_updated_at on public.candidates;
create trigger trg_candidates_updated_at
    before update on public.candidates
    for each row execute function public.set_updated_at();

-- ===========================================================================
-- candidate_analyses — stored AI output (references, never recomputes)
-- ---------------------------------------------------------------------------
-- `result` is the verbatim CandidateResult JSON from batch_service. The scalar
-- columns are denormalized projections for fast ranking/filtering/analytics
-- without unpacking jsonb. Versioned (analysis_version) so re-runs append.
-- ===========================================================================
create table if not exists public.candidate_analyses (
    id                    uuid primary key default gen_random_uuid(),
    candidate_id          uuid not null references public.candidates(id) on delete cascade,
    campaign_id           uuid not null references public.campaigns(id) on delete cascade,
    recruiter_id          uuid not null references public.recruiters(id) on delete cascade,
    analysis_version      text not null default 'v1.0',
    -- Denormalized scalar projections of `result` for cheap querying.
    rank                  integer,
    overall_score         integer,
    ats_score             integer,
    semantic_similarity   double precision,
    years_experience      double precision,
    match_category        text,
    recommendation        text,
    -- Full verbatim AI output (schemas.batch.CandidateResult.model_dump()).
    result                jsonb not null,
    created_at            timestamptz not null default now()
);

create index if not exists idx_analyses_candidate  on public.candidate_analyses(candidate_id, created_at desc);
create index if not exists idx_analyses_campaign    on public.candidate_analyses(campaign_id, overall_score desc);
create index if not exists idx_analyses_recruiter    on public.candidate_analyses(recruiter_id);

-- Latest analysis per candidate is the common read; a partial unique isn't
-- possible without a flag, so callers order by created_at desc limit 1.

-- ===========================================================================
-- recruiter_notes — free-form notes on a candidate
-- ===========================================================================
create table if not exists public.recruiter_notes (
    id             uuid primary key default gen_random_uuid(),
    candidate_id   uuid not null references public.candidates(id) on delete cascade,
    campaign_id    uuid not null references public.campaigns(id) on delete cascade,
    recruiter_id   uuid not null references public.recruiters(id) on delete cascade,
    body           text not null,
    pinned         boolean not null default false,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index if not exists idx_notes_candidate  on public.recruiter_notes(candidate_id, created_at desc);
create index if not exists idx_notes_recruiter   on public.recruiter_notes(recruiter_id);

drop trigger if exists trg_notes_updated_at on public.recruiter_notes;
create trigger trg_notes_updated_at
    before update on public.recruiter_notes
    for each row execute function public.set_updated_at();

-- ===========================================================================
-- copilot_conversations + copilot_messages — persisted AI Copilot threads
-- ---------------------------------------------------------------------------
-- Replaces the current 100%-client-held chat history. A conversation is scoped
-- to one candidate; messages store the full CopilotResponse metadata (evidence,
-- confidence, followups) in `metadata` jsonb so nothing is lost on reload.
-- ===========================================================================
create table if not exists public.copilot_conversations (
    id             uuid primary key default gen_random_uuid(),
    candidate_id   uuid not null references public.candidates(id) on delete cascade,
    campaign_id    uuid not null references public.campaigns(id) on delete cascade,
    recruiter_id   uuid not null references public.recruiters(id) on delete cascade,
    title          text not null default 'New conversation',
    metadata       jsonb not null default '{}'::jsonb,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);

create index if not exists idx_conv_candidate  on public.copilot_conversations(candidate_id, updated_at desc);
create index if not exists idx_conv_recruiter    on public.copilot_conversations(recruiter_id);

drop trigger if exists trg_conv_updated_at on public.copilot_conversations;
create trigger trg_conv_updated_at
    before update on public.copilot_conversations
    for each row execute function public.set_updated_at();

create table if not exists public.copilot_messages (
    id                uuid primary key default gen_random_uuid(),
    conversation_id   uuid not null references public.copilot_conversations(id) on delete cascade,
    recruiter_id      uuid not null references public.recruiters(id) on delete cascade,
    role              message_role not null,
    content           text not null,
    -- For assistant turns: {confidence, evidence[], reasoning_summary, followups, degraded}.
    metadata          jsonb not null default '{}'::jsonb,
    created_at        timestamptz not null default now()
);

create index if not exists idx_msg_conversation  on public.copilot_messages(conversation_id, created_at asc);
create index if not exists idx_msg_recruiter       on public.copilot_messages(recruiter_id);

-- ===========================================================================
-- interview_packs — generated interview kits for a candidate
-- ===========================================================================
create table if not exists public.interview_packs (
    id              uuid primary key default gen_random_uuid(),
    candidate_id    uuid not null references public.candidates(id) on delete cascade,
    campaign_id     uuid not null references public.campaigns(id) on delete cascade,
    recruiter_id    uuid not null references public.recruiters(id) on delete cascade,
    title           text not null default 'Interview Pack',
    -- List of {question, category, rationale} objects.
    questions       jsonb not null default '[]'::jsonb,
    -- Optional generated PDF in the `interview-packs` bucket.
    storage_path    text,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists idx_packs_candidate  on public.interview_packs(candidate_id, created_at desc);
create index if not exists idx_packs_recruiter    on public.interview_packs(recruiter_id);

drop trigger if exists trg_packs_updated_at on public.interview_packs;
create trigger trg_packs_updated_at
    before update on public.interview_packs
    for each row execute function public.set_updated_at();

-- ===========================================================================
-- activity_events — append-only recruiter activity timeline
-- ===========================================================================
create table if not exists public.activity_events (
    id             uuid primary key default gen_random_uuid(),
    recruiter_id   uuid not null references public.recruiters(id) on delete cascade,
    campaign_id    uuid references public.campaigns(id) on delete cascade,
    candidate_id   uuid references public.candidates(id) on delete cascade,
    type           activity_type not null,
    summary        text not null default '',
    payload        jsonb not null default '{}'::jsonb,
    created_at     timestamptz not null default now()
);

create index if not exists idx_activity_recruiter  on public.activity_events(recruiter_id, created_at desc);
create index if not exists idx_activity_campaign     on public.activity_events(campaign_id, created_at desc);

-- ===========================================================================
-- Convenience view: latest analysis per candidate (security_invoker → RLS applies)
-- ===========================================================================
create or replace view public.candidate_latest_analysis
with (security_invoker = true) as
select distinct on (ca.candidate_id)
    ca.*
from public.candidate_analyses ca
order by ca.candidate_id, ca.created_at desc;

comment on view public.candidate_latest_analysis is
    'Most recent candidate_analyses row per candidate. security_invoker=true so caller RLS is enforced.';
