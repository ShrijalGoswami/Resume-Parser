# V7 Sprint 12 — Organizational Knowledge Graph & Long-Term Memory

> A company-wide recruiting knowledge system: persistent, structured, time-aware,
> org-scoped memory that every AI capability retrieves before reasoning — so
> HireLens reasons over organizational history, not just the current pipeline, and
> gets smarter every month. Decision record:
> [ADR-016](../decisions/ADR-016-organizational-knowledge-architecture.md).

## Goal

Continuously accumulate hiring intelligence (decisions, strategies, outcomes,
preferences, skill-demand evolution) and give every AI capability long-term
organizational memory — explainable and governable.

## Retrieval pipeline (every AI capability)

```
Capability → memory_block(org_id, query) → Knowledge Retrieval (explainable)
   → prepend Organizational Memory to context → (Semantic Retrieval) → AI Gateway → LLM
```

## Architecture (`app/knowledge/`)
- `models.py` — `KnowledgeItem` (fact/preference/decision/outcome/pattern + entities,
  source, confidence, occurred_at) + `KnowledgeEdge`.
- `extractor.py` — per-source structured extraction rules (copilot, comparison,
  interview, report, agent, note, decision); stores structured knowledge, not raw text.
- `retrieval.py` — index + scoring (keyword + entity overlap × confidence × recency
  decay) → explainable hits (score + why).
- `graph.py` — entity relationship graph + bounded traversal (graph-DB-agnostic).
- `timeline.py` — temporal timeline, skill-demand evolution, emergent preferences.
- `store.py` — org-scoped persistence (incremental, deduped).
- `service.py` — ingest / retrieve / timeline / preferences / graph / lifecycle;
  short in-process cache.
- `injection.py` — `memory_block(...)` the single seam every capability injects with.

## Knowledge lifecycle

Ingest (incremental, idempotent dedupe) → index → retrieve (cached) → govern
(active/archived/invalidated, corrections, confidence, duplicate merge/conflict
resolution). Organizations remain in control of their memory.

## Extraction pipeline

Capabilities call `safe_ingest(org_id, source, …)` after producing an artifact
(copilot answer, comparison, interview pack, executive report, approved agent
recommendation). Each source has a rule that emits structured items + graph edges;
`(source, source_id, statement)` dedupe makes re-ingestion safe.

## Graph architecture

`knowledge_edges` (source → relation → target, e.g. Candidate → in_campaign → Campaign,
Technology → assessed_in → Campaign). `KnowledgeGraph.traverse(entity, depth)` does
BFS for visualization and future reasoning; the interface is graph-DB-agnostic.

## Retrieval strategy & confidence model

Relevance = `(keyword_overlap + 2·entity_overlap) × (confidence/100) × (0.4 + 0.6·recency)`
where recency = `0.5^(age_days/180)`. Every hit is explainable (matched terms,
entities, confidence, recency). Confidence decays with age; corrections/invalidations
remove or adjust items.

## Memory governance

RBAC-gated Knowledge Center (governance requires ORG_MANAGE): invalidate, archive,
correct, merge duplicates. Org-scoped (membership RLS); memory inherits org/workspace
isolation.

## AI integration

Injected into the Copilot resolver, Comparison, Interview, and Report services (which
prepend memory before the gateway). The Agent's approved decisions feed memory. No
capability implements separate memory. The layer is **independent of the AI gateway**
(verified: no gateway import in `app/knowledge`).

## Performance

Short-lived in-process cache of an org's active memory (60s) avoids re-reads on every
AI call; incremental idempotent ingestion; bounded reads; graph built on demand.

## Frontend — Knowledge Center (`/knowledge`)

Memory Explorer (explainable retrieval), Hiring Timeline + skill-demand evolution,
Preference Learning (emergent), Knowledge Graph traversal, Decision History (with
invalidate), Knowledge Sources. Header link.

## Verification

- ✅ Pure-logic tests: extraction; explainable retrieval (relevance + recency/confidence
  ordering); timeline + skill evolution; emergent preferences; graph traversal.
- ✅ Memory injection produces an explainable block (source/time/confidence/why/entities);
  wired into copilot/comparison/interview/report; agent decisions ingested.
- ✅ Knowledge layer independent of the AI gateway (no import); 100 API routes (11
  knowledge); frontend `tsc` zero errors + `next build` green (adds `/knowledge`);
  Sprint 2–11 intact.
