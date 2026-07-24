# Candidate Object

The single source of truth for candidate UI in V5. One normalized model
(`CandidateModel`) rendered by 13 reusable sections, composed into two densities:
`CandidatePeek` (rack-focus drawer) and `CandidateFullDossier` (single-scroll page).
Every surface (Inbox, Roles, Talent, Ledger) imports from `index.ts`; no surface
builds its own candidate UI.

- **Data:** `buildCandidateModel(roleId, candidate)` — pure normalization of the
  backend `Candidate` (+ embedded analysis) into `CandidateModel`.
- **Controller:** `useCandidateObject(roleId, candidateId, { onDecided })` — data +
  decision actions in one place. Sections stay pure.
- **Keyboard:** `useCandidateShortcuts` — `A` advance · `S` hold · `R` reject ·
  `E` résumé · `F` full · `Esc` close (dormant while typing / in a modal).
- **AI contract:** the verdict renders through the shared `domain/AIAnswer`
  primitive, which enforces the immutable order **Answer → Sources → Confidence →
  Reasoning (collapsed) → Actions**.

---

## 1. Candidate lifecycle state model (item #9)

### 1a. Analysis lifecycle (drives what the object shows)
```
                (no analysis row)                 (batch/persist pipeline runs)
  Candidate ──────────────────────► PENDING ───────────────────────────► ANALYZED
  created         hasAnalysis=false                     hasAnalysis=true
                  confidence=null                       confidence, verdict, evidence
                  → renders PendingAnalysis             → renders the full read
```
The object never invents values: in `PENDING` it shows an honest note; every
section is hidden until it has real data.

### 1b. Pipeline stage model (the decision target)
Canonical stages (`types/campaign.ts › PipelineStage`), ordered:

```
sourced → screening → shortlisted → interview → offer → hired
                          └────────────────────────────► rejected
```

The Candidate Object's **decision bar** maps its three verbs to stage transitions
(unchanged from the prior behavior, so no workflow was reinterpreted):

| Action | Key | Target stage | Surface behavior |
|---|---|---|---|
| **Advance** | `A` | `interview` | optimistic + Undo → `onDecided()` (host closes / Full goes back) |
| **Hold** | `S` | `screening` | optimistic + Undo → surface stays open |
| **Reject** | `R` | `rejected` | optimistic + Undo → `onDecided()` |

The remaining transitions (`shortlisted`, `offer`, `hired`, and free re-ordering)
are owned by the **pipeline board** (Role Workspace), not by the Candidate Object —
the object decides *advance / hold / reject*; the board manages the full pipeline.
All transitions are optimistic with an **Undo** action on the toast.

---

## 2. Emitted events / side-effects (item #10)

The Candidate Object has no event bus; it produces effects through **host
callbacks**, **react-query mutations** (which invalidate shared keys so every
surface refreshes), **navigation**, and **toasts**. This is its outward contract:

| Event | Trigger | Effect | Host wiring |
|---|---|---|---|
| `decision:advance` | `A` / Advance | `updateStage → interview` (optimistic) · toast+Undo · `onDecided()` | `onDecided` closes the Peek / `router.back()` in Full |
| `decision:hold` | `S` / Hold | `updateStage → screening` (optimistic) · toast+Undo | surface stays open |
| `decision:reject` | `R` / Reject | `updateStage → rejected` (optimistic) · toast+Undo · `onDecided()` | as advance |
| `note:create` | Add note (dialog or Notes section) | `createNote` mutation · toast | invalidates notes key |
| `note:delete` | Delete note | `deleteNote` mutation | invalidates notes key |
| `resume:open` | `E` / "Open" | signed-URL fetch → `window.open(url, _blank)` (honest: no-op toast if no binary — A3) | — |
| `navigate:full` | `F` / "Full review" | `onOpenChange(false)` then `router.push(/roles/:roleId/candidates/:id)` | Peek only |
| `close` | `Esc` / drawer close | Peek: `onOpenChange(false)` · Full: `router.back()` | `onOpenChange` |

**Query-key invalidations emitted** (via the existing hooks — downstream surfaces
re-render automatically): candidate detail, notes, activity, and the pipeline list
share these keys, so a decision made in the Peek reflects on the board immediately.

**Host contract (props):**
- `CandidatePeek({ roleId, candidateId, open, onOpenChange })`
- `CandidateFullDossier({ roleId, candidateId })` — deep-link home
  `/roles/[roleId]/candidates/[candidateId]`
- `useCandidateObject(roleId, candidateId, { onDecided })` — the controller, for
  hosts that compose sections directly.
