# ADR-009 — Semantic Talent Search Architecture

**Status:** Accepted · **Date:** V4 Sprint 6

## Context

The platform can parse, score, match, and compare candidates, but discovery was
still keyword-bound. Recruiters think in meaning — "backend engineers with
production FastAPI", "candidates similar to Rahul", "strong Python engineers with
weak frontend" — which literal search cannot serve. We want a semantic retrieval
layer that is **infrastructure**, not a page: reusable by the Copilot, Candidate
Comparison, and future Talent Recommendations / Executive Reports / Hiring
Automation.

A hard constraint: **retrieval and reasoning are separate responsibilities.** The
LLM must NOT be used for retrieval; it only explains results afterwards.

## Decision

Add an embedding-based retrieval stack, fully separate from the LLM path.

- **Embedding provider abstraction** (`app/ai/embeddings/`) mirrors `LLMProvider`:
  an `EmbeddingProvider` interface + registry + a thin `EmbeddingService` with
  observability. The default provider is a dependency-free, deterministic
  **feature-hashing** embedding, so semantic search works out of the box with no
  API key; `EMBEDDING_PROVIDER=openai` (or a future Voyage/Jina/Gemini/local BGE)
  swaps in true neural embeddings with no other code change.
- **Vector storage abstraction** (`app/services/vector_search.py`): a `VectorStore`
  interface with a default `SupabaseVectorStore` that ranks recruiter-scoped
  embeddings by cosine similarity. Embeddings are stored as `jsonb` (migration
  `0006`), so the feature runs on any PostgreSQL/Supabase **without** the `vector`
  extension; a documented pgvector upgrade path exists for large tenants. The
  abstraction isolates that swap.
- **Embedding pipeline** (`app/services/embedding_pipeline.py`): builds a
  normalised, noise-free profile (resume text, skills, experience, education,
  projects, certifications, AI summary, ATS signals — no emails/phones/ids) and a
  content hash. Embeddings regenerate **only** when the normalised content or the
  active model changes.
- **Retrieval engine** (`app/services/talent_search.py`): embed query → cosine
  rank (recruiter-scoped) → hydrate → highlight matching concepts. One engine,
  reused by the search routes AND the Copilot (`services/copilot_search.py`) — no
  duplicated logic.
- **LLM explanation stays separate**: the Copilot runs retrieval (no LLM), then
  any "why did X match?" explanation flows through the AIOrchestrator as a normal
  grounded follow-up.
- **Security**: every query is recruiter-scoped (repositories + RLS on
  `candidate_embeddings`); no cross-tenant vector leakage.

## Consequences

- ✅ **Meaning over keywords** — semantic ranking; "similar to X" by vector, not
  ATS score.
- ✅ **Retrieval ≠ reasoning** — the LLM never retrieves; embeddings never explain.
- ✅ **Provider- and store-agnostic** — swap embedding provider or vector backend
  behind stable interfaces.
- ✅ **Zero-config default** — works with no new API key (hashing provider); real
  models are one env var away.
- ✅ **Cheap re-indexing** — content-hash gating avoids needless regeneration.
- ✅ **Reused everywhere** — one engine powers the search page and the Copilot.
- ⚠️ **jsonb + in-app cosine** scales to typical per-recruiter volumes; very large
  tenants should enable the pgvector path (isolated by the abstraction).
- ⚠️ **Hashing embeddings are lexical-semantic**, not neural — good enough to ship
  and demo offline; switch to OpenAI/Voyage for production-grade recall.
- ⚠️ **Negation** ("weak frontend") is approximate under pure similarity.

## Alternatives considered

| Option | Why not |
|--------|---------|
| Keyword / trigram search | The whole point is meaning, not literal tokens. |
| LLM-as-retriever (ask the model to pick candidates) | Slow, unscalable, ungrounded, and violates retrieval≠reasoning. |
| Require pgvector up front | Adds an extension dependency; jsonb + abstraction ships everywhere now, pgvector remains an isolated upgrade. |
| Couple directly to one embedding vendor | Vendor lock-in; the provider abstraction keeps the app agnostic. |
| Separate copilot search logic | Would duplicate retrieval; the Copilot calls the same engine. |

Related: [ADR-006](./ADR-006-ai-orchestration-layer.md),
[ADR-007](./ADR-007-ai-recruiter-copilot.md),
[ADR-008](./ADR-008-ai-candidate-comparison.md),
[sprints/V4_SPRINT6.md](../archive/sprints/V4_SPRINT6.md).
