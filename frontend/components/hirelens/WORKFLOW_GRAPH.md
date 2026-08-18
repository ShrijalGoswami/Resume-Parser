# V5 Workflow Graph — the canonical interaction contract

> **Status: canonical.** This is the authoritative map of every cross-surface
> interaction in Hirevo V5. It is derived from source (query keys, mutations,
> and their `invalidateQueries` sets), not from intent — where the code and the
> ideal diverge, the divergence is documented as a **SEAM**, not hidden.
>
> Documentation only. Sprint 3 (Role Workspace) and later screens **consume** the
> contracts and keys below; they do not invent parallel ones. Any change to a key,
> a mutation's invalidation set, or a flow is a versioned change to this contract
> (see [Candidate Object](./candidate-object/README.md) / [Inbox](./inbox/README.md)
> freeze rules) → RFC → approval.

Notation for every flow:

```
Trigger  →  Event  →  Consumer  →  Side Effects  →  Invalidations  →  Navigation
```

---

## 0. Surfaces and the state they own

State is the **React-Query cache**; there is no separate store. Each surface owns
query keys; mutations cross surfaces only through shared keys.

| Surface | Reads (query keys) | Writes (mutations) |
|---|---|---|
| **Inbox** (`/home`) | `['hl','inbox','analytics']`, `['hl','recommendations','pending']`, `['hl','activity',30]`, `['hl','profile']` | `useUpdateRecommendation` |
| **Role Workspace** (`/roles/:id`) | `['hl','role',:id,'campaign']`, `['hl','role',:id,'candidates']`, `['hl','role',:id,'activity']` | `useUpdateStage`, `useBulkDeleteCandidates`, add-candidates, role lifecycle |
| **Candidate Object** (Peek / Full) | `['hl','role',:id,'candidate',:cid]`, `…,'notes']`, `…,'activity']`, `…,'resume']` | `useUpdateStage` (shared), `useCreateNote`, `useDeleteNote`, `getResumeUrl` |
| **Ledger** (`/ledger`) | `['hl','ask','recommendations','all']` (filtered to resolved) | *(read-only — the ledger is immutable)* |
| **Activity** | `['hl','activity',n]` (global), `['hl','role',:id,'activity']` (role), `['hl','role',:id,'candidate',:cid,'activity']` (candidate) | *(none from client — written server-side)* |
| **Recommendations** (data domain, not a screen) | `['hl','recommendations',:status]` (Inbox), `['hl','ask','recommendations',:status]` (Ask/Ledger) | `useUpdateRecommendation` (Inbox), `useDecideRecommendation` (Ask), `scanAgent` |

### Two facts that shape the whole graph
1. **Recommendations live in two caches** backed by one backend table:
   `['hl','recommendations',*]` (Home/Inbox) and `['hl','ask','recommendations',*]`
   (Ask/Ledger). A mutation that invalidates one does **not** automatically
   refresh the other.
2. **No client mutation invalidates any `…'activity'…` key.** Activity rows are
   written server-side as side effects; the client refreshes them on refetch /
   remount / `staleTime`, never eagerly. Activity is **eventually consistent**.

---

## 1. Inbox — decide a recommendation (Approve / Dismiss)

```
Trigger        Recruiter clicks Approve or Dismiss on a Priority Queue item
Event          useUpdateRecommendation.mutate({ id, status: 'approved' | 'dismissed' })
Consumer       lib/api/hooks · updateRecommendation(id, status)  → PATCH /agent/recommendations/:id
Side Effects   onMutate: optimistic REMOVE of the item from the pending list (instant)
               onError:  roll back to the prior cache snapshot
               backend:  stamps decided_at / decided_by (immutable — migration 0015)
Invalidations  ['hl','recommendations','pending']            (onSettled)
               ⚠ NOT ['hl','ask','recommendations','all']    → Ledger cache is stale
               ⚠ NOT ['hl','inbox','analytics']              → summary counts stale until refetch
Navigation     none (stays on the Inbox)
```
**SEAM (Inbox → Ledger):** an Inbox decision does not invalidate the Ledger's
`['hl','ask','recommendations','all']`, so the new record appears in the Ledger
only after that query refetches (remount / staleTime). The **Ask** decision path
(§6) invalidates both and does not have this lag. Closing it (adding
`['hl','ask','recommendations']` to `useUpdateRecommendation`) would be a v1.1
additive change → Change Request.

---

## 2. Inbox / Role Workspace — open a candidate (→ Candidate Object)

```
Trigger        Click "Review <name>" (Inbox) or a pipeline row (Role Workspace)
               Hover pre-warms: onPrefetchCandidate(roleId, cid)
Event          setSelected({roleId, cid})  (Inbox)  ·  setCandidateId(cid) + history.push (Workspace)
Consumer       <CandidatePeek roleId candidateId open onOpenChange> — FROZEN v1.x, one host pattern
Side Effects   prefetchQuery(['hl','role',roleId,'candidate',cid]) warms the detail cache;
               CandidatePeek seeds detail from the cached candidates list (initialData), refetches fresh
Invalidations  none (read path)
Navigation     Inbox:      overlay only (no route change)
               Workspace:  pushes /roles/:id/candidates/:cid (deep-link; popstate closes)
```
Same host contract on both surfaces — there is exactly **one** CandidatePeek
mount pattern (`selected` state + `onOpenChange` + prefetch-on-hover). Sprint 3
reuses it; it must not build a second peek host.

---

## 3. Candidate Object — decision (Advance / Hold / Reject; A / S / R)

```
Trigger        A advance / S hold / R reject  (keys or decision bar)
Event          useUpdateStage(roleId).mutate({ candidateId, stage })
                 advance→interview · hold→screening · reject→rejected
Consumer       lib/api/workspace · updateCandidateStage(roleId, cid, stage) → PATCH stage
Side Effects   onMutate: optimistic stage patch on the candidates list; toast + Undo (re-mutates to prev)
               onError:  roll back
               onDecided(): host closes the Peek / Full does router.back()  (advance & reject only)
Invalidations  ['hl','role',roleId,'candidates']              (onSettled)  ← the pipeline board reflects it
               ⚠ NOT the candidate detail key (it reseeds from the list via initialData)
               ⚠ NOT ['hl','recommendations','pending']       → an advisory "review" rec stays in the Inbox
               ⚠ NOT any 'activity' key                       → role/candidate activity is eventually consistent
Navigation     advance/reject → onDecided (close Peek / back from Full) · hold → stays open
```
**SEAM (Candidate decision → Recommendations):** deciding a *candidate's stage* is
not the same as *consuming a recommendation*. A "review this candidate" rec is
advisory and remains in the Inbox queue until explicitly Approved/Dismissed (§1).
Intentional in v1.0.0 (documented in the Inbox contract §3).

---

## 4. Candidate Object — notes and résumé

```
── Add note ─────────────────────────────────────────────────────────────────
Trigger        Add note (Notes section or NoteDialog)
Event          useCreateNote(roleId, cid).mutate(body)   → POST note
Consumer       lib/api/candidate
Side Effects   toast
Invalidations  ['hl','role',roleId,'candidate',cid,'notes']   (onSuccess)
Navigation     none

── Delete note ──────────────────────────────────────────────────────────────
Trigger        Delete note   → useDeleteNote(...).mutate(noteId)
Invalidations  ['hl','role',roleId,'candidate',cid,'notes']
               ⚠ NOT any 'activity' key (note events show in activity only after refetch)

── Open résumé (E) ──────────────────────────────────────────────────────────
Trigger        E / "Open"
Event          getResumeUrl(roleId, cid) → signed URL → window.open(url,'_blank')
Side Effects   honest no-op toast if there is no stored binary (A3)
Invalidations  none    Navigation  new browser tab (external)
```

---

## 5. Role Workspace — pipeline & role lifecycle

```
── Move card on the board ────────────────────────────────────────────────────
Same mutation as §3: useUpdateStage(roleId) → invalidates ['hl','role',roleId,'candidates'].
The board and the Candidate Object share ONE stage mutation — decisions made in
either place converge on the same optimistic cache. (Object owns advance/hold/
reject; the board owns the full stage set + reordering.)

── Add candidates (upload / search-into-role) ───────────────────────────────
Trigger        Add-candidates dialog completes
Invalidations  ['hl','role',roleId,'candidates']
               ⚠ NOT ['hl','inbox','analytics'] → "Awaiting review" tile lags until refetch

── Bulk delete ──────────────────────────────────────────────────────────────
Invalidations  ['hl','role',roleId,'candidates']

── Role create / edit / delete ──────────────────────────────────────────────
Event          invalidateRoleQueries(qc, roleId)   (pure roleInvalidationKeys — unit-tested)
Invalidations  ['hl','campaigns']                  (PREFIX: all role lists + Inbox active roles)
               ['hl','role',roleId,'campaign']
               ['hl','role',roleId,'candidates']
Navigation     create → /roles/:newId · delete → /roles
```
The `['hl','campaigns']` prefix is the one deliberate cross-surface bridge:
Inbox's open-roles count and the Roles list share it, so a role mutation refreshes
both without naming either.

---

## 6. Recommendations lifecycle → Ledger

```
                       scanAgent (useGenerateBrief / Ask "run scan", user-initiated)
                                    │  creates pending recommendations (backend)
                                    ▼
        ┌───────────────  ['hl','recommendations','pending']  ◄── Inbox reads
        │                          │
   DECIDE via one of two paths (same backend table, DIFFERENT invalidations):
        │                          │
   (a) Inbox  useUpdateRecommendation ─────────► invalidates ['hl','recommendations','pending'] ONLY
   (b) Ask    useDecideRecommendation ─────────► invalidates ['hl','recommendations','pending']
                                                 AND       ['hl','ask','recommendations','all']
                                    │
                                    ▼  backend stamps decided_at/decided_by (immutable)
                       ['hl','ask','recommendations','all']  ◄── Ledger reads, filters isResolved,
                                                                 sorts by decided_at DESC (client)
```
```
Trigger        A recommendation reaches a resolved status (approved/rejected/dismissed/executed)
Event          —
Consumer       Ledger · useAllRecommendations() → ['hl','ask','recommendations','all'] → listRecommendations()
Side Effects   Ledger is READ-ONLY and immutable — it never mutates; it only renders decided records
Invalidations  none emitted by the Ledger
Navigation     row → LedgerRecordDrawer (in-place)
```
**SEAM (path asymmetry):** decisions from **Ask** appear in the Ledger
immediately (path b invalidates the ledger cache); decisions from the **Inbox**
appear only after the ledger query refetches (path a does not). Both are correct
and immutable server-side; the difference is purely cache-freshness. Scan
(`scanAgent`) also invalidates only `['hl','recommendations','pending']`.

---

## 7. Activity (cross-cutting, read-only on the client)

```
Trigger        Any server-side event: stage change, note, résumé upload, role/candidate create
Event          backend writes an activity row (side effect of the mutations above)
Consumer       Inbox    ['hl','activity',30]                       (global, grouped Today/Yest/Earlier)
               Workspace['hl','role',:id,'activity']               (role)
               Object   ['hl','role',:id,'candidate',:cid,'activity'] (candidate)
Side Effects   —
Invalidations  ⚠ NONE — no client mutation invalidates any activity key
Navigation     Activity rows are informational (read-only); the Inbox feed does not open a Peek
```
**SEAM (Activity freshness):** every activity feed is **eventually consistent** —
it reflects a mutation only after refetch / remount / `staleTime`, because the
mutations in §1–§6 deliberately do not invalidate activity keys. Any surface that
needs live activity after an action must refetch explicitly; adding activity
invalidation to those mutations is a versioned change → Change Request.

---

## 8. Cross-surface invalidation matrix (the crux)

Rows = mutation. Columns = query key. ●= invalidated/updated · ○= *affected but NOT
invalidated (stale until refetch — a documented seam)*.

| Mutation | `recs,'pending'` | `ask…,'all'` | `role…,'candidates'` | `…'notes'` | `inbox,'analytics'` | `['hl','campaigns']` | any `…'activity'` |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Inbox `useUpdateRecommendation` | ● | ○ | | | ○ | | |
| Ask `useDecideRecommendation` | ● | ● | | | ○ | | |
| `scanAgent` (brief/scan) | ● | ○ | | | ○ | | |
| Candidate/board `useUpdateStage` | ○ | | ● | | ○ | | ○ |
| `useCreateNote` / `useDeleteNote` | | | | ● | | | ○ |
| Add candidates | | | ● | | ○ | | ○ |
| `useBulkDeleteCandidates` | | | ● | | ○ | | ○ |
| Role create/edit/delete | | | ● | | ○ (via prefix) | ● | |

Every ○ in this matrix is an intentional, documented eventual-consistency point,
not a bug. Converting any ○ to ● is an additive but **contract-level** change and
requires a Change Request against the owning surface's freeze.

---

## 9. Rules for Sprint 3+ (consume, do not redefine)

1. **One candidate host.** Reuse `CandidatePeek` + the §2 mount pattern. No second
   peek, no forked controller.
2. **One stage mutation.** All stage transitions go through `useUpdateStage(roleId)`
   (§3/§5). Do not add a parallel stage writer.
3. **One recommendation-decision contract.** Decisions go through
   `useUpdateRecommendation` (Inbox) or `useDecideRecommendation` (Ask). Do not
   PATCH recommendations directly from a new surface.
4. **One priority order.** Server-owned (`created_at DESC`, limit 200); never
   client re-sort (Inbox contract §2).
5. **Reuse keys, never re-key.** Read the keys in §0. A new surface that needs the
   same data reuses the key so existing invalidations reach it for free.
6. **Respect the seams.** If a new screen needs a ○ to become ●, that is a
   cross-surface contract change → STOP → Change Request → approval. Do not
   silently add invalidations that other surfaces don't expect.
