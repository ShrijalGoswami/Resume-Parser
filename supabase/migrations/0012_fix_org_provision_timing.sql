-- ============================================================================
-- HireLens AI — Fix: signup 500 (FK violation on org auto-provisioning)
-- Migration 0012 — Provision the default org AFTER the recruiter row exists
-- ----------------------------------------------------------------------------
-- Root cause
--   Migration 0008 registered `on_recruiter_provision_org` as a BEFORE INSERT
--   trigger on public.recruiters. `provision_default_org()` inserts a row into
--   public.organizations with `created_by = new.id`, but organizations.created_by
--   (and organization_members.user_id) are FKs → public.recruiters(id). In a
--   BEFORE INSERT trigger the new recruiter row does NOT exist yet, so the FK
--   check fails with:
--       23503  organizations_created_by_fkey — Key (created_by)=(…) is not
--              present in table "recruiters"
--   That aborts the recruiter insert, which aborts the auth.users insert fired
--   by handle_new_user(), so Supabase Auth returns 500 on /auth/v1/signup.
--
-- Fix
--   Run the SAME function AFTER INSERT instead of BEFORE INSERT. Once the
--   recruiter row is committed to the table, both FKs resolve. The function
--   already back-fills the linkage via
--       update public.recruiters set organization_id = org_id,
--              active_workspace_id = ws_id where id = new.id;
--   so no function-body change is required — only the trigger timing.
-- ============================================================================

drop trigger if exists on_recruiter_provision_org on public.recruiters;

create trigger on_recruiter_provision_org
    after insert on public.recruiters
    for each row execute function public.provision_default_org();
