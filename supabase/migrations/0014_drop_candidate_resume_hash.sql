-- ============================================================================
-- HireLens AI — Cleanup: remove redundant candidates.resume_hash
-- Migration 0014 — drop the denormalized hash column
-- ----------------------------------------------------------------------------
-- Rationale
--   0013 added public.candidates.resume_hash as a convenience denormalization of
--   the file content hash. In practice it is write-only: no read path (dedup,
--   search, comparison, UI) consumes it, and it duplicates the CANONICAL source
--   of truth — public.candidate_uploads.file_hash — which additionally carries
--   the UNIQUE (campaign_id, file_hash) idempotency constraint.
--
--   Maintaining two copies of the same value invites drift, so we drop the
--   redundant column. Content-hash dedup is unaffected: it reads and writes
--   candidate_uploads exclusively.
--
-- Safety
--   The persistence pipeline no longer writes candidates.resume_hash (see
--   candidate_repository.create / persistence_service). Dropping the column is
--   therefore non-breaking. candidate_uploads and its unique constraint remain.
-- ============================================================================

alter table public.candidates
    drop column if exists resume_hash;
