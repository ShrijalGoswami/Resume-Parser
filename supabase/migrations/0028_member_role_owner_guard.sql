-- ===========================================================================
-- 0028 — Owner-role boundary + last-owner invariant on organization_members
-- ---------------------------------------------------------------------------
-- Defense in depth for the application guard in app/enterprise/member_policy.py.
--
-- WHY THE APP GUARD IS NOT ENOUGH ON ITS OWN. The member routes run on the
-- service-role client (RLS bypassed), and the RLS write policy for this table —
-- `org_members_write` (migration 0008) — grants `is_org_admin`, which is TRUE
-- for both 'owner' AND 'admin'. So an admin can PATCH organization_members
-- directly through PostgREST with their own JWT and the public anon key, never
-- touching the FastAPI handler, and promote themselves to owner or remove the
-- owner. This trigger enforces the owner boundary at the database, for EVERY
-- writer, closing that path.
--
-- Rules:
--   * A USER-token write (auth.uid() present) that grants/keeps role 'owner'
--     requires the actor to be an active owner of the org.
--   * A USER-token write that demotes or removes an existing owner requires the
--     actor to be an active owner.
--   * NO write — user OR service — may leave the org with zero active owners.
--
-- Service-role writes (auth.uid() IS NULL — the FastAPI app, already authorized
-- and guarded in Python) skip the actor checks but remain bound by the
-- last-owner invariant, so a bug or a bad script cannot orphan an org either.
--
-- Idempotent + safe to re-run.
-- ===========================================================================

create or replace function public.enforce_member_owner_boundary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    actor          uuid    := (select auth.uid());
    actor_is_owner boolean := false;
    target_org     uuid    := coalesce(new.organization_id, old.organization_id);
    remaining_owners int;
begin
    -- Actor-scoped checks apply only to user-token writes. Service-role writes
    -- have no auth.uid() and are covered by the application guard.
    if actor is not null then
        select exists (
            select 1 from public.organization_members m
            where m.organization_id = target_org
              and m.user_id = actor
              and m.status = 'active'
              and m.role = 'owner'
        ) into actor_is_owner;

        if tg_op in ('INSERT', 'UPDATE') and new.role = 'owner' and not actor_is_owner then
            raise exception 'only an owner can grant the owner role'
                using errcode = 'check_violation';
        end if;

        if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' and not actor_is_owner then
            raise exception 'only an owner can change an owner''s role'
                using errcode = 'check_violation';
        end if;

        if tg_op = 'DELETE' and old.role = 'owner' and not actor_is_owner then
            raise exception 'only an owner can remove an owner'
                using errcode = 'check_violation';
        end if;
    end if;

    -- Last-owner invariant — every writer, including the service role.
    if (tg_op = 'UPDATE' and old.role = 'owner' and (new.role <> 'owner' or new.status <> 'active'))
       or (tg_op = 'DELETE' and old.role = 'owner') then
        select count(*) into remaining_owners
        from public.organization_members m
        where m.organization_id = target_org
          and m.role = 'owner'
          and m.status = 'active'
          and m.id <> old.id;
        if remaining_owners = 0 then
            raise exception 'an organization must always have at least one owner'
                using errcode = 'check_violation';
        end if;
    end if;

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_member_owner_boundary on public.organization_members;
create trigger trg_member_owner_boundary
    before insert or update or delete on public.organization_members
    for each row execute function public.enforce_member_owner_boundary();
