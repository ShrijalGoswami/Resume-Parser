-- ============================================================================
-- HireLens AI — V4 Sprint 1: Supabase Foundation
-- Migration 0002 — Row Level Security
-- ----------------------------------------------------------------------------
-- Mandatory tenant isolation: a recruiter can only ever touch their own rows.
-- Every table carries recruiter_id, so each policy is a single equality check
-- against auth.uid(). The service_role key (used by trusted backend workers)
-- bypasses RLS entirely by Postgres design — the backend must therefore scope
-- writes to the authenticated recruiter explicitly (see repositories).
-- ============================================================================

-- Enable + force RLS on every table (force = owners are subject to RLS too).
alter table public.recruiters             enable row level security;
alter table public.campaigns              enable row level security;
alter table public.candidates             enable row level security;
alter table public.candidate_analyses     enable row level security;
alter table public.recruiter_notes        enable row level security;
alter table public.copilot_conversations  enable row level security;
alter table public.copilot_messages       enable row level security;
alter table public.interview_packs        enable row level security;
alter table public.activity_events        enable row level security;

-- ---------------------------------------------------------------------------
-- recruiters — a recruiter sees and edits only their own profile.
-- Insert is allowed for self so first-login provisioning works even if the
-- auth trigger is absent. No delete (handled by auth.users cascade).
-- ---------------------------------------------------------------------------
drop policy if exists recruiters_select_own on public.recruiters;
create policy recruiters_select_own on public.recruiters
    for select using (id = (select auth.uid()));

drop policy if exists recruiters_insert_self on public.recruiters;
create policy recruiters_insert_self on public.recruiters
    for insert with check (id = (select auth.uid()));

drop policy if exists recruiters_update_own on public.recruiters;
create policy recruiters_update_own on public.recruiters
    for update using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Generic owner policies for all recruiter_id-scoped tables.
-- A helper avoids repeating the same four policies nine times.
-- (select auth.uid()) is wrapped so the planner caches it per-statement.
-- ---------------------------------------------------------------------------
do $$
declare
    t text;
    owned_tables text[] := array[
        'campaigns', 'candidates', 'candidate_analyses', 'recruiter_notes',
        'copilot_conversations', 'copilot_messages', 'interview_packs',
        'activity_events'
    ];
begin
    foreach t in array owned_tables loop
        execute format('drop policy if exists %I_select_own on public.%I;', t, t);
        execute format(
            'create policy %I_select_own on public.%I for select using (recruiter_id = (select auth.uid()));',
            t, t);

        execute format('drop policy if exists %I_insert_own on public.%I;', t, t);
        execute format(
            'create policy %I_insert_own on public.%I for insert with check (recruiter_id = (select auth.uid()));',
            t, t);

        execute format('drop policy if exists %I_update_own on public.%I;', t, t);
        execute format(
            'create policy %I_update_own on public.%I for update using (recruiter_id = (select auth.uid())) with check (recruiter_id = (select auth.uid()));',
            t, t);

        execute format('drop policy if exists %I_delete_own on public.%I;', t, t);
        execute format(
            'create policy %I_delete_own on public.%I for delete using (recruiter_id = (select auth.uid()));',
            t, t);
    end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Grants: authenticated users operate through RLS; anon has no access.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.candidate_latest_analysis to authenticated;
alter default privileges in schema public
    grant select, insert, update, delete on tables to authenticated;
