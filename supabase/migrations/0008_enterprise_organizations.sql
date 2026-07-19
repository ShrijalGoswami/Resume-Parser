-- ===========================================================================
-- 0008 — V6 Sprint 10: Enterprise Platform & Organization Management
-- ---------------------------------------------------------------------------
-- Transforms the single-recruiter product into a multi-tenant SaaS platform:
--   Organization → Workspace → Members(role) → Campaigns → Candidates
--
-- ADDITIVE by design. Existing recruiter-scoped tables and their RLS are
-- untouched — org-awareness rolls up through membership (recruiter → org). Each
-- new recruiter is auto-provisioned a personal organization + default workspace +
-- owner membership + free subscription, so existing single-recruiter flows keep
-- working with zero data migration.
--
-- RLS on the new tables is MEMBERSHIP based, using SECURITY DEFINER helpers so
-- policies never recurse through organization_members.
-- ===========================================================================

-- ── Organizations ──────────────────────────────────────────────────────────
create table if not exists public.organizations (
    id           uuid primary key default gen_random_uuid(),
    name         text not null,
    slug         text,
    plan         text not null default 'free',           -- free | professional | business | enterprise
    settings     jsonb not null default '{}'::jsonb,     -- branding / white-label prep
    created_by   uuid references public.recruiters(id) on delete set null,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create table if not exists public.workspaces (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    name             text not null,
    description      text not null default '',
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);
create index if not exists idx_workspaces_org on public.workspaces(organization_id);

create table if not exists public.organization_members (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    user_id          uuid not null references public.recruiters(id) on delete cascade,
    role             text not null default 'recruiter',  -- owner|admin|hiring_manager|recruiter|interviewer|viewer
    status           text not null default 'active',     -- active | invited
    invited_email    text,
    invited_by       uuid references public.recruiters(id) on delete set null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    unique (organization_id, user_id)
);
create index if not exists idx_org_members_org  on public.organization_members(organization_id);
create index if not exists idx_org_members_user on public.organization_members(user_id);

-- ── Audit log (immutable) ──────────────────────────────────────────────────
create table if not exists public.audit_logs (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    workspace_id     uuid references public.workspaces(id) on delete set null,
    user_id          uuid,
    user_email       text,
    action           text not null,
    resource_type    text not null default '',
    resource_id      text not null default '',
    metadata         jsonb not null default '{}'::jsonb,
    created_at       timestamptz not null default now()
);
create index if not exists idx_audit_org_time on public.audit_logs(organization_id, created_at desc);
create index if not exists idx_audit_action   on public.audit_logs(organization_id, action);

-- ── Usage counters (per org / period / metric) ─────────────────────────────
create table if not exists public.org_usage_counters (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    period           text not null,                       -- e.g. '2026-07'
    metric           text not null,                       -- ai_requests | tokens | comparisons | ...
    value            bigint not null default 0,
    updated_at       timestamptz not null default now(),
    unique (organization_id, period, metric)
);
create index if not exists idx_usage_org on public.org_usage_counters(organization_id, period);

-- ── Subscriptions ──────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
    id                    uuid primary key default gen_random_uuid(),
    organization_id       uuid not null unique references public.organizations(id) on delete cascade,
    plan                  text not null default 'free',
    status                text not null default 'active',
    limits                jsonb not null default '{}'::jsonb,
    current_period_start  timestamptz not null default now(),
    current_period_end    timestamptz,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

-- ── Feature flags (per org) ────────────────────────────────────────────────
create table if not exists public.org_feature_flags (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    flag             text not null,
    enabled          boolean not null default true,
    updated_at       timestamptz not null default now(),
    unique (organization_id, flag)
);
create index if not exists idx_flags_org on public.org_feature_flags(organization_id);

-- ── API keys (scaffolding — scoped keys for future integrations) ────────────
create table if not exists public.api_keys (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    name             text not null,
    prefix           text not null,                       -- shown; full key never stored
    key_hash         text not null,                       -- hash of the secret
    scope            text not null default 'read_only',   -- read_only | read_write | admin
    created_by       uuid references public.recruiters(id) on delete set null,
    last_used_at     timestamptz,
    revoked          boolean not null default false,
    created_at       timestamptz not null default now()
);
create index if not exists idx_api_keys_org on public.api_keys(organization_id);

-- ── Recruiters gain a tenant anchor ────────────────────────────────────────
alter table public.recruiters add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.recruiters add column if not exists active_workspace_id uuid references public.workspaces(id) on delete set null;

-- ── updated_at triggers ────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['organizations','workspaces','organization_members','subscriptions'] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I;', t, t);
    execute format('create trigger trg_%s_updated_at before update on public.%I for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- ── Membership helpers (SECURITY DEFINER → no RLS recursion) ────────────────
create or replace function public.is_org_member(org uuid)
returns boolean language sql security definer stable set search_path = public as $$
    select exists (
        select 1 from public.organization_members m
        where m.organization_id = org and m.user_id = (select auth.uid()) and m.status = 'active'
    );
$$;

create or replace function public.is_org_admin(org uuid)
returns boolean language sql security definer stable set search_path = public as $$
    select exists (
        select 1 from public.organization_members m
        where m.organization_id = org and m.user_id = (select auth.uid())
          and m.status = 'active' and m.role in ('owner', 'admin')
    );
$$;

-- ── Auto-provision a personal org for every new recruiter ──────────────────
create or replace function public.provision_default_org()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    org_id uuid;
    ws_id  uuid;
begin
    if new.organization_id is not null then
        return new;
    end if;
    insert into public.organizations (name, plan, created_by)
        values (coalesce(nullif(new.company, ''), split_part(new.email, '@', 1) || '''s Organization'), 'free', new.id)
        returning id into org_id;
    insert into public.workspaces (organization_id, name, description)
        values (org_id, 'Default Workspace', 'Default workspace') returning id into ws_id;
    insert into public.organization_members (organization_id, user_id, role, status)
        values (org_id, new.id, 'owner', 'active');
    insert into public.subscriptions (organization_id, plan) values (org_id, 'free');
    update public.recruiters set organization_id = org_id, active_workspace_id = ws_id where id = new.id;
    new.organization_id := org_id;
    new.active_workspace_id := ws_id;
    return new;
end;
$$;

drop trigger if exists on_recruiter_provision_org on public.recruiters;
create trigger on_recruiter_provision_org
    before insert on public.recruiters
    for each row execute function public.provision_default_org();

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table public.organizations        enable row level security;
alter table public.workspaces           enable row level security;
alter table public.organization_members enable row level security;
alter table public.audit_logs           enable row level security;
alter table public.org_usage_counters   enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.org_feature_flags    enable row level security;
alter table public.api_keys             enable row level security;

-- Organizations: members read; admins update.
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select using (public.is_org_member(id));
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));
drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations for insert with check (created_by = (select auth.uid()));

-- Member-readable / admin-writable tables.
do $$
declare t text;
begin
  foreach t in array array['workspaces','subscriptions','org_feature_flags','api_keys'] loop
    execute format('drop policy if exists %s_select on public.%I;', t, t);
    execute format('create policy %s_select on public.%I for select using (public.is_org_member(organization_id));', t, t);
    execute format('drop policy if exists %s_write on public.%I;', t, t);
    execute format('create policy %s_write on public.%I for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));', t, t);
  end loop;
end $$;

-- Members: members read; admins manage; a user can always see their own membership.
drop policy if exists org_members_select on public.organization_members;
create policy org_members_select on public.organization_members for select
    using (user_id = (select auth.uid()) or public.is_org_admin(organization_id));
drop policy if exists org_members_write on public.organization_members;
create policy org_members_write on public.organization_members for all
    using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- Audit logs: members read, members append; IMMUTABLE (no update/delete policy).
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs for select using (public.is_org_member(organization_id));
drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs for insert with check (public.is_org_member(organization_id));

-- Usage counters: members read + write (server records usage as the member).
drop policy if exists usage_select on public.org_usage_counters;
create policy usage_select on public.org_usage_counters for select using (public.is_org_member(organization_id));
drop policy if exists usage_write on public.org_usage_counters;
create policy usage_write on public.org_usage_counters for all
    using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

grant select, insert, update, delete on
    public.organizations, public.workspaces, public.organization_members,
    public.org_usage_counters, public.subscriptions, public.org_feature_flags, public.api_keys to authenticated;
grant select, insert on public.audit_logs to authenticated;

-- ── Backfill: give every existing recruiter a personal org ─────────────────
do $$
declare r record; org_id uuid; ws_id uuid;
begin
  for r in select id, email, company from public.recruiters where organization_id is null loop
    insert into public.organizations (name, plan, created_by)
      values (coalesce(nullif(r.company, ''), split_part(r.email, '@', 1) || '''s Organization'), 'free', r.id)
      returning id into org_id;
    insert into public.workspaces (organization_id, name, description)
      values (org_id, 'Default Workspace', 'Default workspace') returning id into ws_id;
    insert into public.organization_members (organization_id, user_id, role, status)
      values (org_id, r.id, 'owner', 'active') on conflict do nothing;
    insert into public.subscriptions (organization_id, plan) values (org_id, 'free') on conflict do nothing;
    update public.recruiters set organization_id = org_id, active_workspace_id = ws_id where id = r.id;
  end loop;
end $$;
