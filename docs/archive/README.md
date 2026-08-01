# Archive

Documents that are **finished**, not wrong.

Everything here was accurate when it was written and is kept because it explains
how the product got where it is. Archived material is **not** authoritative: if
it disagrees with a document in `docs/`, the one in `docs/` is correct.

Nothing was deleted in the 1 Aug 2026 cleanup. Where there was any doubt about
whether a document still carried weight, it was archived rather than removed.

## What is here

### `sprints/` — 14 per-sprint implementation records (V4 SPRINT1 → V8 SPRINT13)

Completed milestone reports. Each one records what a sprint built, the decisions
taken inside it, and the state at its close. Still linked from `CHANGELOG.md`,
`ROADMAP.md`, `AI_ARCHITECTURE.md` and the ADRs, because they are the evidence
behind those documents' claims.

### `homepage-program/` — the nine-scene homepage program

`HOMEPAGE_STORYBOARD` · `IMPLEMENTATION_PACKAGE_HOMEPAGE` ·
`IMPLEMENTATION_HANDOVER_HOMEPAGE` · `HOMEPAGE_RELEASE` · `FIXTURES_SCENE_05` ·
`STITCH_CREATIVE_BRIEF`

**Superseded by `DDL-MKT-009`** (25 Jul 2026), which rebuilt the homepage as a
faithful composition of the five Stitch V4 marketing frames. No scene components
remain in the codebase — `components/marketing/` now holds `frame-01` through
`frame-05`.

These describe a homepage that was built, released as v1.0.0, and then replaced.
They are kept because the Design Decision Log cites them, and because the
reasoning in them outlived the implementation.

### `monetization/` — Phase 1 planning and completion reports

`MONETIZATION_PHASE1_PLAN` (the plan, fully implemented) ·
`MONETIZATION_PHASE1_COMPLETE` (the completion report).

Both are history now. The living documents are `docs/MONETIZATION_ARCHITECTURE.md`
for the design, `docs/HANDOFF.md` §12 for current state, and
`docs/RELEASE_CANDIDATE_CHECKLIST.md` for what still has to be validated.

### `rca/` — closed root-cause analyses

`DATATABLE_COLUMN_MISALIGNMENT` — root cause proven, fixed, verified on a
production build, and referenced by nothing.

`docs/rca/UPLOAD_503.md` deliberately stayed **out** of the archive: it is cited
by live code (`supabase_client.py`), two active test suites, and both
`MONITORING.md` and `OPERATIONS.md`. A runbook someone may need at 3am is not
history.

## Adding to the archive

1. Confirm nothing active depends on it being in `docs/`.
2. `git mv` it here, keeping its folder shape.
3. Fix every inbound link, then re-run the dead-link check.
4. Say here what superseded it, and why it is still worth keeping.
