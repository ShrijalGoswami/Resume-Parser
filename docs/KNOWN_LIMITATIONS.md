# Known Limitations — v1.0

An honest, current inventory of what HireLens v1.0 does **not** do, plus the
conditions under which each limitation matters. None are release blockers (see
[the RC audit](#release-status)); each has a planned resolution in
[ROADMAP.md](./ROADMAP.md).

## AI / LLM

| Limitation | Impact | Mitigation in v1.0 | Planned fix |
|-----------|--------|--------------------|-------------|
| **Single LLM provider (Groq only)** — no automatic failover | If Groq is down or rate-limited, LLM features degrade to deterministic fallbacks | Graceful degradation (never errors); rate-limit errors are **not** retried (no quota amplification); QA response cache | Provider fallback via the existing multi-provider gateway (add a second key) |
| **Groq free-tier quota** (~100k tokens/day) | Heavy batch/QA usage can exhaust the daily budget | Retry-on-429 removed; QA cache; usage instrumentation at `GET /api/v1/ai/usage` | Paid tier / provider fallback |
| **Hashing embeddings** for semantic search (dependency-free, non-neural) | Lower raw recall than neural embeddings | Hybrid **two-tier lexical + IDF re-rank** compensates (10/10 QA queries correct) | Swap `EMBEDDING_PROVIDER` to OpenAI/Voyage |
| **Prompt injection** via untrusted résumé/JD text | Can bias/corrupt a **single** answer | **Cannot** exfiltrate cross-tenant data (LLM only sees recruiter-scoped, server-resolved context; no tools/retrieval) | Delimit/neutralize untrusted spans |
| **Résumé date parsing** | Unusual multi-job layouts can under-/over-count years by ~1 | Raw-text union-of-intervals + explicit-phrase fallbacks; 18-case test suite | Ongoing parser hardening |

## Scale / performance

| Limitation | Threshold | Impact | Planned fix |
|-----------|-----------|--------|-------------|
| **In-process cosine over all embeddings** | 1000+ candidates/recruiter | Search transfers + scores the full embedding set in Python per query | pgvector/HNSW + `match_candidates` RPC (`ORDER BY embedding <=> q LIMIT k`) |
| **Unbounded candidate/campaign list endpoints** | 1000+ candidates | Large payloads (no server pagination) | Keyset/offset pagination (needs coordinated frontend change) |
| **Lazy first-index on the request path** | First search of a large campaign | Long-running synchronous reindex | Move first-index to a background job |
| **In-memory analytics aggregation** | 1000s of analyses | Linear memory/latency per dashboard load | Push aggregates into SQL / cache overview |
| **In-process rate limiter** | Multi-instance deploys | Limits are per-process, not global | Enforce at the edge (reverse proxy / WAF) |

## Security / access

| Limitation | Impact | Mitigation | Planned fix |
|-----------|--------|-----------|-------------|
| **Coarse RBAC** — product-tier permissions (`CAMPAIGN_MANAGE`, `AI_USE`, …) defined but not enforced on every route | A non-admin role can act on **its own** data and spend AI budget (not cross-tenant) | Admin/org mutations **are** permission-gated; all data is `recruiter_id`-keyed | Enforce granular permissions per route (product decision on role capabilities) |
| **Public stateless analyzer endpoints** (`/ats-analysis`, `/match-analysis`, `/batch-analysis`, `/copilot/chat`) require no auth by design | Anonymous cost/DoS abuse | **Rate-limited** per IP | Product decision: keep public analyzer or gate it |
| **OAuth `state` not validated** on integration callback | CSRF (requires `INTEGRATION_MANAGE` on both calls) | Low blast radius | Persist + verify `state` |
| **`INTEGRATION_ENCRYPTION_KEY` derived from JWT secret when unset** | Couples two secrets | Works; warned | Require a dedicated key in production |
| **Member invite reveals email existence** (distinct 404) | Enumeration by an org admin | — | Invite-by-token flow |

## Product scope (intentional)

- **No billing/payments** — subscription *plans/limits* exist as a foundation; no payment provider is integrated.
- **No realtime** pipeline board (Supabase Realtime not wired).
- **No email/notifications** delivery.
- **Interview packs, agent scans, executive briefings** are schedulable-ready but not scheduled (no cron wired).

## Release status

The v1.0 Release Candidate audit found **zero release blockers**: no Critical/High
security exposure, tenant isolation enforced at the repository + RLS layers, and
all 15 core workflows verified end-to-end. Everything above is either a deliberate
product decision or scheduled scale/infra work — none gates a controlled v1.0
launch. See [CHANGELOG.md](./CHANGELOG.md) and [ROADMAP.md](./ROADMAP.md).
