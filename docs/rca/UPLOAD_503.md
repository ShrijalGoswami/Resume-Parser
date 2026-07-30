# RCA — résumé upload returns 503 "Organization lookup failed."

**Status:** Root cause found and fixed. Verified live.
**Date:** 29 Jul 2026
**Supersedes:** HANDOFF §3.4 (which recorded this as OPEN, and its two hypotheses
as unproven).

---

## 1. Summary

`resolve_org_context` fans four organization reads across four threads that share
one Supabase client. postgrest-py builds its `httpx.Client` with **`http2=True`**,
so all four requests multiplex onto a **single TCP connection** — and httpcore's
*synchronous* HTTP/2 connection cannot be driven from several threads at once.
The threads corrupt the connection's shared protocol state, Supabase responds
`GOAWAY`, and **every** in-flight request on that connection dies together. The
handler converted the resulting exception into a bare
`503 "Organization lookup failed."` and discarded it unlogged.

Measured failure rate of the exact pattern the app used: **19%** per fan-out
(30 failures / 160 reads).

The fix disables HTTP/2 for Supabase clients and shares one pooled HTTP/1.1
transport process-wide. The four-way concurrency — a deliberate optimisation — is
kept intact.

---

## 2. The questions that were asked, answered

| Question | Answer |
|---|---|
| **Is the failure reproducible?** | **Yes — trivially.** It reproduced on the *first* request of the harness. |
| **Does it only occur under concurrent uploads?** | **No.** This was the wrong lead. The concurrency is *inside a single request*, not between requests: every request that resolves org context races four threads. Sequential uploads failed too. |
| **Is the shared Supabase client thread-safe?** | **No — not over HTTP/2**, which is how the SDK builds it. Over HTTP/1.1 it is: 160/160 clean. |
| **Which exception is being swallowed?** | `httpx.RemoteProtocolError: <ConnectionTerminated error_code:1, last_stream_id:7>`, wrapping `httpcore.RemoteProtocolError`. Also seen: `error_code:9`. |
| **Why is the exception swallowed?** | `raise HTTPException(...) from exc` sets `__cause__` but nothing ever logs it. FastAPI renders only `detail`, so the cause was discarded at the point of failure. |

### Why "concurrent uploads" looked like the trigger

It is a genuine amplifier, not the cause. Each upload builds **four** Supabase
clients (candidate repo, storage, activity repo, org context), and the org-context
one fans out four ways. More requests in flight means more thread contention on
each connection, so the per-request race fires more often. But a single request
alone is already enough — which is why it also explained the intermittent
`/org/context` 503s from §3.3, and why `test_resume_storage` passing 5/5 in
isolation never cleared it: five sequential requests at a 19% per-request failure
rate all pass about 35% of the time.

---

## 3. The mechanism

HTTP/2 carries many concurrent *streams* over one TCP connection, with two pieces
of **mutable per-connection state**: a monotonic stream-ID counter and the HPACK
header-compression dynamic table. httpcore's sync implementation does not hold
these safely across threads:

* Two threads allocate stream IDs in one order and write their `HEADERS` frames in
  the other. Non-monotonic stream IDs are a protocol violation →
  **`GOAWAY(error_code:1, PROTOCOL_ERROR)`**.
* Two threads encode headers concurrently against the shared HPACK dynamic table
  and desynchronise it from the server's copy →
  **`GOAWAY(error_code:9, COMPRESSION_ERROR)`**.

Both were observed. Because the failure is at the *connection* layer, all four
branches die at once — the log line records `failed_branches=4/4`, which is what
distinguishes a transport fault from a query or RLS fault.

`last_stream_id:7` = streams 1, 3, 5, 7 — exactly the four fan-out queries.

---

## 4. Evidence

### 4.1 The log line that broke it open

Nothing was diagnosable until the swallowed exception was logged. First run after
adding it:

```
ERROR | app.enterprise.context | org-context read failed | query=org
  org=7b6a32a0-… recruiter=d0a6a678-… thread=AnyIO worker thread
  failed_branches=4/4 branch_ms=org=69ms member=65ms sub=62ms flags=24ms
  fan_ms=70.5
  exc=httpx.RemoteProtocolError: <ConnectionTerminated error_code:1,
      last_stream_id:7> <- httpcore.RemoteProtocolError: …
  …
  File "httpcore/_sync/http2.py", line 355, in _receive_events
    raise RemoteProtocolError(self._connection_terminated)
```

`_sync/http2.py` in the traceback is the whole diagnosis: this is the HTTP/2 path.

### 4.2 Isolating the variable

Four combinations, 40 trials × 4 reads each, against the live project. Only one
fails, and it is the one the application used:

| # | Client | Requests | Transport | Result |
|---|---|---|---|---|
| **A** | **shared** | **concurrent** | **HTTP/2** | **130/160 — 19% failure** |
| B | shared | sequential | HTTP/2 | 160/160 clean |
| C | per-thread | concurrent | HTTP/2 | 160/160 clean |
| D | shared | concurrent | HTTP/1.1 | 160/160 clean |

B and C isolate it to *sharing under concurrency*; D isolates it to *HTTP/2*
specifically, and is the fix.

---

## 5. The fix

**`app/db/supabase_client.py`** — supply the transport instead of letting each
SDK sub-client build its own:

1. **`http2=False`.** The root-cause fix. Over HTTP/1.1 httpx gives each
   concurrent request its own connection from the pool, so the fan-out still runs
   genuinely in parallel — only the unsafe transport is given up, not the
   optimisation.
2. **One pooled transport, process-wide** (`@lru_cache`), borrowed by every
   client's postgrest/storage/auth services.
3. **Sub-clients materialised eagerly** in `get_user_client`. `Client.postgrest`
   and `Client.storage` are lazily-initialised properties with no lock; touching
   them on the constructing thread removes a second latent race before the client
   is ever handed to a pool.

### 5.1 Why sharing the transport is safe

It carries no per-user state. postgrest and storage3 keep `Authorization` on
their **own** header dicts and attach it to each individual request
(`SyncRequestBuilder(session, path, headers, auth)` — verified in the installed
2.31.0 source); the httpx client is used purely as a connection pool.

This is load-bearing enough to be tested, not asserted:
**`tests/test_supabase_transport.py`** — T1 pins HTTP/2 off, T2 drives two users
over one shared pool through a mock transport and asserts each request carried
only its own token. The live `test_tenant_isolation` suite also passes 25/25
unchanged.

### 5.2 The second failure, uncovered by fixing the first

With multiplexing gone, per-request connection *churn* became the next
bottleneck: each request built ~4 clients, each with its own httpx client, each
paying a fresh TCP+TLS handshake, and none were ever closed. A sustained
concurrent run produced `_ssl.c:989: The handshake operation timed out` (one 502
in 48 uploads). Sharing the pool (fix #2) removed it — and roughly halved latency
across the board, because this is also the root of the known 2.5–8s
`/org/context` complaint:

| Phase | Per-request transports | Shared pool |
|---|---|---|
| 8 sequential uploads (p50) | 2855 ms | **1116 ms** |
| 8 concurrent uploads (p50) | 14279 ms | **6187 ms** |
| 8 concurrent `/org/context` (p50) | 6102 ms | **1832 ms** |
| 6 × 8 sustained uploads (p50) | 11395 ms | **5788 ms** |
| sustained failures | 1 × 502 | **0** |

---

## 5.3 Every other place a Supabase client is used

A full audit of the call sites, because the fan-out was not the only one exposed.

| Site | Client | Shared across threads? | Verdict |
|---|---|---|---|
| `enterprise/context.py` — the four-way fan-out | user | **Yes, explicitly** | The reported fault. Fixed. |
| `get_service_client()` — `enterprise/repositories.py`, `integrations/repositories.py`, `knowledge/store.py`, `services/prediction_service.py` | service | **Yes — process-wide singleton** | **Latent instance of the same bug, wider blast radius.** Fixed by the same change. See below. |
| `core/deps.py` — per-request repositories | user | No — one client per dependency, one thread | Safe. Still four clients per upload. |
| `core/auth.py::_decode_remote` | user | No | Safe |
| `routes/org.py`, `routes/account.py` | user | No | Safe |
| `scripts/dr_drill.py`, `scripts/backup_restore.py` | service | Single-threaded scripts | Safe |
| `services/batch_service.py` — `asyncio.gather` over `run_in_threadpool` | — | Genuinely concurrent, but touches no Supabase client | N/A |

**The service client deserved more attention than the fan-out did.** It is an
`@lru_cache(maxsize=1)` singleton, so *one* client serves the whole process — and
almost every endpoint in `routes/integrations.py`, `routes/knowledge.py`,
`routes/prediction.py` and `routes/agent.py` calls
`run_in_threadpool(SomeRepository(org_id).method)`, where the repository holds
that singleton. AnyIO's worker pool is **40 threads** by default. So the same
unsafe pattern existed with up to 40 concurrent threads on one connection rather
than 4, across the integrations, knowledge, prediction and agent surfaces.

It had not been reported failing, most likely because those endpoints see far
less concurrent traffic than upload does. It would have. Both factories now take
the shared HTTP/1.1 transport, so this is closed too — and
`tests/test_supabase_transport.py::T3` asserts the service client specifically.

**No other HTTP/2 client exists anywhere.** A scan of the entire installed
dependency tree for `http2=True` returns only the Supabase SDK family
(postgrest, storage3, supabase-auth, supabase-functions). The application itself
constructs no other `httpx.Client`. All four SDK sub-clients accept and now use
the shared transport.

---

## 5.4 Resource management

| Concern | State |
|---|---|
| **Transport lifecycle** | Built once at startup via `init_transport()` in the app lifespan, closed by `close_transport()` on shutdown. Previously: built per request, never closed. |
| **Construction race** | Double-checked locking, deliberately **not** `lru_cache` — `lru_cache` does not hold its lock across a miss, so two threads racing the first request would each build a client and silently drop one unclosed. |
| **Connection pooling** | `max_connections=100`, `max_keepalive_connections=100`. The keepalive number is the load-bearing one: httpx's default retires all but 20 idle connections, which for a pool serving every tenant would reintroduce handshake churn. |
| **Cleanup on shutdown** | `close_transport()` closes the pool *and* clears the `get_service_client` cache, which would otherwise hand out a client whose pool is shut. |
| **Thread safety** | `httpx.Client` over HTTP/1.1 is thread-safe (measured: 160/160 concurrent reads clean). The lazy `Client.postgrest` / `Client.storage` properties have no lock, so `get_user_client` materialises both on the constructing thread before the client can reach a pool. |
| **Memory** | Per-request clients sit in a reference cycle (`client → auth → subscription → bound method → client`), so they outlive refcounting — measured: 8 of 20 survived until `gc.collect()`, then all 20 were reclaimed. **Bounded garbage, not a leak.** It also got materially cheaper: those cycles no longer own httpx clients, so they hold no sockets. Measured pool connections held by dead clients: **0**. |

---

## 6. Diagnosability

The reason this sat open is that a 503 left no trace of what threw. Fixed at
three swallow points:

* **`resolve_org_context`** — each branch is now timed and attributed
  individually. Reading the futures in a fixed order meant a failure was reported
  as "something in the fan-out threw", with no way to tell which query, nor
  whether the others had also failed. That distinction *is* the diagnosis: one
  failing branch is a query/RLS problem, 4/4 is the shared connection.
* **`get_user_client`** — a failed `postgrest.auth()` silently downgraded the
  client to the anon key, making every RLS-scoped read return empty. That
  surfaces as "no organization" or a blank dashboard, nowhere near the cause.
* **`org_id_for`** — returned `None` on any exception, making a lookup failure
  indistinguishable from an account genuinely having no org.

Fan-out threads also now run inside a copy of the request's `contextvars`, so
their log lines carry the request ID instead of `-` and can be correlated.
(Copies are taken per branch, on the calling thread: a `Context` cannot be
entered by two threads at once, and one shared copy makes three of four branches
fail with `cannot enter context` — which is exactly what the first draft of this
instrumentation did.)

---

## 6.1 Regression guards

Offline, no network, no credentials. Each was verified by **mutation** — the
guarded change was reverted and the suite confirmed to fail:

| Mutation applied | Caught by |
|---|---|
| `http2=True` | `test_supabase_transport::T1` |
| `httpx_client=_transport()` dropped from either factory | `test_supabase_transport::T3` |
| Fan-out reverted to the previous implementation | `test_org_context_fanout::F2` |
| Fan-out made sequential | `test_org_context_fanout::F1` |
| One `Context` shared across branches | `test_org_context_fanout::F3` |

All five reverts were caught. A guard that has never been seen to fail is not a
guard.

`test_supabase_transport::T2` additionally drives two users over one shared pool
through a mock transport and asserts each request carried only its own token —
the property that makes sharing safe at all.

---

## 7. Verification

`tests/test_upload_concurrency.py` — gated behind the same
`HL_ALLOW_DESTRUCTIVE_TESTS=1` preflight as the other live suites.

```
python -m tests.test_upload_concurrency        # HL_UPLOAD_N, HL_UPLOAD_ROUNDS
```

**Before the fix:** failed on request #1 — `503 Organization lookup failed.`

**After** (two runs, 8×6 and 12×10):

```
  PASS  P1 sequential uploads              20/20
  PASS  P2 concurrent uploads              20/20
  PASS  P3 concurrent /org/context         20/20
  PASS  P4 sustained                      168/168
```

**208 uploads and 20 `/org/context` reads, 0 failures.** Server log over all 231
requests: 0 org-context failures, 0 `RemoteProtocolError`, 0 handshake timeouts,
0 5xx.

Regression suites, unchanged and passing against the patched server:
`test_resume_storage` 5/5, `test_tenant_isolation` 25 pass / 1 skipped.

---

## 7.1 Post-hardening re-verification

Re-run after the hardening pass (startup warm-up, shutdown close, locked
construction, service-client coverage), two full soaks of 12-way × 10 rounds:

* **264 uploads, 0 failures.** 315 requests logged: **0** org-context failures,
  **0** `RemoteProtocolError`, **0** `ConnectionTerminated`, **0** handshake
  timeouts, **0** 5xx, **0** ERROR lines of any kind.
* `test_resume_storage` 5/5, `test_tenant_isolation` 25 pass / 1 skipped,
  offline guards 8/8.
* Startup log confirms `Supabase HTTP transport initialized (HTTP/1.1, pooled).`

**On latency measurement.** The concurrent phases are too noisy to compare
run-to-run — `/org/context` p50 came in at 2868 / 3898 / 8097 ms across three
identical runs, dominated by live internet round-trips to hosted Supabase. Only
the **sequential** phase isolates per-request overhead, and it is stable:

| | Per-request transports | Shared pool | After hardening |
|---|---|---|---|
| Sequential upload p50 | 2855 ms | 1069–1116 ms | 1152 / 1284 ms |

No per-request regression from the hardening pass. Do not read the concurrent
numbers as a trend without many more samples.

---

## 8. Still open

* **Latency under sustained concurrency degrades**, even though nothing fails:
  the 12-way run drifted from ~8s to ~15.5s p50 by round 10. Not the same fault —
  no errors, no protocol failures. The likely shape is that an upload makes many
  *serial* Supabase round-trips and every persistence dependency is a sync `def`,
  so each request occupies an AnyIO worker thread (40 by default) for its whole
  duration. Worth its own measurement pass.
* **Supabase clients are still built per request** (four per upload). Now cheap —
  they share the pool and open no sockets on construction — but `Client.__init__`
  still constructs auth and realtime objects each time, and each lands in a
  reference cycle that waits for the cyclic GC (§5.4). Bounded, measured, and not
  worth restructuring the dependency graph for today.
* **`current_org_id.set()` inside `resolve_org_context` does not propagate.** The
  dependency runs in an AnyIO worker thread, which gets a *copy* of the request
  context; mutations do not flow back to the handler. Anything downstream reading
  `current_org_id` for usage attribution or org memory sees `None`. Pre-existing,
  unrelated to the 503, but found while instrumenting — worth its own fix.
