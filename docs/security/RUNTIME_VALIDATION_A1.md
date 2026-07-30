# Runtime Validation Report — A1 Tenant Isolation

> **Generated** by `backend/tests/test_tenant_isolation.py`. Do not edit by hand — re-run the suite.

- **Run at:** 2026-07-29 15:51 UTC
- **Environment:** `development`
- **Backend target:** `http://127.0.0.1:8010`
- **Supabase project:** `vmqhigckfkedkwfkvnij.supabase.co`
- **Totals:** 25 PASS · 0 FAIL · 1 SKIPPED
- **Overall:** ✅ PASS

## Invariant summary

| Invariant | Statement | Result |
|---|---|---|
| INV1 | The browser never accesses tenant data directly from Supabase. | ⚠️ SKIPPED |
| INV2 | Every backend request derives recruiter_id from the JWT. | ✅ PASS |
| INV3 | organization_id is never accepted from client input. | ⚠️ SKIPPED |
| INV4 | Every recruiter-scoped query includes recruiter_id filtering. | ✅ PASS |
| INV5 | Every service-role query includes organization_id filtering. | ✅ PASS |
| INV6 | Storage object paths are always tenant namespaced. | ✅ PASS |
| INV7 | Cross-tenant access must always fail. | ✅ PASS |
| INV8 | Runtime authorization tests must pass before release. | ✅ PASS |

## Detailed checks

| Invariant | Check | Result | Detail |
|---|---|---|---|
| INV1 | Browser never queries Supabase for data (frontend, static) | ⚠️ SKIPPED | verified in A1 frontend audit; not exercisable by this backend suite |
| INV8 | All 28 tenant tables exist (migrations applied) | ✅ PASS |  |
| INV2 | Valid token → 200 | ✅ PASS |  |
| INV2 | No token → 401 | ✅ PASS |  |
| INV2 | Expired token → 401 | ✅ PASS |  |
| INV2 | Bad-signature token → 401 | ✅ PASS |  |
| INV2 | Wrong-audience token → 401 | ✅ PASS |  |
| INV4 | A reads own campaign (200) | ✅ PASS |  |
| INV7 | A cannot read B's campaign (404) | ✅ PASS |  |
| INV7 | A cannot read B's candidate (404) | ✅ PASS |  |
| INV7 | A's listing of B's candidates leaks nothing | ✅ PASS | status=200 |
| INV4 | A cannot modify B's campaign (title intact) | ✅ PASS |  |
| INV4 | A cannot delete B's campaign (still exists) | ✅ PASS |  |
| INV4 | A cannot delete B's note (still exists) | ✅ PASS |  |
| INV4 | A cannot modify B's recommendation (status intact) | ✅ PASS |  |
| INV4 | A's user-client sees own campaign (RLS allows own) | ✅ PASS |  |
| INV7 | A's user-client sees 0 of B's campaigns | ✅ PASS |  |
| INV7 | A's user-client sees 0 of B's candidates | ✅ PASS |  |
| INV7 | A's user-client sees 0 of B's recruiter_notes | ✅ PASS |  |
| INV7 | A's user-client sees 0 of B's agent_recommendations | ✅ PASS |  |
| INV6 | A gets a signed URL for own résumé (200) | ✅ PASS |  |
| INV7 | A cannot get a signed URL for B's résumé (404) | ✅ PASS |  |
| INV6 | A's user-client cannot download B's résumé object | ✅ PASS |  |
| INV5 | A's user-client sees 0 of B's organization | ✅ PASS |  |
| INV5 | A's user-client sees 0 of B's knowledge_items (org RLS) | ✅ PASS |  |
| INV8 | All runtime authorization checks pass | ✅ PASS |  |

## Notes

- **INV1** is a static frontend property (the browser never queries Supabase for data), verified in the A1 frontend audit; it is not exercisable by this backend suite and is reported SKIPPED.
- **INV3** (`organization_id` never accepted from client input) is a server-derived property; its runtime shadow is INV5's org-RLS denial. Endpoints expose no client `organization_id` to target.
- Cross-tenant *mutation* checks assert the victim's ground truth is unchanged (scoped writes can be silent no-ops), not merely the HTTP status.
- Multi-member RBAC (403) is out of scope here (orgs auto-provision single-member); to be added when team membership ships.

_Reference: `docs/security/TENANT_ISOLATION.md` (§11 checklist, §13 invariants)._
