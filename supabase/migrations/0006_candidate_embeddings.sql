-- ===========================================================================
-- 0006 — V5 Semantic Talent Search: candidate embeddings
-- ---------------------------------------------------------------------------
-- Stores one embedding per candidate for semantic (meaning-based) retrieval.
-- Retrieval is separate from the LLM: profiles are embedded and ranked by vector
-- similarity; the LLM only explains results afterwards.
--
-- Storage is provider-agnostic. The embedding is kept as `jsonb` (an array of
-- floats) so semantic search works on any PostgreSQL/Supabase WITHOUT requiring
-- the `vector` extension, and the embedding dimension/provider can change without
-- a schema migration. Cosine ranking is computed in the recruiter-scoped service
-- layer. See the commented pgvector upgrade path at the bottom for large tenants.
--
-- Isolated + idempotent. RLS mirrors the platform's recruiter_id = auth.uid()
-- model exactly (defence in depth on top of the service's explicit scoping).
-- ===========================================================================

create table if not exists public.candidate_embeddings (
    id             uuid primary key default gen_random_uuid(),
    candidate_id   uuid not null unique references public.candidates(id) on delete cascade,
    campaign_id    uuid not null references public.campaigns(id) on delete cascade,
    recruiter_id   uuid not null references public.recruiters(id) on delete cascade,
    content_hash   text not null,               -- normalised-profile hash; regen only on change
    model          text not null,               -- provider:model that produced this vector
    dimensions     integer not null,
    embedding      jsonb not null,              -- array of floats (unit-normalised)
    updated_at     timestamptz not null default now()
);

create index if not exists idx_cand_emb_recruiter on public.candidate_embeddings(recruiter_id);
create index if not exists idx_cand_emb_campaign  on public.candidate_embeddings(campaign_id);

drop trigger if exists trg_cand_emb_updated_at on public.candidate_embeddings;
create trigger trg_cand_emb_updated_at
    before update on public.candidate_embeddings
    for each row execute function public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.candidate_embeddings enable row level security;

drop policy if exists candidate_embeddings_select_own on public.candidate_embeddings;
create policy candidate_embeddings_select_own on public.candidate_embeddings
    for select using (recruiter_id = (select auth.uid()));

drop policy if exists candidate_embeddings_insert_own on public.candidate_embeddings;
create policy candidate_embeddings_insert_own on public.candidate_embeddings
    for insert with check (recruiter_id = (select auth.uid()));

drop policy if exists candidate_embeddings_update_own on public.candidate_embeddings;
create policy candidate_embeddings_update_own on public.candidate_embeddings
    for update using (recruiter_id = (select auth.uid()))
    with check (recruiter_id = (select auth.uid()));

drop policy if exists candidate_embeddings_delete_own on public.candidate_embeddings;
create policy candidate_embeddings_delete_own on public.candidate_embeddings
    for delete using (recruiter_id = (select auth.uid()));

grant select, insert, update, delete on public.candidate_embeddings to authenticated;

-- ===========================================================================
-- OPTIONAL pgvector upgrade path (for large tenants; not required):
--   create extension if not exists vector;
--   alter table public.candidate_embeddings add column embedding_vec vector(1536);
--   -- backfill embedding_vec from embedding jsonb, then:
--   create index on public.candidate_embeddings using hnsw (embedding_vec vector_cosine_ops);
--   -- and add a SECURITY INVOKER match_candidates(...) RPC that ORDER BY <=>.
-- The VectorStore abstraction (app/services/vector_search.py) isolates this swap.
-- ===========================================================================
