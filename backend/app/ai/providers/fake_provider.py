"""
Fake provider — a real implementation of `LLMProvider`, backed by a script.

THIS IS PERMANENT ARCHITECTURE, NOT TEST SCAFFOLDING
----------------------------------------------------
It is a first-class provider used for deterministic evaluation, maintained to
the same standard as Groq, OpenAI, Gemini, Anthropic, OpenRouter and any local
model — all of which satisfy **exactly the same contract this file does**.

It is also the contract's **reference implementation** (§9A rule 12). Judge a
new provider against this file, never against Groq: Groq is one vendor's
behaviour the codebase happened to grow around, while this is the contract
stated deliberately.

If a future provider cannot be implemented without changing `LLMProvider`, and
this file could not support that change, **review the interface first** — the
change is almost certainly a vendor-specific abstraction wearing a general name.
Either the contract genuinely needs to grow, in which case this file grows with
it in the same commit, or the provider adapts. Weakening the fake to accommodate
a vendor is how provider-specific abstraction creeps back in.

WHY IT LIVES HERE, NEXT TO THE REAL ONES
----------------------------------------
§9A rule 3 says a provider is "a subclass plus a registry entry". If the fake
lived in `tests/`, or behind a flag in the orchestrator, it would be a special
case — and a port whose only implementations are real ones is a port nobody has
ever proven. `app/billing/providers/fake.py` is the precedent this follows:
*"the entire domain is testable with no credentials and no network. If this file
could not exist, the port would be decorative."*

Setting `AI_PROVIDER=fake` therefore exercises the **entire production path** —
gateway → health → per-provider config → retry ladder → provider → usage
tracker — with no key, no network and no special-casing anywhere upstream. That
is the point. Nothing else in the codebase learns that this provider exists.

DETERMINISM
-----------
The response is keyed on a fingerprint of `system + user`. The same prompt
always produces the same response, which is what makes an evaluation run
repeatable and a regression real rather than noise.

There is exactly **one deliberate exception**: a *scripted sequence* (see
`FakeScript.script`). Exercising the retry ladder requires successive calls with
the same prompt to differ — that is what a retry IS — so sequences are opt-in,
explicit, and never the default.

PRODUCTION SAFETY
-----------------
Selecting this provider in production raises. A fake that silently answers real
customers is a worse failure than an outage: the product would look like it was
working. §5A already forbids a fake provider in production billing paths; the
same reasoning applies with more force to a hiring decision.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import threading
import time
from dataclasses import dataclass, field, replace
from typing import Any, Callable, Optional

from app.ai.gateway.roles import ModelRole
from app.ai.providers.base import LLMProvider
from app.ai.schemas.base import ProviderResponse, TokenUsage
from app.ai.utils.json import JSON_REPAIR_INSTRUCTION
from app.ai.utils.errors import (
    AIConfigError,
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

#: The single model this provider serves. Registered in the model registry with
#: NO pricing, so cost estimation correctly reports "unknown" rather than zero.
FAKE_MODEL = "fake-deterministic-v1"


class Behaviour:
    """Selectable behaviours. Strings, so they can come from an env var."""

    SUCCESS = "success"
    INVALID_JSON = "invalid_json"        # answered, but not JSON  → AIParseError
    SCHEMA_MISMATCH = "schema_mismatch"  # valid JSON, wrong shape → AIValidationError
    EMPTY = "empty"                      # answered with nothing   → AIParseError
    UNICODE_EDGE = "unicode_edge"        # valid JSON, awkward text (see note below)
    TIMEOUT = "timeout"                  # → AITimeoutError
    RATE_LIMIT = "rate_limit"            # transient 429 → retried
    QUOTA = "quota"                      # daily quota   → NOT retried
    PROVIDER_ERROR = "provider_error"    # → AIProviderError
    CONFIG_ERROR = "config_error"        # → AIConfigError (non-retryable, triggers fallback)

    ALL = (SUCCESS, INVALID_JSON, SCHEMA_MISMATCH, EMPTY, UNICODE_EDGE,
           TIMEOUT, RATE_LIMIT, QUOTA, PROVIDER_ERROR, CONFIG_ERROR)


@dataclass(frozen=True)
class FakeBehaviour:
    """One scripted outcome.

    NOTE ON "INVALID UTF-8": there is deliberately no such behaviour. The port's
    contract is `ProviderResponse.text: str` — a decoded Python string — so an
    undecodable byte sequence cannot exist at this seam by construction; a real
    provider's SDK fails or replaces it before we ever see it. Faking one would
    require lying about the type. `UNICODE_EDGE` covers what IS representable and
    does break naive handling: emoji, RTL marks, combining characters and a
    zero-width joiner.
    """

    kind: str = Behaviour.SUCCESS
    #: Explicit response body for SUCCESS. When None, a registered response for
    #: the prompt fingerprint is used; if there is none either, the provider
    #: returns a deterministic object that will NOT match a caller's schema —
    #: loudly, rather than inventing a plausible answer (§9A rule 9).
    payload: Optional[dict] = None
    #: Simulated latency. Applied through an injectable sleeper so tests stay
    #: free of wall-clock dependence.
    latency_ms: int = 0
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    message: str = ""
    retry_after: Optional[float] = None

    def __post_init__(self) -> None:
        if self.kind not in Behaviour.ALL:
            raise AIConfigError(
                f"Unknown fake behaviour '{self.kind}'. Known: {', '.join(Behaviour.ALL)}."
            )


class FakeScript:
    """The configuration surface. Thread-safe, resettable, process-local.

    Behaviours are selected here or through `AI_FAKE_*` settings — never by
    editing the provider. Adding a case to the golden dataset, or a failure mode
    to a test, must never require touching `fake_provider.py`.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._default: Optional[FakeBehaviour] = None
        self._responses: dict[str, dict] = {}
        self._sequences: dict[str, list[FakeBehaviour]] = {}
        self._calls: list[dict[str, Any]] = []

    # -- configuration --------------------------------------------------------
    def set_default(self, behaviour: FakeBehaviour) -> None:
        with self._lock:
            self._default = behaviour

    def register_response(self, fingerprint: str, payload: dict) -> None:
        """Bind a canned SUCCESS payload to a prompt fingerprint.

        This is how the golden dataset supplies a schema-valid answer without the
        provider ever knowing what a schema is: the dataset renders the same
        prompt the orchestrator will render, and registers its expected output
        against that fingerprint.
        """
        with self._lock:
            self._responses[fingerprint] = payload

    def script(self, fingerprint: str, behaviours: list[FakeBehaviour]) -> None:
        """Queue behaviours for successive calls with the same prompt.

        The last entry repeats once the queue drains, so a script of
        `[timeout, success]` means "fail once, then succeed forever" rather than
        "fail once, succeed once, then explode".
        """
        if not behaviours:
            raise AIConfigError("A fake script needs at least one behaviour.")
        with self._lock:
            self._sequences[fingerprint] = list(behaviours)

    def reset(self) -> None:
        with self._lock:
            self._default = None
            self._responses.clear()
            self._sequences.clear()
            self._calls.clear()

    # -- observation (tests assert on this; nothing in production reads it) ----
    @property
    def calls(self) -> list[dict[str, Any]]:
        with self._lock:
            return list(self._calls)

    def _record_call(self, **fields: Any) -> None:
        with self._lock:
            self._calls.append(fields)

    # -- resolution -----------------------------------------------------------
    def next_behaviour(self, fingerprint: str) -> FakeBehaviour:
        with self._lock:
            queue = self._sequences.get(fingerprint)
            if queue:
                # Keep the last entry when the queue drains — see `script`.
                behaviour = queue.pop(0) if len(queue) > 1 else queue[0]
                return behaviour
            if self._default is not None:
                return self._default
        return _behaviour_from_settings()

    def response_for(self, fingerprint: str) -> Optional[dict]:
        with self._lock:
            return self._responses.get(fingerprint)


#: Module-level singleton, mirroring `usage_tracker` and `health_manager`.
fake_script = FakeScript()


#: Untrusted candidate text is wrapped in a delimiter carrying a PER-CALL random
#: nonce (`app/ai/utils/untrusted.fence`) so a document cannot close its own
#: fence. That defence is correct and must not be weakened — but it means the
#: rendered prompt for the SAME inputs differs on every call, so a naive hash is
#: never stable for any capability that fences a résumé.
#:
#: Normalising the nonce out is therefore not a convenience, it is a
#: precondition for prompt-keyed determinism. It lives here, in one function used
#: by both the provider and the dataset registration, so the two can never drift.
_NONCE_TAG = re.compile(r"<<<(END_)?([A-Z_]+):[0-9a-fA-F]{8,}>>>")


def _normalise(text: str) -> str:
    """Strip the two things the ORCHESTRATOR adds per call, so one prompt keeps
    one identity across attempts.

    Both are deterministic additions this codebase makes on purpose, and both
    would otherwise make prompt-keying impossible:

      * the per-call **fence nonce** (`_NONCE_TAG`) — fresh randomness on every
        render so a résumé cannot close its own fence (D0.15);
      * the **JSON repair instruction** (C6) — appended from the second JSON
        attempt onward, so a parse failure is not re-asked with a byte-identical
        prompt.

    Without the second, a retry would look like a different prompt: a scripted
    sequence would never reach its second entry, and the golden dataset would
    find no registered answer for the very attempt it exists to measure. Nothing
    else about the prompt is touched, so a genuine change to prompt TEXT still
    changes the fingerprint — which is what keeps §9A rule 6 detectable.
    """
    cleaned = _NONCE_TAG.sub(r"<<<\1\2:NONCE>>>", text or "")
    if cleaned.endswith(JSON_REPAIR_INSTRUCTION):
        cleaned = cleaned[: -len(JSON_REPAIR_INSTRUCTION)]
    return cleaned


def fingerprint(system: str, user: str) -> str:
    """Stable id for a prompt.

    Deliberately excludes the model: the same prompt should answer identically
    whichever model name the gateway resolved, so a role or model change does not
    silently invalidate every registered golden response.

    See `_normalise` for what is stripped and why.
    """
    digest = hashlib.sha256()
    digest.update(_normalise(system).encode("utf-8", "replace"))
    digest.update(b"\x00")
    digest.update(_normalise(user).encode("utf-8", "replace"))
    return digest.hexdigest()


def _behaviour_from_settings() -> FakeBehaviour:
    """The env-configured default, so `AI_FAKE_BEHAVIOUR=timeout` works with no code."""
    return FakeBehaviour(
        kind=(settings.AI_FAKE_BEHAVIOUR or Behaviour.SUCCESS).strip().lower(),
        latency_ms=max(0, int(settings.AI_FAKE_LATENCY_MS or 0)),
        prompt_tokens=settings.AI_FAKE_PROMPT_TOKENS or None,
        completion_tokens=settings.AI_FAKE_COMPLETION_TOKENS or None,
    )


class FakeProvider(LLMProvider):
    name = "fake"
    display_name = "Fake (offline)"
    api_key_setting = ""          # no credential — that is the point
    # Declares native JSON mode, so the orchestrator exercises the C6 path
    # through the fake exactly as it does through Groq. The fake records the
    # flag rather than behaving differently: what is being proven offline is
    # that the REQUEST was shaped correctly, not that a vendor honoured it.
    can_json = True
    can_stream = False
    can_reason = True
    can_tools = False
    ctx_window = 131072
    max_output = 32768
    role_models = {role: FAKE_MODEL for role in ModelRole if role is not ModelRole.EMBEDDINGS}

    #: Injectable so latency simulation never makes a test wall-clock dependent.
    sleeper: Callable[[float], None] = staticmethod(time.sleep)

    def __init__(self) -> None:
        if (settings.ENVIRONMENT or "").strip().lower() == "production":
            raise AIConfigError(
                "The 'fake' AI provider cannot be used in production. It answers "
                "without a model, so the product would appear to work while every "
                "candidate assessment was fabricated."
            )

    def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds,
                 json_mode: bool = False) -> ProviderResponse:
        fp = fingerprint(system, user)
        behaviour = fake_script.next_behaviour(fp)
        fake_script._record_call(
            fingerprint=fp, model=model, kind=behaviour.kind,
            temperature=temperature, max_tokens=max_tokens, timeout_seconds=timeout_seconds,
            json_mode=json_mode,
            # The FACT under test, not the prompt itself: recording the raw user
            # text would carry candidate-derived content around in memory for no
            # gain, and what a C6 test needs to know is whether the orchestrator
            # asked for a repair on this attempt.
            repair_requested=(user or "").endswith(JSON_REPAIR_INSTRUCTION),
        )

        if behaviour.latency_ms:
            type(self).sleeper(behaviour.latency_ms / 1000.0)

        kind = behaviour.kind
        if kind == Behaviour.TIMEOUT:
            raise AITimeoutError(behaviour.message or "fake provider: simulated timeout")
        if kind == Behaviour.RATE_LIMIT:
            raise AIRateLimitError(
                behaviour.message or "fake provider: simulated rate limit (429)",
                retry_after=behaviour.retry_after, is_quota=False,
            )
        if kind == Behaviour.QUOTA:
            raise AIRateLimitError(
                behaviour.message or "fake provider: simulated daily quota exhaustion",
                retry_after=behaviour.retry_after, is_quota=True,
            )
        if kind == Behaviour.PROVIDER_ERROR:
            raise AIProviderError(behaviour.message or "fake provider: simulated upstream error")
        if kind == Behaviour.CONFIG_ERROR:
            raise AIConfigError(behaviour.message or "fake provider: simulated misconfiguration")

        text = self._text_for(kind, fp, behaviour, system, user)
        return ProviderResponse(
            text=text,
            model=model,
            provider=self.name,
            usage=self._usage(behaviour, system, user, text),
            finish_reason="stop",
        )

    # -- response bodies ------------------------------------------------------
    @staticmethod
    def _text_for(kind: str, fp: str, behaviour: FakeBehaviour, system: str, user: str) -> str:
        if kind == Behaviour.EMPTY:
            return ""
        if kind == Behaviour.INVALID_JSON:
            # Prose, exactly the way a model that ignored the format instruction
            # answers. Deterministic, and genuinely unparseable.
            return "Certainly! Here is the analysis you asked for:\n\n- The candidate looks strong."
        if kind == Behaviour.SCHEMA_MISMATCH:
            # Valid JSON, wrong shape. json_valid must record True for this.
            return json.dumps({"unexpected_field": "valid json, wrong shape", "fingerprint": fp[:12]})
        if kind == Behaviour.UNICODE_EDGE:
            return json.dumps(
                {"answer": "Ünïcödé ✅ العربية 👩‍💻 é ‍", "summary": "edge"},
                ensure_ascii=False,
            )

        # SUCCESS
        if behaviour.payload is not None:
            return json.dumps(behaviour.payload, ensure_ascii=False, sort_keys=True)
        registered = fake_script.response_for(fp)
        if registered is not None:
            return json.dumps(registered, ensure_ascii=False, sort_keys=True)
        # No registered answer, and NO GUESS. This raises rather than returning a
        # marker object, because a marker is not safe: several capability schemas
        # (GroqBatchAnalysis among them) default every field, so an unrecognised
        # object VALIDATES — and the run reports a pass while having measured
        # nothing at all. That false green was observed during development and is
        # the reason this path is fatal.
        #
        # AIConfigError specifically: it is non-retryable, so a missing
        # registration fails in one attempt instead of burning the retry ladder
        # three times over, and it reads as what it is — the fake is not
        # configured to answer this prompt (§9A rule 9).
        raise AIConfigError(
            "fake provider: no registered response for this prompt "
            f"(fingerprint {fp[:12]}). Register one via "
            "`fake_script.register_response(...)`, or supply a golden case whose "
            "prompt renders identically. The fake never invents an answer."
        )

    @staticmethod
    def _usage(behaviour: FakeBehaviour, system: str, user: str, text: str) -> TokenUsage:
        """Token counts: configured, or derived deterministically from length.

        The derivation is a crude chars/4 — it is not a tokenizer and does not
        pretend to be. It exists so counts vary realistically across cases while
        staying reproducible, which is what makes them useful for spotting a
        change in prompt size.
        """
        prompt_tokens = behaviour.prompt_tokens
        completion_tokens = behaviour.completion_tokens
        if prompt_tokens is None:
            prompt_tokens = max(1, (len(system or "") + len(user or "")) // 4)
        if completion_tokens is None:
            completion_tokens = max(1, len(text or "") // 4)
        return TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
        )


def behaviour(kind: str, **overrides: Any) -> FakeBehaviour:
    """Small convenience for tests and fixtures: `behaviour("timeout")`."""
    return replace(FakeBehaviour(kind=kind), **overrides) if overrides else FakeBehaviour(kind=kind)
