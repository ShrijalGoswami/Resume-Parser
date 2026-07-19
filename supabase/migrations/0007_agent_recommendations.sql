-- ===========================================================================
-- 0007 — V5 Autonomous Recruiting Agent: recommendations
-- ---------------------------------------------------------------------------
-- The agent detects pipeline situations and produces explainable, evidence-backed
-- recommendations that REQUIRE HUMAN APPROVAL. Nothing here modifies production
-- data; the agent only writes its own recommendations. `dedupe_key` makes scans
-- idempotent (one open recommendation per workflow+entity).
--
-- Isolated + idempotent. RLS mirrors the platform's recruiter_id = auth.uid()
-- model exactly.
-- ===========================================================================

create table if not exists public.agent_recommendations (
    id                 uuid primary key default gen_random_uuid(),
    recruiter_id       uuid not null references public.recruiters(id) on delete cascade,
    workflow           text not null,
    dedupe_key         text not null,
    category           text not null default 'action',   -- action | urgent | campaign_risk | candidate_alert
    severity           text not null default 'medium',    -- urgent | high | medium | low
    confidence         integer not null default 0,
    title              text not null,
    why                text not null default '',
    recommended_action text not null default '',
    evidence           jsonb not null default '[]'::jsonb,
    data_sources       jsonb not null default '[]'::jsonb,
    tools_used         jsonb not null default '[]'::jsonb,
    suggested_tool     text not null default '',
    tool_params        jsonb not null default '{}'::jsonb,
    campaign_id        uuid references public.campaigns(id) on delete cascade,
    campaign_title     text,
    candidate_id       uuid references public.candidates(id) on delete cascade,
    candidate_name     text,
    status             text not null default 'pending',   -- pending|approved|rejected|dismissed|executed
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists idx_agent_rec_recruiter on public.agent_recommendations(recruiter_id, status, created_at desc);
create index if not exists idx_agent_rec_dedupe     on public.agent_recommendations(recruiter_id, dedupe_key);

drop trigger if exists trg_agent_rec_updated_at on public.agent_recommendations;
create trigger trg_agent_rec_updated_at
    before update on public.agent_recommendations
    for each row execute function public.set_updated_at();

alter table public.agent_recommendations enable row level security;

drop policy if exists agent_recommendations_select_own on public.agent_recommendations;
create policy agent_recommendations_select_own on public.agent_recommendations
    for select using (recruiter_id = (select auth.uid()));

drop policy if exists agent_recommendations_insert_own on public.agent_recommendations;
create policy agent_recommendations_insert_own on public.agent_recommendations
    for insert with check (recruiter_id = (select auth.uid()));

drop policy if exists agent_recommendations_update_own on public.agent_recommendations;
create policy agent_recommendations_update_own on public.agent_recommendations
    for update using (recruiter_id = (select auth.uid()))
    with check (recruiter_id = (select auth.uid()));

drop policy if exists agent_recommendations_delete_own on public.agent_recommendations;
create policy agent_recommendations_delete_own on public.agent_recommendations
    for delete using (recruiter_id = (select auth.uid()));

grant select, insert, update, delete on public.agent_recommendations to authenticated;
