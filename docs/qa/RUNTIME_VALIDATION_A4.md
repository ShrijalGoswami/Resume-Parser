# Runtime Validation Report — A4 AI Reliability

> **Generated** by `backend/tests/test_ai_reliability.py`. Do not edit by hand — re-run the suite.

## 1. Environment

- **Environment:** `development`
- **Provider:** `groq` · model `openai/gpt-oss-120b`
- **Date/time:** 2026-08-17 12:08 UTC
- **Totals:** 7 PASS · 1 FAIL · 0 SKIPPED
- **Overall:** ❌ FAIL

## 2. Behavioral Validation — deterministic fault injection

_In-process fake providers drive the real orchestrator retry ladder. No network; fully deterministic. This is NOT a live provider test._

| Check | Result | Detail |
|---|---|---|
| Timeout retried up to max_network_retries | ✅ PASS | calls=3 |
| Backoff is applied between retries (not instant) | ✅ PASS | elapsed=0.094s |
| Transient rate-limit retried (1 + max_rate_limit_retries) | ✅ PASS | calls=3 |
| Quota exhaustion NOT retried (exactly 1 call) | ✅ PASS | calls=1 |
| Retry-After honored over backoff (waited ~retry_after, not base) | ✅ PASS | elapsed=0.047s, calls=2 |
| Recovers after transient failures (success on 3rd attempt) | ✅ PASS | calls=3 |
| Total added latency bounded by the delay cap | ✅ PASS | elapsed=0.157s (cap=100ms × 2 waits) |

## 3. Live Provider Validation — real Groq smoke

_One real call to Groq, proving the real provider path and no regression. Recorded SKIPPED (External Dependency) if Groq is unavailable — A4 is not failed because Groq is temporarily down._

| Check | Result | Detail |
|---|---|---|
| Live Groq smoke — real provider path | ❌ FAIL | empty response |

## 4. Failure classification

| Result | Check | Classification |
|---|---|---|
| FAIL | Live Groq smoke — real provider path | REQUIRES ROOT-CAUSE |

## 5. Release recommendation

❌ **Do not close A4.** 1 check(s) FAILED — stop for root-cause per protocol.

_A1 = tenant isolation · A6 = workflow · A2 = ledger immutability · A3 = résumé storage · A4 = AI reliability._
