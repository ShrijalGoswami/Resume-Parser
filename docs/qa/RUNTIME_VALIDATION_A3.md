# Runtime Validation Report — A3 Résumé Binary Storage

> **Generated** by `backend/tests/test_resume_storage.py`. Do not edit by hand — re-run the suite.

## 1. Environment

- **Backend URL:** `http://127.0.0.1:8010`
- **Supabase project:** `vmqhigckfkedkwfkvnij.supabase.co`
- **Environment:** `development`
- **Date/time:** 2026-07-29 15:50 UTC
- **Original SHA-256:** `6b3f45aa0dc5dafccae3d735202ab2de2a60beac058fe9b841b15f2dc4092b03`

## 2. Execution summary

- **Total PASS:** 5
- **Total FAIL:** 0
- **Total SKIPPED:** 0
- **Overall:** ✅ PASS

## 3. Detailed checks

| Check id | Check | Result | Detail |
|---|---|---|---|
| R1 | Upload résumé binary → 200/201 | ✅ PASS | status=200 |
| R1 | Response persists resume_path + resume_filename | ✅ PASS |  |
| R4 | Ground truth: resume_path persisted on candidate row | ✅ PASS |  |
| R2 | Signed download URL issued (200 + url) | ✅ PASS | status=200 |
| R3 | Downloaded bytes are byte-identical to the original (SHA-256 match) | ✅ PASS | status=200, sha_match=True |

## 4. Failure classification

No failures or skips — every check passed. Nothing to classify.

## 5. Scope & notes

- **True round-trip integrity.** R3 downloads the signed URL and compares SHA-256 to the original bytes — proving the private bucket stores and serves the exact file, not just that a row exists (which A1 covered).
- **No new storage surface.** Reuses the existing `POST …/resume` endpoint (private bucket, recruiter-namespaced key, magic-byte + size validation) proven isolated by A1.
- **Browser orchestration out of scope.** The add-candidates analyze→persist→hash-map→upload flow is validated by the frontend unit test `tests/resume-upload.test.ts` (content-hash mapping, collision-proof); full browser E2E is out of scope (no Playwright), as in A6.

## 6. Release recommendation

✅ **Ready to close A3.** Résumé binaries are stored and served intact end-to-end (upload → metadata → signed URL → download → SHA-256 match) on live infrastructure, under the A1-proven private, tenant-isolated bucket.

_A1 = tenant isolation · A6 = workflow · A2 = ledger immutability · A3 = résumé storage._
