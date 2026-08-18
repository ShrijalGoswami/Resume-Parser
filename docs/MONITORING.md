# Monitoring

> What Hirevo emits, what to watch, and what should page someone. Running the
> system is [OPERATIONS.md](./OPERATIONS.md); getting it deployed is
> [DEPLOYMENT.md](./DEPLOYMENT.md).

No monitoring vendor is wired in. What follows is the signal inventory and the
alert set to configure in whatever you use — the platform log drain, Grafana,
Better Stack, Sentry. Every log string named below is pinned by
`backend/tests/test_production_logging.py`, because **an alert wired to a message
that has since been reworded is worse than no alert: it is silent, and it reads as
coverage.**

---

## 1. Logging

### Format

```
2026-07-26 21:19:19,731 | INFO  | deploy-audit-001 | app.access | 127.0.0.1 GET /health -> 200 in 2.6ms
                                   └─ request ID    └─ logger
```

Configured once in `app/core/observability.py`. The root handler carries a filter
that injects the request ID into **every** record, so a line emitted deep inside
the parser or the LLM stack is still attributable to a request.

`LOG_LEVEL` (default `INFO`) sets the root level. An unrecognised value falls back
to `INFO` — a typo in an env var must not silence the service, and must not stop
it booting.

### Request IDs

An inbound `X-Request-ID` is honoured so a trace can span the frontend proxy, this
API and the aggregator. It is accepted **only** if it matches
`^[A-Za-z0-9._-]{1,64}$`; anything else is replaced with a generated 12-hex-char
ID. Before that guard, a 300-character header was copied verbatim into every log
line for the request, and a caller could replay another request's ID and quietly
merge itself into that request's trace — precisely the data an investigation
depends on being trustworthy.

The ID is returned in the `X-Request-ID` response header, alongside
`X-Response-Time-ms`. When a user reports a problem, ask for the request ID.

### One line per request

`app.access` logs exactly one access line per request. `uvicorn.access` is
disabled: it logged a second line for every request — double the volume, and log
ingest is billed by volume — while carrying strictly less information (no request
ID, no duration). What was given up is the client's source port and the HTTP
version. If an investigation ever needs those, re-enable `uvicorn.access` rather
than adding a third access log.

### What is never logged

No API key, JWT, or service-role key is ever logged, and `/health` never reports
*with what* a dependency is configured — only that it is. Both are asserted by
test, not by convention.

---

## 2. Health checks

```
GET /health   → 200
```

Probe it from an **external** prober, not only the platform's own check. A platform
health check that passes while the platform's routing is broken is a common way to
be down and green at the same time.

The three dependency states are the deploy gate:

| Field | `configured` | `not_configured` means |
|---|---|---|
| `llm` | Groq key present | AI endpoints return 503; parsing still works |
| `persistence` | Supabase URL + anon key | **The entire authenticated product is dead** |
| `auth` | JWKS or HS256 secret reachable | Nobody can sign in |

`/health` returning 200 with `persistence: not_configured` is the single most
misleading state this service can be in. Alert on the field, not on the status
code.

---

## 3. Alerts

Ordered by what actually warrants waking someone.

### Page immediately

| Signal | Threshold | Why it pages |
|---|---|---|
| `/health` unreachable | 2 consecutive failures from an external prober | The service is down |
| `/health` reports any dependency `not_configured` | any occurrence | Down-but-green. Almost always a lost env var after a config change |
| 5xx rate | > 1% of requests over 5 min | Something is broken for real users |
| `audit_logs` write failures | any occurrence | A compliance gap that persists for as long as it lasts, and cannot be reconstructed afterwards |
| Cross-tenant suspicion (any report or anomaly) | any | Run the isolation suite immediately — it is the fastest authoritative answer |

### Alert during working hours

| Signal | Threshold | Why |
|---|---|---|
| **`"Scrubbed instruction-like content"`** | any occurrence | An attempted prompt injection in an uploaded résumé. The defences hold — this is intelligence, not an outage. Route it to **security**, never to the noise channel |
| **`"unevidenced matching_skills"`** | any occurrence | The model produced skill claims the résumé does not evidence. Same handling as above |
| `GET /api/v1/me` p95 | > 500 ms | The specific signal that JWKS verification has regressed to a per-request network call to Supabase Auth. It was a ~55% latency regression when this last happened |
| 401 rate | sudden spike | Token refresh or the auth configuration broke. A steady baseline is normal — unauthenticated probes hit public endpoints constantly |
| 429 rate concentrated on one client | sustained | Abuse. If it is spread evenly across *all* clients instead, suspect the limiter has collapsed onto one bucket — see below |
| Groq tokens/day | > 80% of the plan ceiling | The free tier is 100k/day. Running out disables AI mid-day |
| AI fallback / `degraded` result rate | > 5% | The primary provider is unhealthy |
| Storage object count vs candidate row count | divergence | Orphaned PII: résumés with no candidate row are invisible to the product and undeletable through it |
| Startup `ERROR` lines | any | Startup validation caught a misconfiguration |
| **`"org-context read failed"` with `failed_branches=4/4`** | **any occurrence** | The shared Supabase HTTP connection died mid-fan-out. Historically this meant HTTP/2 got re-enabled on the Supabase transport — a 19% failure rate presenting as intermittent 503s. Runbook: OPERATIONS §3.8, analysis: `docs/rca/UPLOAD_503.md` |
| `"org-context read failed"` with `failed_branches=1/4` | > 1% of org-context resolutions | A single query, RLS policy or table is failing. Read `query=` for which |
| `"postgrest.auth() failed"` | any occurrence | Clients silently downgraded to the anon key: every RLS-scoped read returns empty. Presents to users as "no organization" or a blank dashboard, **not** as an error |
| `RemoteProtocolError` / `ConnectionTerminated` anywhere in logs | any occurrence | Should be structurally impossible now. Its return means the transport configuration regressed |
| `"handshake operation timed out"` | any occurrence | The shared connection pool is not being reused, so every request pays a fresh TLS handshake |

### The rate-limiter trap

The in-process limiter keys on the client IP. Behind a TLS-terminating proxy,
`request.client.host` is the *proxy's* address for every request, so all traffic
shares one bucket and a single abusive client locks out everybody — the limiter
becoming a denial-of-service amplifier rather than a protection. Two things must
both hold:

- uvicorn started with `--proxy-headers --forwarded-allow-ips="*"`
- `TRUST_PROXY_HEADERS=true` — and **only** when a proxy that overwrites
  `X-Forwarded-For` is actually in front, or any caller can spoof a fresh bucket

**Symptom of getting it wrong: 429s spread evenly across unrelated clients.** That
is why the 429 alert distinguishes concentrated from diffuse.

The limiter also does not span replicas: with N replicas the effective limit is N×
the configured one. Put the real limit at the edge.

---

## 4. Latency

Track p50/p95/p99 per endpoint. Useful baselines:

| Endpoint class | Normal |
|---|---|
| `/health` | single-digit ms |
| Authenticated reads (`/api/v1/me`, roles, candidates) | tens of ms co-located; **~2 s per query if the backend and Supabase are in different regions** |
| Batch analysis | seconds to minutes, proportional to résumé count |
| Compare · interview · report | 8–14 s (LLM-bound; not a defect) |

Do not alert on absolute AI latency — it is dominated by the provider. Alert on
its *error and fallback* rate instead.

Org-context resolution issues four independent Supabase queries concurrently; in
the logs their timestamps land in the same millisecond. If they start appearing
sequentially, the fan-out has regressed.

Every org-context resolution logs `branch_ms=` (per query) and `fan_ms=` (the
whole fan-out) at DEBUG, and on failure at ERROR. Two shapes worth watching:

- **`fan_ms` ≈ the sum of the branches** rather than ≈ the slowest one — the
  fan-out is running sequentially.
- **`fan_ms` rising while `branch_ms` stays flat** — threads are queueing, not
  Supabase slowing down.

A sustained rise in *all* Supabase-backed latency, with no error-rate change, is
the signature of the connection pool not being reused (every request paying a
fresh TCP+TLS handshake). Sharing the pool roughly halved latency across the
board when it was introduced — 8-way concurrent `/org/context` p50 went 6102 ms →
1832 ms — so a regression here is large enough to see immediately.

---

## 5. Cost

**The AI endpoints are no longer anonymous** (RBAC sweep, 28–29 Jul 2026).
`/api/v1/batch-analysis`, `/ats-analysis`, `/match-analysis` and `/copilot/*` now
require a recruiter JWT plus `ai.use`. This section previously described them as
public, which materially misstated the risk.

What that changes: the exposure is no longer *anonymous* spend, so a WAF is no
longer the primary control. It is now **spend by authenticated members**, which
is attributable — every AI call rolls up to an organization. The abuse case that
remains is a compromised or over-permissioned account, not a passer-by.

Watch:

- Groq tokens/day against the plan ceiling (still the hard limit — 100k/day free)
- Spend per organization, and any single org diverging from its usual profile
- Request volume on those paths by **recruiter**, not just by client IP
- 429 rate on those paths (the in-process limiter engaging)
- `403` rate on AI paths — members repeatedly hitting `ai.use` denials suggests a
  role assignment that does not match how the team actually works

An edge rate limit is still worth having, but as defence in depth rather than the
control that stands between an anonymous caller and the LLM bill.

---

## 6. What is not instrumented

Stated plainly so nobody assumes coverage that does not exist:

- **No APM / distributed tracing.** Request IDs make correlation possible by hand;
  nothing stitches spans automatically.
- **No error aggregation service.** Unhandled exceptions are logged with full
  tracebacks and return a clean 500, but nothing groups or deduplicates them.
  Sentry would be the smallest useful addition here.
- **No metrics endpoint.** There is no `/metrics`; numbers come from log parsing
  and the platform's own dashboards.
- **No frontend error reporting.** Error boundaries render a recovery UI
  (`app/global-error.tsx` and per-group `error.tsx`), but nothing reports the
  error anywhere.
- **No uptime history.** Configure an external prober; the platform's own check
  is not an independent witness.

None of these block a pilot. All of them get harder to add after the first
incident rather than before.
