# API Reference

> Every HTTP endpoint Hirevo exposes. Base path: **`/api/v1`**. Interactive
> OpenAPI docs are auto-served by FastAPI at **`/docs`** and **`/openapi.json`**.
> Cross-refs: [SECURITY.md](./SECURITY.md), [DATABASE.md](./DATABASE.md),
> [AI_PIPELINE.md](./AI_PIPELINE.md).

## Conventions

- **Auth:** ❌ = public, 🔒 = requires `Authorization: Bearer <JWT>`.
- **Permission:** where shown, the route additionally requires that permission
  (policy-based RBAC, `require_permission`). A member whose role lacks it gets
  `403`, not `401`. The role → permission matrix is `GET /api/v1/org/roles`.
- Auth errors: `401` missing/invalid token, `403` role lacks the permission,
  `503` auth/persistence not configured.
- All persistence endpoints are scoped to the authenticated recruiter (RLS).
- Content type is `application/json` unless noted `multipart/form-data`.

> **The stateless AI endpoints are no longer public.** `/ats-analysis`,
> `/match-analysis`, `/batch-analysis`, `/copilot/*` and both `/export-*` routes
> were genuinely unauthenticated while the product was a stateless analyzer;
> the RBAC sweep of 28–29 Jul 2026 put them behind `ai.use` / `export`. This
> table said otherwise until 29 Jul. If you are writing a client, send the token
> — a header-less caller gets `401`, which is exactly how the candidate-upload
> flow broke once already.

---

## Endpoint index

| Method | Path | Auth | Permission | Purpose |
|--------|------|:----:|---------|---------|
| GET/HEAD | `/health` | ❌ | — | Liveness + dependency status |
| POST | `/api/v1/ats-analysis` | 🔒 | `ai.use` | Single-resume ATS analysis |
| POST | `/api/v1/match-analysis` | 🔒 | `ai.use` | Resume-vs-JD match |
| POST | `/api/v1/batch-analysis` | 🔒 | `ai.use` | Rank many resumes vs one JD |
| POST | `/api/v1/copilot/chat` | 🔒 | `ai.use` + `ai_copilot` | Grounded Q&A about a candidate |
| GET | `/api/v1/copilot/suggestions` | 🔒 | `ai.use` + `ai_copilot` | Copilot quick-action prompts |
| POST | `/api/v1/export-report` | 🔒 | `export` | ATS PDF report *(no current client)* |
| POST | `/api/v1/export-match-report` | 🔒 | `export` | Match PDF report *(no current client)* |
| GET/PATCH | `/api/v1/me` | 🔒 | — *(self-service)* | Recruiter profile |
| GET | `/api/v1/activity` | 🔒 | — *(self-service)* | Global activity feed |
| POST/GET | `/api/v1/campaigns` | 🔒 | `campaign.manage` / `campaign.view` | Create / list campaigns |
| GET/PATCH/DELETE | `/api/v1/campaigns/{id}` | 🔒 | `campaign.view` / `.manage` / `.delete` | Read / update / delete campaign |
| GET | `/api/v1/campaigns/{id}/candidates` | 🔒 | `candidate.view` | List campaign candidates |
| GET | `/api/v1/campaigns/{id}/candidates/{cid}` | 🔒 | `candidate.view` | Get candidate + latest analysis |
| PATCH | `/api/v1/campaigns/{id}/candidates/{cid}/stage` | 🔒 | `candidate.manage` | Move pipeline stage |
| POST/GET | `/api/v1/campaigns/{id}/candidates/{cid}/notes` | 🔒 | `candidate.manage` / `.view` | Create / list notes |
| POST | `/api/v1/campaigns/{id}/candidates/{cid}/resume` | 🔒 | `candidate.manage` | Upload resume to storage |
| GET | `/api/v1/campaigns/{id}/candidates/{cid}/resume-url` | 🔒 | `candidate.view` | Signed download URL |
| POST | `/api/v1/campaigns/{id}/persist-batch` | 🔒 | `candidate.manage` | Store a batch analysis |
| GET | `/api/v1/campaigns/{id}/activity` | 🔒 | `campaign.view` | Campaign activity feed |

**Coverage (verified 29 Jul 2026 by AST parse, not grep):** 103 endpoints, 74
permission-gated. The 29 that are not are deliberate: `/health` (public),
`/api/v1/me` + `/activity` (self-service, RLS-scoped), `/ai/config` · `/ai/health`
(no secrets, no spend) and `/ai/qa/reset` (403 outside development), and
org-scoped reads under `/org/*`, `/integrations/*`, `/knowledge/*` that any
member of the organization is entitled to. Every **mutating** endpoint outside
self-service is gated.

---

## Health

### `GET|HEAD /health` ❌
Operational health; never exposes secrets.

**200** →
```json
{
  "status": "healthy", "service": "hirelens-api",
  "version": "1.2.0", "api_version": "v1", "environment": "development",
  "dependencies": { "llm": "configured", "persistence": "not_configured", "auth": "not_configured" },
  "limits": { "max_file_size_mb": 10, "allowed_extensions": [".pdf", ".docx"] }
}
```

---

## Stateless AI endpoints

### `POST /api/v1/ats-analysis` 🔒 `ai.use`
Upload, parse, deterministically score, and get Groq insights in one call.

- **Request:** `multipart/form-data` — `file` (PDF/DOCX, required).
- **Response 200:** `{ "resume_data": ResumeData, "analysis": AnalysisResponse }`.
- **Errors:** `422` unparseable file · `503` LLM unavailable · `500` other.

### `POST /api/v1/match-analysis` 🔒 `ai.use`
Compare a resume against a job description.

- **Request:** `multipart/form-data` — `job_description` (text, required), `file` (required).
- **Response 200:** `{ "resume_data": ResumeData, "match_analysis": MatchAnalysisResponse }`.
- **Errors:** `400` empty JD · `422` parse · `503` LLM · `500`.

### `POST /api/v1/batch-analysis` 🔒 `ai.use`
Rank many resumes against one JD (Recruiter Workspace).

- **Request:** `multipart/form-data` — `job_description` (required), `files` (list, required), `weights` (optional JSON of `RankingWeights`).
- **Response 200:** `BatchAnalysisResponse` — `{ analysis_version, job_description, weights, candidates: CandidateResult[], analytics: BatchAnalytics }`.
- **Behaviour:** processed concurrently (semaphore 5); one bad resume becomes a `status:"failed"` candidate, never fails the batch.
- **Errors:** `400` empty JD / no files / over `MAX_BATCH_SIZE` · `413` body too large.

### `POST /api/v1/copilot/chat` 🔒 `ai.use` + `ai_copilot`
Grounded Q&A about a single, already-analyzed candidate.

- **Request (JSON) — `CopilotRequest`:**
```json
{ "candidate": CandidateResult, "job_description": "string",
  "history": [{"role":"user|assistant","content":"string"}], "message": "string" }
```
- **Response 200 — `CopilotResponse`:** `{ answer, confidence (0-100), evidence: [{category, detail}], reasoning_summary, followups, degraded }`.
- **Errors:** `400` empty message. Never 5xx from the LLM — degrades to a deterministic answer (`degraded:true`).

### `GET /api/v1/copilot/suggestions` 🔒 `ai.use` + `ai_copilot`
Static quick-action prompt groups.
- **Response 200 — `SuggestionsResponse`:** `{ groups: [{category, questions[]}] }` (Overview, Fit & Skills, Experience, Interview, Resume).

### `POST /api/v1/export-report` 🔒 `export`
- **Request (JSON):** `{ analysis: AnalysisResponse, resume_data: {name,email,phone} }`.
- **Response 200:** `application/pdf` (attachment `ATS_Report_<name>.pdf`). **Errors:** `500`.

### `POST /api/v1/export-match-report` 🔒 `export`
- **Request (JSON):** `{ match_analysis: object, resume_data: {name,email,phone} }`.
- **Response 200:** `application/pdf` (`Match_Report_<name>.pdf`). **Errors:** `500`.

---

## Persistence endpoints (🔒 recruiter JWT)

### Account
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/v1/me` | — | `RecruiterProfile` (auto-provisions if missing) |
| PATCH | `/api/v1/me` | `{full_name?, company?, job_title?, onboarded?}` | `RecruiterProfile` |
| GET | `/api/v1/activity?limit=50` | — | `ActivityEvent[]` |

### Campaigns
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/v1/campaigns` | `CampaignCreate` `{title*, role_title?, department?, location?, employment_type?, job_description?, ranking_weights?, status?}` | `Campaign` (201) |
| GET | `/api/v1/campaigns?status=` | — | `Campaign[]` (with `candidate_count`) |
| GET | `/api/v1/campaigns/{id}` | — | `Campaign` |
| PATCH | `/api/v1/campaigns/{id}` | `CampaignUpdate` (partial) | `Campaign` |
| DELETE | `/api/v1/campaigns/{id}` | — | `204` |

### Candidates & pipeline
| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/api/v1/campaigns/{id}/candidates` | — | `Candidate[]` (+ `latest_analysis`) |
| GET | `/api/v1/campaigns/{id}/candidates/{cid}` | — | `Candidate` |
| PATCH | `…/{cid}/stage` | `{stage}` (pipeline_stage enum) | `Candidate` |
| POST | `…/{cid}/notes` | `{body*, pinned?}` | `RecruiterNote` (201) |
| GET | `…/{cid}/notes` | — | `RecruiterNote[]` |

### Resume storage
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `…/{cid}/resume` | `multipart` `file` | `Candidate` (stores private key, attaches to candidate) |
| GET | `…/{cid}/resume-url` | — | `{url, expires_in}` (signed; `404` if none stored) |

### Persistence & activity
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/v1/campaigns/{id}/persist-batch` | `BatchAnalysisResponse` | `Candidate[]` (201) — stores each successful candidate + verbatim analysis |
| GET | `/api/v1/campaigns/{id}/activity?limit=50` | — | `ActivityEvent[]` |

**Common persistence errors:** `401` (no/invalid token) · `404` (not owned / not
found) · `502` (database operation failed) · `503` (persistence/auth not configured).

---

## Core data models

- **`ResumeData`** — `name, email, phone, skills[], education[], experience[], projects[], certifications[]`.
- **`CandidateResult`** — canonical batch record: `candidate_id, filename, status, rank, overall_score, ats_score, ats_breakdown, semantic_similarity, years_experience, match_category, recommendation, strengths[], weaknesses[], matching_skills[], missing_skills[], interview_questions[], resume_data`.
- **`Campaign`, `Candidate`, `RecruiterNote`, `RecruiterProfile`, `ActivityEvent`** — see [DATABASE.md](./DATABASE.md) and `backend/app/schemas/campaign.py`.

---

## Future endpoints (planned)

| Method | Path | Purpose |
|--------|------|---------|
| POST/GET | `…/{cid}/conversations` | Persisted Copilot threads (tables exist) |
| POST | `…/{cid}/interview-pack` | Generate + store interview pack PDF |
| GET | `/api/v1/campaigns?cursor=` | Keyset pagination + search |
| POST | `/api/v1/auth/oauth/{provider}` | OAuth sign-in |
| — | Realtime channels | Live pipeline updates (Supabase Realtime) |

See [ROADMAP.md](./ROADMAP.md).
