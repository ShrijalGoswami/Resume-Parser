-- ===========================================================================
-- 0005 — V5 Recruiter Copilot: page-scoped conversations
-- ---------------------------------------------------------------------------
-- The V5 Copilot is a cross-page recruiter assistant (Dashboard, Campaign,
-- Candidate, Analytics), not just a per-candidate chat. A conversation must be
-- able to exist without a specific candidate/campaign, so we relax the NOT NULL
-- constraints on copilot_conversations and record which page context the thread
-- started in.
--
-- RLS is unchanged: the generic recruiter_id policies from 0002 already cover
-- all CRUD on copilot_conversations / copilot_messages for the owning recruiter.
-- Idempotent and backwards-compatible with existing rows.
-- ===========================================================================

alter table public.copilot_conversations
    alter column candidate_id drop not null;

alter table public.copilot_conversations
    alter column campaign_id drop not null;

alter table public.copilot_conversations
    add column if not exists context_type text not null default 'global';

-- Fast listing of all of a recruiter's conversations, most-recent first.
create index if not exists idx_conv_recruiter_updated
    on public.copilot_conversations(recruiter_id, updated_at desc);
