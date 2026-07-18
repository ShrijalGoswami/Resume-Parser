-- ============================================================================
-- HireLens AI — V4 Sprint 1: Supabase Foundation
-- Migration 0004 — Auth provisioning trigger
-- ----------------------------------------------------------------------------
-- When a new user signs up via Supabase Auth (email/password or, later, OAuth),
-- automatically create the matching public.recruiters profile row. This keeps
-- identity (auth.users) and product profile (recruiters) in lockstep so no
-- request ever hits a missing profile. Metadata from sign-up (full_name,
-- company) is copied from raw_user_meta_data when present.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.recruiters (id, email, full_name, company)
    values (
        new.id,
        new.email,
        nullif(new.raw_user_meta_data ->> 'full_name', ''),
        nullif(new.raw_user_meta_data ->> 'company', '')
    )
    on conflict (id) do update
        set email = excluded.email;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Keep the profile email in sync if the user changes it in auth.
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.email is distinct from old.email then
        update public.recruiters set email = new.email where id = new.id;
    end if;
    return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
    after update of email on auth.users
    for each row execute function public.handle_user_email_update();
