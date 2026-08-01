-- ===========================================================================
-- 0019 — Monetization Phase 1: entitlement grants
-- ---------------------------------------------------------------------------
-- A grant switches ONE capability on for ONE organization above what its plan
-- includes: the negotiated deal ("Pro, plus BYO AI"), the pilot, the apology
-- credit. It is deliberately a different mechanism from `org_feature_flags`,
-- which is an operational kill-switch and may now only SUBTRACT.
--
-- The distinction is the whole point. Today an `org_feature_flags` row can add a
-- capability above the paid plan, so a support toggle and a commercial decision
-- are indistinguishable in the data — and revenue leaks through a table nobody
-- audits. After this migration:
--
--     grants        add    (commercial, expiring, attributed, audited)
--     feature flags subtract only (operational, reversible, no revenue impact)
--
-- `expires_at` is honoured at resolution time: a pilot that lapses closes by
-- itself rather than by someone remembering.
--
-- Additive and idempotent — safe to re-run.
-- ===========================================================================

create table if not exists public.entitlement_grants (
    id               uuid primary key default gen_random_uuid(),
    organization_id  uuid not null references public.organizations(id) on delete cascade,
    feature          text not null,
    granted_by       uuid references public.recruiters(id) on delete set null,
    reason           text not null default '',
    expires_at       timestamptz,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now(),
    unique (organization_id, feature)
);

create index if not exists idx_entitlement_grants_org on public.entitlement_grants(organization_id);

drop trigger if exists trg_entitlement_grants_updated_at on public.entitlement_grants;
create trigger trg_entitlement_grants_updated_at
    before update on public.entitlement_grants
    for each row execute function public.set_updated_at();

-- ── RLS: members may SEE what their organization has been granted (it is shown
-- in Settings), but only the service role may create or remove one.
alter table public.entitlement_grants enable row level security;

drop policy if exists entitlement_grants_select_member on public.entitlement_grants;
create policy entitlement_grants_select_member on public.entitlement_grants
    for select using (public.is_org_member(organization_id));

revoke insert, update, delete on public.entitlement_grants from authenticated, anon;
