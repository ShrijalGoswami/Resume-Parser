# Inbox — v1.0.0

> **Versioned platform component · FROZEN.** Same governance as the Candidate
> Object: treat this like a shared SDK — consumers adapt to it; it does not adapt
> to consumers.
>
> **v1.x** — only additive, backward-compatible changes (a new *optional* prop with
> a safe default; a new pure derivation reusing existing shapes). Every consuming
> screen must stay compatible with v1.x.
>
> **v2.0 (breaking)** — removing/renaming an exported component, hook, or type;
> changing the `SummaryStat` / `ActivityGroup` shapes; changing the state machine,
> the ordering contract, or the event flow. Requires **RFC → approval → new major
> version**. Never implement automatically.
>
> **Change process** — if a screen seems to need a change: **STOP** and file a
> Change Request (1 Reason · 2 Current limitation · 3 Proposed change · 4 Impact
> analysis · 5 Migration plan · 6 Alternatives considered), then wait for approval.

The Inbox is the recruiter's command center at `/home`. One vertical flow —
**Header → Executive Summary → Priority Queue → Grouped Activity Feed** — answering
*"what should I work on right now?"*. It reads real data only (no fabricated
metrics) and opens the frozen **Candidate Object** (`CandidatePeek`) via its
documented props; it never forks or modifies it.

## Public API (frozen v1.0.0)

Everything below is exported from `inbox/index.ts`. **Sprint 3 (Role Workspace)
and every later screen consume these — they do not redefine activity grouping, a
priority queue, summary tiles, or the CandidatePeek mount pattern.**

| Export | Kind | Contract |
|---|---|---|
| `InboxScreen` | component | Route host for `/home`. Owns the state machine below. |
| `InboxHeader` | component | `{ name?, org? }` — greeting/date, search (→ Talent), two quick actions. |
| `InboxSummary` | component | `{ stats: SummaryStat[], loading? }` — four navigation summaries. |
| `InboxPriorityQueue` | component | `{ recommendations, aiReviewCount, onUpdate, pendingId, onOpenCandidate, onPrefetchCandidate }`. |
| `InboxActivityFeed` | component | `{ events: ActivityEvent[] }` — grouped Today/Yesterday/Earlier. |
| `useInboxAnalytics` | hook | React-Query wrapper over `getAnalyticsOverview` (key `['hl','inbox','analytics']`). |
| `summaryStats(a)` | pure fn | `AnalyticsOverview → SummaryStat[]` (the four tiles). |
| `aiReviewCount(a)` | pure fn | `AnalyticsOverview → number` (drives the single AI line). |
| `groupActivity(events)` | pure fn | `ActivityEvent[] → ActivityGroup[]` (Today/Yesterday/Earlier, empty groups omitted). |
| `SummaryStat` | type | `{ label: string; value: number; href: string }`. |
| `ActivityGroup` | type | `{ label: string; events: ActivityEvent[] }`. |

Data sources (single source per section, real fields only):
- **Executive Summary** ← `AnalyticsOverview` (`overview.active_campaigns`,
  `action_center.awaiting_review_count`, `charts.hiring_funnel` for interview/offer).
- **Priority Queue** ← pending agent `Recommendation`s (`usePendingRecommendations`
  + `useUpdateRecommendation` from `lib/api/hooks`).
- **Activity Feed** ← `useRecentActivity(30)` → reuses `domain/ActivityRow`.

---

## 1. Inbox state machine

Two layers: an **auth gate** (before any data), then the authed **body machine**
(driven by the priority-queue query — the command center). The header and summary
always render once authed; the summary and feed degrade *independently* around the
command center, so a slow/failed analytics or activity call never blanks the page.

```
                      ┌───────────────────────────── auth gate ─────────────────────────────┐
  mount ──► useSession ─┬─ !configured ───────────────► "Sign-in isn't configured" (terminal)
                        ├─ loading ──────────────────► InboxSkeleton  (skeletons, never spinner)
                        ├─ !session ─────────────────► "Sign in to continue" + Sign-in CTA
                        └─ session ──────────────────► AuthedInbox ─┐
                                                                    │
   ┌──────────────────────── AuthedInbox body machine ─────────────┘
   │  header + summary ALWAYS render (summary shows skeleton while analytics.isLoading)
   │
   │  body := f(recommendations query):
   │     recs.isLoading .......................► skeleton rows
   │     recs.isError ..........................► ErrorState + Retry (recs.refetch)   ◄─ recoverable
   │     recs=[] AND events=[] .................► EmptyState "No work needs your attention"
   │                                              + Create role / Upload candidates
   │     else .................................► POPULATED:
   │                                              • InboxPriorityQueue  (iff recommendations>0)
   │                                              • InboxActivityFeed   (iff events>0)
   └───────────────────────────────────────────────────────────────────────────────
```

**Overlay sub-state (orthogonal to the body):**
```
  selected = null  ──openCandidate(roleId,id)──►  selected = {roleId,id}  ──► <CandidatePeek open>
         ▲                                                                            │
         └──────────────────── onOpenChange(false) ◄─────────────── Esc / close ──────┘
```

State ownership: **the query cache is the state.** There is no bespoke reducer —
`useSession`, `usePendingRecommendations`, `useInboxAnalytics`, and
`useRecentActivity` each own a slice; `selected` (the Peek target) is the only
local React state. This is deliberate so every mutation that touches a shared key
re-renders the Inbox automatically.

---

## 2. Priority Queue ordering strategy

**Order is server-owned; the client renders it verbatim.**

- Source of truth: `GET /agent/recommendations?status=pending` →
  `agent_repository.list` returns **`created_at DESC`, limited to 200** rows.
- The Inbox does **not** re-sort on the client. `InboxPriorityQueue` maps
  `recommendations` in received order — newest first.
- `severity` (`urgent` / `high` / …) is **presentational only**: it selects the
  icon accent color (`accentClass`). It does **not** reorder the queue.
- `aiReviewCount` (from `ai_insights.candidates_requiring_review_count`) drives the
  single AI line above the list; it does not affect ordering.

**Contract:** priority ordering belongs to the backend recommendation engine — one
place, one order. If a severity-weighted or SLA-weighted order is ever wanted, it
is a **server-side** change (or an explicit, versioned client sort documented
here); a consumer must not silently re-sort, because that would fork the notion of
"priority" across screens. Rationale: the previous `/home` had a client
`sortDecisions`/`tierFor` heuristic — it was removed so priority has a single
authority.

---

## 3. Event flow — Recommendation → CandidatePeek → Decision → Queue update

```
 Priority Queue item  (one pending Recommendation)
   │
   ├── candidate-bound?  (rec.candidate_id && rec.campaign_id)
   │      │
   │      │  hover ──► onPrefetchCandidate(roleId,id)
   │      │              └─ queryClient.prefetchQuery(['hl','role',roleId,'candidate',id])   (warms cache)
   │      │
   │      └─ "Review" ──► onOpenCandidate(roleId,id) ──► setSelected ──► <CandidatePeek open> (FROZEN v1.x)
   │             │
   │             └─ recruiter decides  A advance / S hold / R reject   (Candidate Object controller)
   │                   └─ updateStage (optimistic + Undo) invalidates:
   │                        candidate detail · pipeline list · notes · activity      (shared keys)
   │                   └─ onDecided()  — NOT wired by the Inbox; the Peek closes/stays per its own contract
   │
   │        ⚠ DOCUMENTED SEAM: a candidate *stage* decision does NOT invalidate
   │          recommendations('pending'). A "review this candidate" rec is advisory —
   │          deciding the candidate is not the same as consuming the rec. The rec
   │          therefore remains in the queue until explicitly resolved (below). This
   │          is intentional in v1.0.0, not a defect. Closing it (auto-resolving the
   │          rec on decision) would be a v1.1 additive change → Change Request first.
   │
   └── otherwise (no candidate) ── primary action "Approve"
          │
          ├─ "Approve"  ──► onUpdate(id,'approved')  ─┐
          └─ "Dismiss"  ──► onUpdate(id,'dismissed') ─┤
                                                       ▼
                              useUpdateRecommendation (optimistic):
                                onMutate  → remove item from recommendations('pending') cache  ► QUEUE UPDATES INSTANTLY
                                onError   → roll back to previous cache
                                onSettled → invalidate recommendations('pending')               ► reconcile with server truth
```

**Summary of who updates the queue:**
| Trigger | Effect on the Priority Queue |
|---|---|
| Approve / Dismiss (in-queue) | Optimistic removal, rollback on error, server reconcile on settle. |
| Candidate decision inside CandidatePeek | **No direct queue change** (documented seam) — candidate/pipeline update only. |
| `useGenerateBrief` (scan, user-initiated elsewhere) | Invalidates `recommendations('pending')` → queue refreshes with new recs. |

---

## Consumption contract for Sprint 3+ (Role Workspace and beyond)

Role Workspace **consumes** the Inbox contracts; it does not redefine them:

- Need a candidate preview? Import `CandidatePeek` from the **Candidate Object**
  and reuse the Inbox's mount pattern (`selected` state + `onOpenChange` +
  prefetch-on-hover). Do not build a second peek host.
- Need an activity list? Use `groupActivity` + `InboxActivityFeed` (which itself
  reuses `domain/ActivityRow`). Do not re-implement day-bucketing.
- Need attention items / a queue? Use `InboxPriorityQueue` with the same
  `Recommendation` shape and `useUpdateRecommendation`. Do not invent a parallel
  action model or a second ordering.
- Need count tiles? Use `summaryStats` / `InboxSummary`.

Any gap that these contracts cannot express → **STOP** and file a Change Request
(see the banner). The Inbox API is frozen at **v1.0.0**.
