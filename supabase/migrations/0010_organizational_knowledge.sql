-- ===========================================================================
-- 0010 — V7 Sprint 12: Organizational Knowledge Layer (long-term memory)
-- ---------------------------------------------------------------------------
-- Company-wide recruiting knowledge that persists as people rotate. Structured
-- knowledge items (facts/preferences/decisions/outcomes/patterns) + a lightweight
-- knowledge graph (entity relationships). Everything is organization-scoped
-- (membership RLS) and time-aware (occurred_at) for temporal reasoning.
-- ===========================================================================

create table if not exists public.knowledge_items (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    workspace_id     uuid references public.workspaces(id) on delete set null,
    kind             text not null default 'fact',   -- fact | preference | decision | outcome | pattern
    subject          text not null default '',
    predicate        text not null default '',
    object           text not null default '',
    value_text       text not null default '',        -- human-readable statement
    confidence       integer not null default 60,      -- 0–100
    source           text not null default '',         -- copilot | comparison | interview | report | agent | note | decision | workflow
    source_id        text not null default '',
    entities         jsonb not null default '[]'::jsonb,  -- [{type, name}]
    metadata         jsonb not null default '{}'::jsonb,
    occurred_at      timestamptz not null default now(),  -- event time (temporal memory)
    status           text not null default 'active',   -- active | archived | invalidated
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);
create index if not exists idx_know_org_time   on public.knowledge_items(organization_id, occurred_at desc);
create index if not exists idx_know_org_kind    on public.knowledge_items(organization_id, kind);
create index if not exists idx_know_org_source  on public.knowledge_items(organization_id, source);
create index if not exists idx_know_org_status  on public.knowledge_items(organization_id, status);

create table if not exists public.knowledge_edges (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    source_type      text not null default '',
    source_name      text not null,
    relation         text not null,
    target_type      text not null default '',
    target_name      text not null,
    weight           integer not null default 1,
    item_id          uuid references public.knowledge_items(id) on delete cascade,
    created_at       timestamptz not null default now()
);
create index if not exists idx_edge_org_src on public.knowledge_edges(organization_id, source_name);
create index if not exists idx_edge_org_tgt on public.knowledge_edges(organization_id, target_name);

drop trigger if exists trg_know_updated_at on public.knowledge_items;
create trigger trg_know_updated_at before update on public.knowledge_items
    for each row execute function public.set_updated_at();

-- RLS (membership-based; helpers from 0008).
do $$
declare t text;
begin
  foreach t in array array['knowledge_items','knowledge_edges'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %s_select on public.%I;', t, t);
    execute format('create policy %s_select on public.%I for select using (public.is_org_member(organization_id));', t, t);
    execute format('drop policy if exists %s_write on public.%I;', t, t);
    execute format('create policy %s_write on public.%I for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
  end loop;
end $$;
