"""
One-shot LIVE verification of the NVIDIA NIM embedding provider.

Run this in the environment that HAS `NVIDIA_API_KEY` (it is read through the
normal `Settings` path, so `backend/.env.local` is picked up automatically):

    cd backend
    python -m scripts.verify_nvidia_embeddings

It makes real API calls and records the facts that cannot be known without
them — the ones the provider deliberately does not hardcode:

  * the model's ACTUAL embedding dimension
  * the real response shape (top-level keys, per-entry keys)
  * latency, per call
  * token usage, if NIM reports it
  * rate-limit headers, if NIM sends them
  * whether query/passage embeddings genuinely differ (asymmetry check)
  * whether the same input embeds deterministically

Nothing is asserted about the response beyond "there is a usable vector" —
everything else is REPORTED, so an unexpected contract shows up as data rather
than as a crash or, worse, a silently wrong assumption.

The key is never printed. Exit code is 0 on success, 1 on failure.
"""

from __future__ import annotations

import json
import sys

# Import through the app so configuration is resolved exactly as it is at runtime.
from app.ai.embeddings.nvidia_provider import DEFAULT_MODEL, NvidiaEmbeddingProvider
from app.core.config import settings

PASSAGES = [
    "Senior backend engineer with eight years of Python and FastAPI experience, "
    "building high-throughput payment services on PostgreSQL and Redis.",
    "Registered nurse specialising in paediatric intensive care, ACLS certified, "
    "twelve years across two teaching hospitals.",
]
QUERY = "experienced FastAPI backend developer"


def _line(title: str) -> None:
    print(f"\n{'=' * 72}\n{title}\n{'=' * 72}")


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0


def main() -> int:
    key = settings.NVIDIA_API_KEY
    if not key:
        print(
            "FAIL: NVIDIA_API_KEY is not set in this environment.\n"
            "      Add it to backend/.env.local (gitignored) and re-run.",
            file=sys.stderr,
        )
        return 1

    model = settings.EMBEDDING_MODEL
    if model in ("", "hashing-v1"):
        model = DEFAULT_MODEL

    print(f"key loaded: yes (length {len(key)}, value not shown)")
    print(f"model     : {model}")
    print(f"provider  : EMBEDDING_PROVIDER={settings.EMBEDDING_PROVIDER}")
    print(f"configured EMBEDDING_DIMENSIONS: {settings.EMBEDDING_DIMENSIONS}")

    provider = NvidiaEmbeddingProvider(api_key=key, model=model)

    # ── 1. Passage embedding — the indexing path ────────────────────────────
    _line("1. PASSAGE embedding (indexing path)")
    passage_vecs = provider.embed(PASSAGES, input_type="passage")
    meta = dict(provider.last_call)
    print(f"inputs                 : {len(PASSAGES)}")
    print(f"vectors returned       : {len(passage_vecs)}")
    print(f"MEASURED DIMENSION     : {meta.get('dimensions')}   <-- source of truth")
    print(f"provider.dimensions    : {provider.dimensions}")
    print(f"latency                : {meta.get('latency_ms')} ms")
    print(f"response top-level keys: {meta.get('response_keys')}")
    print(f"per-entry keys         : {meta.get('entry_keys')}")
    print(f"usage                  : {json.dumps(meta.get('usage'))}")
    print(f"rate-limit headers     : {json.dumps(meta.get('rate_limit_headers'), indent=2)}")
    first = passage_vecs[0]
    print(f"vector sample (first 6): {[round(x, 6) for x in first[:6]]}")
    print(f"L2 norm of vector 0    : {sum(x * x for x in first) ** 0.5:.6f}")

    # ── 2. Query embedding — the search path ────────────────────────────────
    _line("2. QUERY embedding (search path)")
    query_vec = provider.embed([QUERY], input_type="query")[0]
    qmeta = dict(provider.last_call)
    print(f"MEASURED DIMENSION     : {qmeta.get('dimensions')}")
    print(f"latency                : {qmeta.get('latency_ms')} ms")
    print(f"usage                  : {json.dumps(qmeta.get('usage'))}")
    if len(query_vec) != len(first):
        print("WARNING: query and passage dimensions DIFFER — retrieval cannot work.")

    # ── 3. Does input_type actually change the vector? ──────────────────────
    _line("3. ASYMMETRY CHECK (is input_type meaningful?)")
    as_passage = provider.embed([QUERY], input_type="passage")[0]
    sim = _cosine(query_vec, as_passage)
    print(f"cosine(query-tagged, passage-tagged) for identical text: {sim:.6f}")
    print(
        "  ~1.0 => the model ignores input_type (symmetric)\n"
        "  <1.0 => asymmetric; tagging matters and the wiring is correct"
    )

    # ── 4. Determinism ──────────────────────────────────────────────────────
    _line("4. DETERMINISM (same input twice)")
    again = provider.embed([PASSAGES[0]], input_type="passage")[0]
    identical = again == passage_vecs[0]
    print(f"byte-identical : {identical}")
    print(f"cosine         : {_cosine(again, passage_vecs[0]):.9f}")
    if not identical:
        print("  NOTE: not bit-identical. Content-hash caching still works (it hashes")
        print("        the TEXT, not the vector), but exact-match vector tests must")
        print("        compare with a tolerance rather than equality.")

    # ── 5. Semantic sanity ──────────────────────────────────────────────────
    _line("5. SEMANTIC SANITY (does the space mean anything?)")
    s_rel = _cosine(query_vec, passage_vecs[0])
    s_irr = _cosine(query_vec, passage_vecs[1])
    print(f"query vs BACKEND ENGINEER passage : {s_rel:.6f}")
    print(f"query vs PAEDIATRIC NURSE passage : {s_irr:.6f}")
    print(f"margin                            : {s_rel - s_irr:+.6f}")
    print("PASS" if s_rel > s_irr else "FAIL: irrelevant passage ranked higher")

    # ── 6. Summary ──────────────────────────────────────────────────────────
    _line("6. SUMMARY — values to record")
    print(f"EMBEDDING_MODEL      = {model}")
    print(f"MEASURED DIMENSION   = {provider.dimensions}")
    if settings.EMBEDDING_DIMENSIONS != provider.dimensions:
        print(
            f"NOTE: EMBEDDING_DIMENSIONS={settings.EMBEDDING_DIMENSIONS} does not match the "
            f"measured {provider.dimensions}. The model is authoritative; the env value is "
            "ignored by this provider."
        )
    return 0 if s_rel > s_irr else 1


if __name__ == "__main__":
    raise SystemExit(main())
