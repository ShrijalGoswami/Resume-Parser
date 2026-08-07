"""
NVIDIA NIM embedding provider — the production embedding provider for V1.

Activated with `EMBEDDING_PROVIDER=nvidia` + `NVIDIA_API_KEY`. Talks to the NIM
OpenAI-compatible endpoint (`POST {base_url}/embeddings`) over `httpx`, which is
already a locked dependency — no vendor SDK is introduced.

WHY RAW HTTP AND NOT THE `openai` SDK
-------------------------------------
Two reasons, both concrete. The SDK discards response headers, and NIM reports
rate-limit state there (`x-ratelimit-*`, `Retry-After`) — the very signals the
orchestrator needs to distinguish a transient 429 from quota exhaustion. And NIM
requires `input_type`, which is not an OpenAI field and has to be smuggled
through `extra_body` anyway. Raw HTTP costs less than working around both.

THE DIMENSION IS DERIVED, NEVER DECLARED
----------------------------------------
`dimensions` starts at 0 and is set from `len(vector)` of the first successful
response, then cached for the process lifetime. The model determines its own
output width; a hardcoded constant here could only ever drift away from the
truth. `EMBEDDING_DIMENSIONS` is therefore NOT consulted by this provider — if
one is configured and disagrees with what the model actually returns, that is
logged loudly (see `_record_dimensions`) rather than silently accommodated.

RETRIEVAL IS ASYMMETRIC — `input_type` IS NOT OPTIONAL
------------------------------------------------------
NVIDIA retrieval models embed a QUERY and a PASSAGE into the same space using
different projections. Indexing a document with `input_type="query"` (or vice
versa) produces a vector that lands in the wrong part of the space: nothing
errors, similarity scores just quietly get worse. So the distinction is carried
explicitly — `passage` when indexing, `query` when searching — and defaults to
`passage`, because every bulk path in this app is indexing.

NO AUTOMATIC FALLBACK TO HASHING. Deliberate. A silent downgrade would write
`hashing`-shaped vectors into a store of Nemotron vectors, and
`vector_search.cosine_similarity` returns 0.0 on a length mismatch — so the
corruption would surface as "search quietly returns fewer results", the single
hardest failure of this kind to notice. A missing key must fail loudly instead.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

from app.ai.embeddings.base import EmbeddingProvider
from app.ai.utils.errors import (
    AIConfigError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)

logger = logging.getLogger("app.ai")

#: NIM's OpenAI-compatible base. Overridable for self-hosted NIM containers,
#: which expose the same contract on a different host.
DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1"

#: Verified present in the live NIM catalog on 2026-08-07 (99 models listed).
#: NOTE: `nvidia/nemotron-3-embed-1b-v2` does NOT exist — the `-v2` suffix
#: belongs to `nvidia/llama-nemotron-embed-1b-v2`, a different model.
DEFAULT_MODEL = "nvidia/nemotron-3-embed-1b"

#: Client-side chunk bound. This is NOT a documented API limit — NVIDIA does not
#: publish a batch maximum for this model, so rather than invent one this is a
#: conservative size chosen so a large reindex cannot be rejected wholesale.
#: `scripts/verify_nvidia_embeddings.py` reports whether larger batches are
#: accepted; raise it only on that evidence.
MAX_BATCH = 32

INPUT_TYPE_PASSAGE = "passage"
INPUT_TYPE_QUERY = "query"
_VALID_INPUT_TYPES = (INPUT_TYPE_PASSAGE, INPUT_TYPE_QUERY)

#: Response headers worth surfacing. Captured verbatim — this provider does not
#: assume which of them NIM actually sends; the verification script reports the
#: real set.
_INTERESTING_HEADER_PREFIXES = ("x-ratelimit", "ratelimit", "retry-after")


class NvidiaEmbeddingProvider(EmbeddingProvider):
    """NIM embeddings over the OpenAI-compatible `/embeddings` route."""

    name = "nvidia"
    #: Tells `embedding.service` this provider distinguishes query from passage.
    supports_input_type = True

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout_seconds: int = 30,
        configured_dimensions: int = 0,
    ):
        if not api_key:
            raise AIConfigError(
                "NVIDIA_API_KEY is required for the NVIDIA embedding provider. "
                "Set it, or select the offline provider with EMBEDDING_PROVIDER=hashing."
            )
        self._api_key = api_key
        self.model = model or DEFAULT_MODEL
        self._base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._timeout_seconds = timeout_seconds
        #: 0 until the first successful response teaches us the real width.
        self.dimensions = 0
        #: Only used to detect drift against a stale env value; never authoritative.
        self._configured_dimensions = configured_dimensions
        #: Diagnostics from the most recent call, for the verification script and
        #: for incident triage. Contains no request or response payload content.
        self.last_call: dict[str, Any] = {}

    # ── internals ────────────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        # The key is read here and nowhere else; it is never logged or repr'd.
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _record_dimensions(self, observed: int) -> None:
        """Latch the model's real output width, and complain about drift."""
        if observed <= 0:
            return
        if self.dimensions and self.dimensions != observed:
            # The model changed width mid-process. Vectors already written are a
            # different shape and will silently score 0.0 against new ones.
            logger.error(
                "NVIDIA embedding dimension CHANGED mid-process: %d -> %d (model=%s). "
                "Stored vectors are now inconsistent; a full reindex is required.",
                self.dimensions, observed, self.model,
            )
        elif not self.dimensions:
            logger.info(
                "NVIDIA embedding dimension observed from live response: %d (model=%s)",
                observed, self.model,
            )
            if self._configured_dimensions and self._configured_dimensions != observed:
                logger.warning(
                    "EMBEDDING_DIMENSIONS=%d disagrees with the model's actual output "
                    "(%d) for %s. The model is the source of truth; the configured "
                    "value is ignored for this provider and should be corrected or "
                    "removed to stop it drifting further.",
                    self._configured_dimensions, observed, self.model,
                )
        self.dimensions = observed

    def _raise_for_status(self, resp: Any) -> None:
        """Map NIM HTTP failures onto the app's AI error hierarchy."""
        status = resp.status_code
        if status < 400:
            return

        # Body text is kept for the operator but never surfaced to end users —
        # AIError.public_message is what reaches the frontend.
        detail = (resp.text or "")[:500]

        if status in (401, 403):
            raise AIConfigError(
                f"NVIDIA rejected the credential (HTTP {status}). Check NVIDIA_API_KEY. {detail}"
            )
        if status == 429:
            retry_after = resp.headers.get("retry-after")
            try:
                retry_seconds = float(retry_after) if retry_after else None
            except (TypeError, ValueError):
                retry_seconds = None
            # Quota vs per-minute throttle changes whether retrying is sane. NIM
            # does not expose a machine-readable discriminator, so this reads the
            # body rather than guessing a default — and an unrecognised 429 is
            # treated as transient, which is the recoverable assumption.
            is_quota = any(w in detail.lower() for w in ("quota", "credit", "exceeded your"))
            raise AIRateLimitError(
                f"NVIDIA rate-limited the embedding request (HTTP 429). {detail}",
                retry_after=retry_seconds,
                is_quota=is_quota,
            )
        if status >= 500:
            raise AIProviderError(f"NVIDIA embedding endpoint failed (HTTP {status}). {detail}")
        # 400/404/422 — a request this code built was refused. Surfacing the raw
        # body verbatim is the point: it names the offending field, which is the
        # only thing that makes an unfamiliar API contract debuggable.
        raise AIProviderError(
            f"NVIDIA refused the embedding request (HTTP {status}) for model "
            f"{self.model!r}. Response: {detail}"
        )

    def _post_batch(self, texts: list[str], input_type: str) -> list[list[float]]:
        try:
            import httpx  # locked dependency; imported lazily to match sibling providers
        except ImportError as exc:  # pragma: no cover
            raise AIConfigError("The 'httpx' package is not installed.") from exc

        payload = {
            "model": self.model,
            "input": texts,
            "input_type": input_type,
            "encoding_format": "float",
        }

        started = time.time()
        try:
            resp = httpx.post(
                f"{self._base_url}/embeddings",
                json=payload,
                headers=self._headers(),
                timeout=self._timeout_seconds,
            )
        except Exception as exc:
            # httpx.TimeoutException subclasses vary by version; match by name so
            # a timeout is classified as retryable rather than a generic failure.
            if "timeout" in type(exc).__name__.lower():
                raise AITimeoutError(
                    f"NVIDIA embedding request timed out after {self._timeout_seconds}s."
                ) from exc
            raise AIProviderError(f"NVIDIA embedding request failed: {exc}") from exc
        latency_ms = round((time.time() - started) * 1000)

        self._raise_for_status(resp)

        try:
            body = resp.json()
        except Exception as exc:
            raise AIProviderError(f"NVIDIA returned a non-JSON embedding response: {exc}") from exc

        data = body.get("data")
        if not isinstance(data, list) or not data:
            raise AIProviderError(
                f"NVIDIA embedding response had no 'data' array. Keys present: {sorted(body)}"
            )

        # Order is by the `index` field, not arrival order — the caller's Nth text
        # must map to the Nth vector or every embedding is attributed to the wrong
        # candidate. Entries without an index keep their position.
        indexed = sorted(data, key=lambda d: d.get("index", 0) if isinstance(d, dict) else 0)
        vectors: list[list[float]] = []
        for item in indexed:
            vec = item.get("embedding") if isinstance(item, dict) else None
            if not isinstance(vec, list) or not vec:
                raise AIProviderError(
                    "NVIDIA embedding response contained an entry without a usable "
                    f"'embedding' array (entry keys: {sorted(item) if isinstance(item, dict) else type(item).__name__})."
                )
            vectors.append([float(x) for x in vec])

        if len(vectors) != len(texts):
            raise AIProviderError(
                f"NVIDIA returned {len(vectors)} vectors for {len(texts)} inputs; "
                "refusing to guess which text each belongs to."
            )

        self._record_dimensions(len(vectors[0]))

        # `usage` is optional in the OpenAI contract; recorded when present rather
        # than assumed. Same for the rate-limit headers.
        self.last_call = {
            "latency_ms": latency_ms,
            "batch_size": len(texts),
            "input_type": input_type,
            "dimensions": len(vectors[0]),
            "usage": body.get("usage"),
            "response_keys": sorted(body),
            "entry_keys": sorted(indexed[0]) if isinstance(indexed[0], dict) else [],
            "rate_limit_headers": {
                k: v for k, v in resp.headers.items()
                if k.lower().startswith(_INTERESTING_HEADER_PREFIXES)
            },
        }
        return vectors

    # ── EmbeddingProvider ────────────────────────────────────────────────────

    def embed(self, texts: list[str], *, input_type: Optional[str] = None) -> list[list[float]]:
        """Embed a batch. `input_type` defaults to `passage` (the indexing path)."""
        if not texts:
            return []
        it = (input_type or INPUT_TYPE_PASSAGE).lower()
        if it not in _VALID_INPUT_TYPES:
            raise AIConfigError(
                f"input_type must be one of {_VALID_INPUT_TYPES}, got {input_type!r}."
            )

        out: list[list[float]] = []
        for start in range(0, len(texts), MAX_BATCH):
            out.extend(self._post_batch(texts[start:start + MAX_BATCH], it))
        return out
