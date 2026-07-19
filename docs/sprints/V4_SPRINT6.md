# V4 Sprint 6 — AI Semantic Talent Search & Knowledge Engine (V5)

> The platform's semantic intelligence: discover talent by **meaning**, not
> keywords. An embedding-based retrieval engine, fully separate from the LLM,
> reused by the Recruiter Copilot. Decision record:
> [ADR-009](../decisions/ADR-009-semantic-search-architecture.md).

## Goal

Let recruiters search in natural language ("backend engineers with production
FastAPI", "candidates similar to Rahul") and get semantically ranked people —
and make semantic retrieval a reusable platform capability.

## Architecture

**Retrieval and reasoning are separate.** Retrieval is embeddings + cosine; the
LLM only explains afterwards.

```
Query ─► EmbeddingService (provider-agnostic) ─► query vector
                                                      │
candidate_embeddings (jsonb, RLS) ─► SupabaseVectorStore.search (cosine, recruiter-scoped)
                                                      │
                          hydrate names/scores + highlight matched concepts
                                                      │
              ┌───────────────────────────┴───────────────────────────┐
        /search page                                         Recruiter Copilot
   (services/talent_search)                          (services/copilot_search → same engine)
                                                       explanation → AIOrchestrator (separate)
```

### Embedding layer (`app/ai/embeddings/`)
- `base.py` — `EmbeddingProvider` interface (mirrors `LLMProvider`).
- `hashing_provider.py` — **default**, dependency-free deterministic feature-hashing
  embedding (works with no API key; ships + tests offline).
- `openai_provider.py` — optional (`EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY`).
- `registry.py` / `service.py` — provider resolution + observed `embed_texts` / `embed_query`.

### Vector storage (`app/services/vector_search.py`)
- `VectorStore` interface + `SupabaseVectorStore` (recruiter-scoped cosine ranking
  over jsonb embeddings — no `vector` extension required). Migration `0006` keeps a
  documented pgvector upgrade path, isolated by the abstraction.

### Pipeline & engine
- `services/embedding_pipeline.py` — normalise profile (resume/skills/experience/
  education/projects/certifications/summary/ATS; excludes noisy metadata),
  content-hash gate (regenerate only on change), `reindex_campaign`.
- `services/talent_search.py` — `search_talent` + `search_similar`; lazily indexes a
  campaign on first search; hydrates in ≤2 queries; highlights matched concepts.
- `services/copilot_search.py` — Copilot bridge reusing the engine.

### Routes
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/search/talent` | Natural-language semantic search |
| POST | `/api/v1/search/similar` | Vector "find similar candidates" |
| POST | `/api/v1/campaigns/{id}/embeddings/reindex` | (Re)build campaign embeddings |

### Frontend (`resume-hero-section/`)
- `app/search/page.tsx` — Talent Search: NL search bar, filters (campaign, min
  score, min experience), similarity bars, matched-concept chips, per-result
  "Similar", save search + history (localStorage), example/recent/saved chips.
- Candidate detail → **"Find similar"** (`/search?similar=<id>&campaign=<id>`).
- Nav link in `AppHeader`; Copilot available on `/search`.
- `services/search-api.ts`, `types/search.ts`.

## Embedding strategy

One embedding per candidate over a normalised profile text. A SHA-256 content hash
plus the active `provider:model` identity gate regeneration — re-indexing is
idempotent and cheap. Noisy metadata (emails, phones, ids, raw dates) is excluded.

## Vector storage design

`candidate_embeddings` (migration `0006`): `candidate_id` (unique), `campaign_id`,
`recruiter_id`, `content_hash`, `model`, `dimensions`, `embedding jsonb`, RLS
`recruiter_id = auth.uid()`. jsonb + in-app cosine runs on any Supabase; pgvector
is an isolated, optional upgrade.

## Retrieval pipeline & ranking

Query → embed → cosine similarity vs recruiter-scoped candidate vectors → sort
desc → filter (min score/experience) → top-N → hydrate → matched concepts (overlap
of query terms with candidate skills). Similarity is 0–1 cosine; "similar
candidates" ranks by profile-vector closeness, independent of ATS scores.

## Security model

Auth + RLS + explicit `recruiter_id` scoping on `candidate_embeddings` and every
hydration query. A recruiter can only search their own candidates; no cross-tenant
vector leakage.

## Performance considerations

- Lazy first-search indexing; content-hash skip avoids re-embedding unchanged
  profiles; batch reindex endpoint.
- Search runs off the event loop (`run_in_threadpool`).
- Hydration is ≤2 queries for a campaign (no N+1).
- localStorage caches search history/saved searches client-side.

## Future provider support

OpenAI (wired), Voyage, Jina, Gemini, local BGE/E5 — one `EmbeddingProvider`
subclass + registration. Vector backends: pgvector (documented path), Qdrant,
Pinecone, Weaviate — one `VectorStore` implementation. Server-side saved searches
and async post-upload indexing are natural next steps.

## Verification

- ✅ Retrieval uses the embedding service; **no LLM in retrieval** (end-to-end test:
  backend query ranks backend candidates above frontend; "similar to Rahul" → the
  other backend candidate; unchanged profiles skip re-embedding).
- ✅ Copilot reuses the engine (`copilot_search` → `talent_search`).
- ✅ Backend imports clean; 43 API routes (+3); no provider calls outside `app/ai`.
- ✅ Frontend `tsc` zero errors; `next build` green (adds `/search`).
- ✅ Sprint 2–5 functionality intact.
