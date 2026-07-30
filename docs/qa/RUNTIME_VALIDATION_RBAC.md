# Runtime Validation — RBAC enforcement (gates verified CLOSED)

Generated 2026-07-29T16:11:30+00:00 by `python -m tests.test_rbac_enforcement`.

Proves the server **denies** a role that lacks a permission — the half of the
RBAC sweep that had never been exercised. Expectations are read from
`app/enterprise/rbac.ROLE_PERMISSIONS`, not restated here.

**67 pass · 0 fail · 18 skipped**

Skipped probes are mutations a role is *entitled* to perform; issuing them
would alter the suite's own fixtures, and a permitted mutation is not what
this suite exists to check.

| Role | Probe | Expected | Got | Result |
|---|---|---|---|---|
| viewer | list campaigns | allowed (2xx) | 200 | PASS |
| viewer | read campaign | allowed (2xx) | 200 | PASS |
| viewer | list candidates | allowed (2xx) | 200 | PASS |
| viewer | read candidate | allowed (2xx) | 200 | PASS |
| viewer | campaign activity | allowed (2xx) | 200 | PASS |
| viewer | org usage | denied (403) | 403 | PASS |
| viewer | audit log | denied (403) | 403 | PASS |
| viewer | api keys | denied (403) | 403 | PASS |
| viewer | analytics | denied (403) | 403 | PASS |
| viewer | create campaign | denied (403) | 403 | PASS |
| viewer | update campaign | denied (403) | 403 | PASS |
| viewer | delete campaign | denied (403) | 403 | PASS |
| viewer | move stage | denied (403) | 403 | PASS |
| viewer | add note | denied (403) | 403 | PASS |
| viewer | invite member | denied (403) | 403 | PASS |
| viewer | create workspace | denied (403) | 403 | PASS |
| viewer | set feature flag | denied (403) | 403 | PASS |
| interviewer | list campaigns | allowed (2xx) | 200 | PASS |
| interviewer | read campaign | allowed (2xx) | 200 | PASS |
| interviewer | list candidates | allowed (2xx) | 200 | PASS |
| interviewer | read candidate | allowed (2xx) | 200 | PASS |
| interviewer | campaign activity | allowed (2xx) | 200 | PASS |
| interviewer | org usage | denied (403) | 403 | PASS |
| interviewer | audit log | denied (403) | 403 | PASS |
| interviewer | api keys | denied (403) | 403 | PASS |
| interviewer | analytics | denied (403) | 403 | PASS |
| interviewer | create campaign | denied (403) | 403 | PASS |
| interviewer | update campaign | denied (403) | 403 | PASS |
| interviewer | delete campaign | denied (403) | 403 | PASS |
| interviewer | move stage | denied (403) | 403 | PASS |
| interviewer | add note | denied (403) | 403 | PASS |
| interviewer | invite member | denied (403) | 403 | PASS |
| interviewer | create workspace | denied (403) | 403 | PASS |
| interviewer | set feature flag | denied (403) | 403 | PASS |
| recruiter | list campaigns | allowed (2xx) | 200 | PASS |
| recruiter | read campaign | allowed (2xx) | 200 | PASS |
| recruiter | list candidates | allowed (2xx) | 200 | PASS |
| recruiter | read candidate | allowed (2xx) | 200 | PASS |
| recruiter | campaign activity | allowed (2xx) | 200 | PASS |
| recruiter | org usage | allowed (2xx) | 200 | PASS |
| recruiter | audit log | denied (403) | 403 | PASS |
| recruiter | api keys | denied (403) | 403 | PASS |
| recruiter | analytics | allowed (2xx) | 200 | PASS |
| recruiter | create campaign | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| recruiter | update campaign | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| recruiter | delete campaign | denied (403) | 403 | PASS |
| recruiter | move stage | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| recruiter | add note | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| recruiter | invite member | denied (403) | 403 | PASS |
| recruiter | create workspace | denied (403) | 403 | PASS |
| recruiter | set feature flag | denied (403) | 403 | PASS |
| hiring_manager | list campaigns | allowed (2xx) | 200 | PASS |
| hiring_manager | read campaign | allowed (2xx) | 200 | PASS |
| hiring_manager | list candidates | allowed (2xx) | 200 | PASS |
| hiring_manager | read candidate | allowed (2xx) | 200 | PASS |
| hiring_manager | campaign activity | allowed (2xx) | 200 | PASS |
| hiring_manager | org usage | allowed (2xx) | 200 | PASS |
| hiring_manager | audit log | allowed (2xx) | 200 | PASS |
| hiring_manager | api keys | denied (403) | 403 | PASS |
| hiring_manager | analytics | allowed (2xx) | 200 | PASS |
| hiring_manager | create campaign | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| hiring_manager | update campaign | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| hiring_manager | delete campaign | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| hiring_manager | move stage | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| hiring_manager | add note | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| hiring_manager | invite member | denied (403) | 403 | PASS |
| hiring_manager | create workspace | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| hiring_manager | set feature flag | denied (403) | 403 | PASS |
| admin | list campaigns | allowed (2xx) | 200 | PASS |
| admin | read campaign | allowed (2xx) | 200 | PASS |
| admin | list candidates | allowed (2xx) | 200 | PASS |
| admin | read candidate | allowed (2xx) | 200 | PASS |
| admin | campaign activity | allowed (2xx) | 200 | PASS |
| admin | org usage | allowed (2xx) | 200 | PASS |
| admin | audit log | allowed (2xx) | 200 | PASS |
| admin | api keys | allowed (2xx) | 200 | PASS |
| admin | analytics | allowed (2xx) | 200 | PASS |
| admin | create campaign | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| admin | update campaign | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| admin | delete campaign | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| admin | move stage | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| admin | add note | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| admin | invite member | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| admin | create workspace | allowed | — | SKIPPED — mutation expected to succeed — not issued |
| admin | set feature flag | allowed | — | SKIPPED — mutation expected to succeed — not issued |
