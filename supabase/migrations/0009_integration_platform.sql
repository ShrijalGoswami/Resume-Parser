-- ===========================================================================
-- 0009 — V6 Sprint 11: Integration Platform & Workflow Automation
-- ---------------------------------------------------------------------------
-- Organization-scoped external integrations, automation rules, execution history,
-- and webhook endpoints. Credentials are stored ENCRYPTED (never plaintext).
-- RLS is membership-based, matching the enterprise model from 0008.
-- ===========================================================================

create table if not exists public.integration_connections (
    id                    uuid primary key default gen_random_uuid(),
    organization_id       uuid not null references public.organizations(id) on delete cascade,
    provider              text not null,
    status                text not null default 'disconnected',   -- connected | disconnected | error
    scopes                jsonb not null default '[]'::jsonb,
    credentials_encrypted text,                                    -- Fernet-encrypted token blob
    connected_by          uuid references public.recruiters(id) on delete set null,
    health                text not null default 'unknown',         -- healthy | degraded | error | unknown
    last_sync_at          timestamptz,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now(),
    unique (organization_id, provider)
);
create index if not exists idx_int_conn_org on public.integration_connections(organization_id);

create table if not exists public.automation_rules (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    name             text not null,
    trigger_event    text not null,
    steps            jsonb not null default '[]'::jsonb,           -- [{action, provider, params}]
    enabled          boolean not null default true,
    created_by       uuid references public.recruiters(id) on delete set null,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);
create index if not exists idx_rules_org_event on public.automation_rules(organization_id, trigger_event);

create table if not exists public.integration_executions (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    rule_id          uuid,
    rule_name        text not null default '',
    event            text not null,
    status           text not null,                               -- success | failed | partial
    steps            jsonb not null default '[]'::jsonb,
    latency_ms       integer not null default 0,
    error            text,
    created_at       timestamptz not null default now()
);
create index if not exists idx_exec_org_time on public.integration_executions(organization_id, created_at desc);
create index if not exists idx_exec_status   on public.integration_executions(organization_id, status);

create table if not exists public.webhook_endpoints (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    provider         text not null default 'webhook',
    secret           text not null,
    enabled          boolean not null default true,
    created_at       timestamptz not null default now()
);
create index if not exists idx_webhook_org on public.webhook_endpoints(organization_id);

do $$
declare t text;
begin
  foreach t in array array['integration_connections','automation_rules'] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I;', t, t);
    execute format('create trigger trg_%s_updated_at before update on public.%I for each row execute function public.set_updated_at();', t, t);
  end loop;
end $$;

-- RLS (membership-based; helpers from 0008).
do $$
declare t text;
begin
  foreach t in array array['integration_connections','automation_rules','integration_executions','webhook_endpoints'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %s_select on public.%I;', t, t);
    execute format('create policy %s_select on public.%I for select using (public.is_org_member(organization_id));', t, t);
    execute format('drop policy if exists %s_write on public.%I;', t, t);
    execute format('create policy %s_write on public.%I for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));', t, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated;', t);
  end loop;
end $$;
