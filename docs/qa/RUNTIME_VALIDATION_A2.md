# Runtime Validation Report — A2 Decision-Ledger Immutability

> **Generated** by `backend/tests/test_decision_ledger.py`. Do not edit by hand — re-run the suite.

## 1. Environment

- **Backend URL:** `http://127.0.0.1:8000`
- **Supabase project:** `vmqhigckfkedkwfkvnij.supabase.co`
- **Environment:** `development`
- **Date/time:** 2026-07-24 14:12 UTC

## 2. Execution summary

- **Total PASS:** 11
- **Total FAIL:** 0
- **Total SKIPPED:** 0
- **Overall:** ✅ PASS

## 3. Detailed checks

| Guarantee | Check | Result | Detail |
|---|---|---|---|
| G1 | decided_at/decided_by columns exist (migration 0015 applied) | ✅ PASS |  |
| G2 | Decide pending → approved (200) | ✅ PASS | status=200 |
| G2 | Decision stamps decided_at (immutable metadata set) | ✅ PASS |  |
| G2 | Decision records decided_by = the deciding recruiter | ✅ PASS |  |
| G3 | Re-decide approved → rejected via API is rejected (409) | ✅ PASS | status=409 |
| G3 | Ground truth unchanged after re-decide attempt (still approved) | ✅ PASS |  |
| G4 | Un-decide approved → pending is rejected (400) | ✅ PASS | status=400 |
| G4 | Ground truth unchanged after un-decide attempt (still approved) | ✅ PASS |  |
| G5 | DB trigger blocks a direct user-client re-decision (authority) | ✅ PASS |  |
| G6 | decided_at is frozen (unchanged after every rejected attempt) | ✅ PASS |  |
| G7 | Second approve is rejected (409) → side-effects cannot re-fire | ✅ PASS | status=409 |

## 4. Failure classification

No failures or skips — every check passed. Nothing to classify.

## 5. Scope & notes

- **Database is the authority.** G5 bypasses the service guard and mutates the row directly as the user; the finality trigger (migration 0015) refuses it. The 409s in G3/G4/G7 are the service layer's clean UX on top of that guarantee.
- **Idempotency (G7).** Because a second approve is refused, the approval side-effects (integration dispatch + knowledge ingest) are structurally unable to re-fire.
- **Content was already write-once** (agent scan inserts; no field-edit path), so no decision-time snapshot table is needed — only status finality + frozen decision metadata.

## 6. Release recommendation

✅ **Ready to close A2.** Decided recommendations are permanent: re-decision is refused at the DB (authority) and the API (409), decision metadata is frozen, and approvals are idempotent — all proven against live infrastructure.

_A1 = cross-tenant denial · A6 = workflow success · A2 = decision-ledger immutability._
