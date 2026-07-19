# ADR-016 — Organizational Knowledge Architecture

**Status:** Accepted · **Date:** V7 Sprint 12

## Context

HireLens reasons well over the *current* pipeline, but organizational knowledge —
who was hired and why, which interview strategies worked, evolving skill demand,
hiring-manager preferences — evaporates as recruiters, managers, and interviewers
rotate. We want a company-wide recruiting **knowledge system** (not chatbot memory)
that continuously accumulates hiring intelligence and makes every AI capability
smarter over time by letting it reason over history, not just the present.

Constraints: the knowledge layer must be independent of the AI Gateway, remain
organization-scoped (RBAC + workspace isolation), and be explainable and governable.

## Decision

Add an **Organizational Knowledge Layer** (`app/knowledge/`) — structured, time-aware,
org-scoped memory that every AI capability retrieves before reasoning.

- **Structured, not raw** — a Knowledge Extractor turns platform artifacts (copilot
  Q&A, comparisons, interview packs, executive reports, agent decisions, notes) into
  structured `KnowledgeItem`s (facts/preferences/decisions/outcomes/patterns) with
  entities, source, confidence, and event time — plus graph edges.
- **Explainable retrieval** — the retriever ranks memory by keyword + entity overlap,
  weighted by **confidence × recency decay** (180-day half-life), returning each hit
  with its score AND the reasons it was selected (source, timestamp, confidence,
  matched terms, related entities). Traceable end to end.
- **Universal injection** — `memory_block(org_id, query)` is the single seam every
  capability uses: the Copilot resolver, Comparison, Interview, and Report services
  prepend relevant memory to their context before calling the gateway. No capability
  implements its own memory.
- **Incremental & automatic** — capabilities `safe_ingest(...)` their outputs after
  producing them; ingestion dedupes by `(source, source_id, statement)`, so
  re-processing is idempotent and cheap. A short in-process cache serves an org's
  active memory to avoid re-reads on every AI call.
- **Temporal memory** — items carry `occurred_at`; timeline + skill-demand-evolution
  queries answer "what changed in the last six months?" and "when did React become
  our most-requested skill?".
- **Emergent preferences** — organizational preferences (technologies, universities,
  decision patterns) are DERIVED from accumulated evidence, never hardcoded.
- **Knowledge graph** — entity→relation→entity edges with bounded traversal (interface
  is graph-DB-agnostic for a future Neo4j/Neptune).
- **Governance** — retention via status (active/archived/invalidated), manual
  corrections, confidence, duplicate merging/conflict resolution — org keeps control.
- **Security** — `knowledge_items`/`knowledge_edges` are org-scoped (membership RLS);
  the Knowledge Center is RBAC-gated (governance requires ORG_MANAGE); memory inherits
  org/workspace isolation.
- **Gateway independence** — the layer may reuse embeddings but the AI gateway never
  depends on it (verified: no `app.ai.gateway` import in `app/knowledge`).

## Consequences

- ✅ **Smarter over time** — every AI capability reasons over history + present.
- ✅ **Explainable & governable** — traceable memory, org-controlled lifecycle.
- ✅ **DRY** — one memory layer; capabilities inject via a single helper.
- ✅ **Incremental** — automatic, idempotent ingestion; cached retrieval.
- ✅ **Extensible** — graph-DB-ready; a foundation for predictive recruiting and
  multi-agent collaboration.
- ⚠️ **Extraction is rule-based** — deterministic and safe; an LLM extractor could
  enrich it later (behind the same interface).
- ⚠️ **In-app scoring** — keyword/entity + confidence/recency; per-item embeddings
  are a future upgrade (the retriever interface is unchanged).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Per-capability chat memory | Fragmented, not company-wide; one shared layer instead. |
| Store raw documents only | Not queryable/explainable; structured items + graph are. |
| Put memory inside the AI gateway | Couples retrieval to the gateway; the layer must be independent. |
| Hardcode org preferences | The spec forbids it; preferences emerge from evidence. |
| Adopt a graph DB now | Premature; the traversal interface is graph-DB-agnostic for later. |

Related: [ADR-006](./ADR-006-ai-orchestration-layer.md),
[ADR-009](./ADR-009-semantic-search-architecture.md),
[ADR-014](./ADR-014-enterprise-platform-architecture.md),
[sprints/V7_SPRINT12.md](../sprints/V7_SPRINT12.md).
