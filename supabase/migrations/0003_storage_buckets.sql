-- ============================================================================
-- HireLens AI — V4 Sprint 1: Supabase Foundation
-- Migration 0003 — Storage buckets + object-level RLS
-- ----------------------------------------------------------------------------
-- All buckets are PRIVATE. Files are addressed by signed URLs generated on
-- demand by the backend (never public URLs). Object keys are namespaced by
-- recruiter id as the first path segment, so a single RLS check on
-- storage.objects enforces tenant isolation:
--
--     <recruiter_id>/<campaign_id>/<candidate_id>/<filename>
--
-- e.g.  resumes/9c3.../a1b.../f7e.../jane_doe.pdf
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('resumes',          'resumes',          false, 10485760,
        array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('job-descriptions', 'job-descriptions', false, 5242880,
        array['application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('interview-packs',  'interview-packs',  false, 10485760,
        array['application/pdf']),
    ('avatars',          'avatars',          false, 2097152,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
    set file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types,
        public             = excluded.public;

-- ---------------------------------------------------------------------------
-- Object-level policies: the first folder in the key must equal auth.uid().
-- storage.foldername(name)[1] is the leading path segment.
-- ---------------------------------------------------------------------------
do $$
declare
    b text;
    hirelens_buckets text[] := array['resumes','job-descriptions','interview-packs','avatars'];
begin
    foreach b in array hirelens_buckets loop
        execute format('drop policy if exists "hl_%s_read" on storage.objects;', b);
        execute format($p$
            create policy "hl_%1$s_read" on storage.objects for select to authenticated
            using (bucket_id = %1$L and (storage.foldername(name))[1] = (select auth.uid())::text);
        $p$, b);

        execute format('drop policy if exists "hl_%s_insert" on storage.objects;', b);
        execute format($p$
            create policy "hl_%1$s_insert" on storage.objects for insert to authenticated
            with check (bucket_id = %1$L and (storage.foldername(name))[1] = (select auth.uid())::text);
        $p$, b);

        execute format('drop policy if exists "hl_%s_update" on storage.objects;', b);
        execute format($p$
            create policy "hl_%1$s_update" on storage.objects for update to authenticated
            using (bucket_id = %1$L and (storage.foldername(name))[1] = (select auth.uid())::text);
        $p$, b);

        execute format('drop policy if exists "hl_%s_delete" on storage.objects;', b);
        execute format($p$
            create policy "hl_%1$s_delete" on storage.objects for delete to authenticated
            using (bucket_id = %1$L and (storage.foldername(name))[1] = (select auth.uid())::text);
        $p$, b);
    end loop;
end $$;
