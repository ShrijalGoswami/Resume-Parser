# HireLens V1 — Release Candidate

**Date:** 8 August 2026 · **Branch:** `manus-ui-v1` · **Recommended tag:** `v1.0.0-rc.1`
**Verification:** live Groq, live NVIDIA NIM, live Supabase, Razorpay test keys. No mocks.

---

## 1. Production Ready Checklist

### Security

| Item | Status | Evidence |
|---|---|---|
| Authentication | ✅ | All protected endpoints `401` unauthenticated; cookie session; logout clears every `sb-*` cookie |
| Authorization / RLS | ✅ | Foreign campaign GET/PATCH/stage/detail/resume-url → `404`; foreign candidate list → `[]` |
| Upload validation | ✅ | `.exe` blocked by extension; text-as-PDF blocked by magic bytes; empty rejected; corrupt → `failed` with **no LLM call** |
| Archive bombs | ✅ | 343 KB → 300 MB DOCX refused in **25 ms** |
| Document limits | ✅ | 322 K chars and 500 pages both refused via the real `parse_file` path |
| Prompt injection | ✅ | Scrubbed at the parser chokepoint **before** skills, prompt or embeddings; score not inflated; zero markers in output |
| Path traversal | ✅ | Sanitised and contained under `resumes/{recruiter}/{campaign}/{candidate}/` |
| XSS | ✅ | Stored payloads render as escaped text |
| SQL injection | ✅ | Table intact; PostgREST parameterisation |
| CSP | ⚠️ | Report-Only, env-derived origins — see §3 |
| CORS | ✅ | Production refuses `*` **and** unset; explicit origin boots restricted |
| Rate limiting | ✅ | All paid endpoints capped, incl. semantic search (`c30586e`) |
| Secrets | ✅ | Clean on `/health`, `/openapi.json`, `/docs`, `/.env`; 1,573 log lines contain no key or token |
| SSRF | ✅ | No vector — no outbound fetch of user-supplied URLs anywhere |
| Dependencies | ✅ | **Zero production advisories**, both tiers |

### Reliability

| Item | Status |
|---|---|
| Retries / timeouts | ✅ 0 retries, 0 fallbacks in live runs; quota never retried |
| Graceful failure | ✅ LLM down → deterministic scores still returned, not a 500 |
| Error responses | ✅ 400 / 401 / 404 / 405 / 422 correct and structured |
| Logging | ✅ Structured, per-request `x-request-id`, no secrets |
| Startup validation | ✅ Fatal on closed-set config errors; **never** on "could not ask" |
| Health endpoint | ✅ Version, environment, dependencies, limits |

### Functional

| Flow | Status |
|---|---|
| 88 endpoints | ✅ Enumerated, exercised or gate-verified |
| Upload (PDF/DOCX/duplicate/empty/corrupt/oversized/spoofed/`.exe`/bomb) | ✅ |
| Parsing — all 9 fields | ✅ Exact on both formats |
| Resume analysis · JD match | ✅ |
| Candidate comparison | ✅ 200 (5.4 s) |
| Interview generation | ✅ 200 (11.3 s) |
| Copilot | ✅ 200 (2.4 s), grounded |
| Semantic search · similar candidates | ✅ ~2.1 s steady |
| Exports | ✅ 200 (662 ms) |
| Authentication · multi-tab · logout | ✅ |
| Billing — signature, idempotency, replay, entitlement gates | ✅ See §5 |
| Billing — live checkout | ⛔ Blocked, see §5 |

### Performance

| Operation | Measured |
|---|---|
| Parse 60-page / 322 K-char PDF | 223 ms · **peak memory 1.1 MB** |
| Structured extraction | 936 ms |
| Groq analysis | ~2.9 s |
| NVIDIA embedding | **171 ms/text at batch 8** (batch-32 regresses to 368) |
| Semantic search | 5.3 s cold → **2.1 s steady** |
| Slowest endpoint | Interview generation, **11.3 s** |

**Tests:** backend **1172** · frontend **455** · all green.

---

## 2. Dependency Versions

### Frontend — 0 production advisories (was 14)

| Package | Before | After | Why |
|---|---|---|---|
| `next` | 16.2.6 | **16.2.12** | 7 prod advisories; patched ≥16.2.11. Stayed on the minor deliberately |
| `postcss` | 8.4.31 | **8.5.26** | 4 advisories; override, build-time only |
| `sharp` | 0.34.5 | **0.35.0** | Unreachable today (`images.unoptimized: true`); lifted pre-emptively |

React 19 · pnpm 11.2.2. Overrides live in `pnpm-workspace.yaml` (pnpm 11 no longer reads `pnpm.overrides` from `package.json`).
10 dev-only advisories remain (`jsdom`→`undici`, vite) — never shipped.

### Backend — 1 advisory, unreachable

| Package | Version | Note |
|---|---|---|
| `cryptography` | **50.0.0** | Was 49.0.0 (PYSEC-2026-3552). Reachable via PyJWT RS256/ES256 — the Supabase JWKS path |
| `h2` | 4.3.0 | CVE-2026-71554. **Not reachable** — `http2=False`; the only `http2=True` is inside a comment |

FastAPI 0.139.2 · Pydantic 2.13.4 · httpx 0.28.1 · supabase 2.31.0 · PyJWT 2.13.0 · groq 1.5.0

**Stack:** Groq `llama-3.3-70b-versatile` (reasoning) · NVIDIA `llama-nemotron-embed-1b-v2`, 2048-dim (embeddings) · Supabase (DB/auth/storage) · Razorpay (payments).

---

## 3. Known Limitations

1. **CSP is Report-Only** with `script-src 'unsafe-inline'` — the App Router bootstraps from inline script, so injected inline script is **not** blocked. It does stop script from unlisted origins, framing, form hijacking and exfiltration to unnamed hosts. Nonces need a proxy change. Not validated against a production build.
2. **Reconciliation is conservative** — leaves "GraphQL API design" when only "GraphQL" was extracted; cannot reason about free-text experience descriptions. Both need fuzzy matching, deliberately avoided.
3. **Interview generation 11.3 s**, not streamed.
4. **Search cold start 5–15 s** (provider construction + first embedding).
5. **Rate limiting is in-process** — per instance, not distributed. Add edge/WAF limits before scale-out.
6. **Webhooks (integrations) are a stub** — no URL field, no delivery, no DELETE route; POST silently discards its body.
7. **Razorpay live checkout unverified** — see §5.
8. **Embedding batch-32 regresses** to 368 ms/text vs 171 at batch-8.

---

## 4. Intentional Technical Debt

| Decision | Rationale |
|---|---|
| No automatic `nvidia → hashing` fallback | Different vector widths; `cosine_similarity` returns 0.0 on mismatch, so a silent downgrade would make candidates vanish from search with no error. Fails loudly instead |
| `EMBEDDING_DIMENSIONS` retained | A real input for `hashing`, a drift-detector for `nvidia` |
| HTTP/2 disabled on the pooled transport | Closed decision. Do not re-enable — see `supabase_client.py` |
| `h2` advisory not patched | Unreachable; bumping would touch a deliberately closed transport decision |
| Reconciliation removes, never rewrites | Editing a model's sentence puts words in its mouth; a half-edited sentence reads worse than either version |
| Razorpay has no immediate plan change | Provider capability (`supports_immediate_plan_change: False`); downgrade is cancel → Free |
| Entitlements have a global off switch | `ENTITLEMENT_ENFORCEMENT=off` is the rollback lever if a quota misfires against real customers |

---

## 5. Razorpay Verification

**Verified deterministically against the real code:**

| Item | Result |
|---|---|
| Webhook signature — valid | ✅ |
| Tampered body / wrong secret / empty signature | ✅ All rejected |
| Header case-insensitivity | ✅ (ASGI, proxies and test clients disagree on case) |
| Parsed body refused | ✅ Raises rather than silently passing |
| Checkout callback signature | ✅ Correct `payment_id\|subscription_id` order |
| **Reversed order rejected** | ✅ The documented ordering trap (Orders vs Subscriptions) |
| Test/live mode detection | ✅ `rzp_test_` / `rzp_live_` / neither |
| Secret hygiene | ✅ `repr()` never leaks `key_secret` |
| Idempotency key from header | ✅ Not from payload — the envelope has no event id |
| **Duplicate delivery** | ✅ Same event id ×3 → **exactly 1 row** |
| **Replay protection** | ✅ New id, identical body → correctly a new event |
| Forged signature not recorded | ✅ No row created |
| Status codes as retry protocol | ✅ 200 terminal · 400 terminal (forgery never retried into existence) · 500 redeliver |
| Price agreement | ✅ Page ₹999/₹2,499 == `PUBLISHED_PRICE` |
| Entitlement gates | ✅ 6/6 return structured `402` |
| Boot integrity | ✅ Every active org has exactly one subscription |

Backed by **399 existing billing/entitlement tests**, covering upgrade (3), failed payment (18), duplicate (11), idempotency (17), entitlements (31), signature (16), webhook (32), cancel (28), grace period (66).

### ⛔ Blocked — needs configuration you must supply

`RAZORPAY_WEBHOOK_SECRET` is **empty** and neither plan is bound:

```
RAZORPAY_WEBHOOK_SECRET=<from the Razorpay dashboard → Webhooks>
RAZORPAY_PLAN_PLUS_INR=plan_xxxxxxxxxxxxxx   # ₹999
RAZORPAY_PLAN_PRO_INR=plan_xxxxxxxxxxxxxx    # ₹2,499
```

Until then: **checkout, successful payment, live webhook delivery, entitlement update from a real event, upgrade/downgrade and failed payment cannot be exercised.** `verify_bindings()` runs at boot and fails the deploy if a bound plan charges anything other than the advertised price — but only once the ids exist.

Completing a payment also requires you personally: I do not enter card details, even test numbers.

---

## 6. Risk Register

| # | Risk | Sev | Mitigation |
|---|---|---|---|
| R1 | Injected inline script (CSP can't block) | Med | React escaping holds; promote CSP to `enforce` after a production build validates it |
| R2 | Rate limits not distributed | Med | Add edge/WAF limits before horizontal scale-out |
| R3 | Razorpay live path unverified | Med | Supply the three values above, then re-run §5 |
| R4 | Interview latency 11.3 s | Low | Stream, or set expectations in the UI |
| R5 | Stale embeddings on provider change | Low | Boot check + `reindex_campaign` (verified working) |
| R6 | `h2` CVE becomes reachable | Low | Only if HTTP/2 is re-enabled — don't |
| R7 | Dev-only advisories reach prod via a build script | Low | Keep `jsdom`/`vitest` out of runtime paths |

---

## 7. Release Recommendation

# ✅ Production Ready — tag `v1.0.0`

Both blocking dependency risks from the previous report are closed: **zero production advisories on both tiers**, verified by a clean build, 1172 backend and 455 frontend tests.

Tag `v1.0.0` once the three Razorpay values are supplied and §5's live half passes. Until then the honest tag is **`v1.0.0-rc.1`** — everything except live payments is verified against real infrastructure, and payments are blocked by configuration rather than by a defect.

**Ship-blocking before taking real money:** R3 only.

---

## 8. Post-Freeze Rule

The backend is frozen. No features, no architecture changes, no refactors — production bugs, security issues and critical hotfixes only.

One coupling to remember: `app/services/reconciliation.py` guarantees the model cannot claim a fact is missing when the parser extracted it — but it can only catch what the parser produces. Improving extraction strengthens it; **degrading extraction silently weakens it with no test failure.** Any future parser change must be judged on that too.
