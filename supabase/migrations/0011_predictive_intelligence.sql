-- ===========================================================================
-- 0011 — V8 Sprint 13: Predictive Intelligence & Organizational Digital Twin
-- ---------------------------------------------------------------------------
-- Records deterministic forecasts (for history + outcome evaluation / model
-- governance) and the incremental Digital Twin state per organization.
-- Org-scoped (membership RLS). No model artifacts/secrets are stored — only
-- the transparent forecast outputs.
-- ===========================================================================

create table if not exists public.prediction_snapshots (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    forecast_type    text not null,
    target           text not null default '',
    probability      double precision,
    value            double precision,
    confidence       integer not null default 50,
    factors          jsonb not null default '[]'::jsonb,
    evidence         jsonb not null default '[]'::jsonb,
    params           jsonb not null default '{}'::jsonb,
    outcome          integer,                       -- realised 0/1 (filled later) for evaluation
    created_at       timestamptz not null default now()
);
create index if not exists idx_pred_org_time on public.prediction_snapshots(organization_id, created_at desc);
create index if not exists idx_pred_org_type on public.prediction_snapshots(organization_id, forecast_type);

create table if not exists public.digital_twin_state (
    organization_id  uuid primary key references public.organizations(id) on delete cascade,
    state            jsonb not null default '{}'::jsonb,
    updated_at       timestamptz not null default now()
);

alter table public.prediction_snapshots enable row level security;
alter table public.digital_twin_state   enable row level security;

drop policy if exists prediction_snapshots_select on public.prediction_snapshots;
create policy prediction_snapshots_select on public.prediction_snapshots for select using (public.is_org_member(organization_id));
drop policy if exists prediction_snapshots_write on public.prediction_snapshots;
create policy prediction_snapshots_write on public.prediction_snapshots for all
    using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

drop policy if exists digital_twin_select on public.digital_twin_state;
create policy digital_twin_select on public.digital_twin_state for select using (public.is_org_member(organization_id));
drop policy if exists digital_twin_write on public.digital_twin_state;
create policy digital_twin_write on public.digital_twin_state for all
    using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

grant select, insert, update, delete on public.prediction_snapshots, public.digital_twin_state to authenticated;
