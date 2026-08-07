"""
Phase 1, task 1 — Provider Bug Fixes. Guards for C2 and C8.

C2 — ERROR CLASSIFICATION WAS SUBSTRING MATCHING ON `str(exc)`
--------------------------------------------------------------
`anthropic_provider.py` tested `"rate" in msg`, which matches "generate". The
guard that matters here is `test_generate_in_the_message_is_not_a_rate_limit`:
it is the exact false positive C2 names, and it fails against the old code.

The rest prove the ladder is now typed-first — SDK exception class, then HTTP
status, then (only then) text — because a classifier that happens to agree with
the old one on today's messages has fixed nothing.

C8 — `is_llm_configured` MEANT `bool(GROQ_API_KEY)`
---------------------------------------------------
`test_openai_only_deployment_reports_configured` is the scenario from the
finding: a deployment with no Groq key and a working OpenAI key reported
`llm: not_configured` on /health while serving every AI request. It fails
against the old property.

Everything here is offline: no key, no network, no SDK required. The vendor
exception types are stood up as real modules in `sys.modules`, which is exactly
how a real one would be visible to the classifier.
"""

from __future__ import annotations

import sys
import types

import pytest

from app.ai.gateway.gateway import (
    configured_reasoning_providers,
    is_reasoning_configured,
)
from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.errors import (
    classify_vendor_error,
    matches_quota_vocabulary,
    retry_after_of,
)
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.groq_provider import GroqProvider
from app.ai.providers.openai_compat import OpenAIProvider
from app.ai.utils.errors import AIProviderError, AIRateLimitError, AITimeoutError
from app.core.config import settings

PLACEHOLDER_KEY = "gsk_placeholder_key"


# ── fixtures: vendor SDK exception types, without the vendor SDKs ────────────
class _FakeAPITimeoutError(Exception):
    pass


class _FakeRateLimitError(Exception):
    def __init__(self, message: str = "", status_code: int = 429):
        super().__init__(message)
        self.status_code = status_code


class _FakeBadRequestError(Exception):
    def __init__(self, message: str = "", status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


@pytest.fixture
def anthropic_sdk(monkeypatch):
    """Install a module named `anthropic` exposing the SDK's real class names.

    The classifier looks its types up in `sys.modules` and matches with
    `isinstance`, so this is indistinguishable from the installed SDK — and the
    suite stays runnable on a machine that has none of the six vendors' packages.
    """
    module = types.ModuleType("anthropic")
    module.APITimeoutError = _FakeAPITimeoutError
    module.RateLimitError = _FakeRateLimitError
    module.BadRequestError = _FakeBadRequestError
    monkeypatch.setitem(sys.modules, "anthropic", module)
    return module


class TestTypedClassificationBeatsText:
    def test_typed_timeout_is_a_timeout(self, anthropic_sdk):
        # No timing word anywhere in the message: only the TYPE says so.
        exc = anthropic_sdk.APITimeoutError("the request did not complete")
        assert isinstance(classify_vendor_error(exc, sdk="anthropic"), AITimeoutError)

    def test_typed_rate_limit_is_a_rate_limit(self, anthropic_sdk):
        exc = anthropic_sdk.RateLimitError("slow down")
        assert isinstance(classify_vendor_error(exc, sdk="anthropic"), AIRateLimitError)

    def test_status_code_outranks_the_message(self, anthropic_sdk):
        """A 400 whose body mentions a quota is a provider error, not a quota.

        Under the old substring ladder the word decided; under the new one the
        status code does, and a message is only consulted when nothing else
        answered."""
        exc = anthropic_sdk.BadRequestError("your quota settings are invalid")
        result = classify_vendor_error(exc, sdk="anthropic")
        assert type(result) is AIProviderError

    def test_an_unknown_typed_error_stays_a_plain_provider_error(self, anthropic_sdk):
        """§9A rule 9 — unknown provider behaviour is surfaced, never mapped to
        the nearest convenient meaning."""
        exc = anthropic_sdk.BadRequestError("model not found", status_code=404)
        assert type(classify_vendor_error(exc, sdk="anthropic")) is AIProviderError


class TestTextFallbackIsWordAnchored:
    def test_generate_in_the_message_is_not_a_rate_limit(self):
        """THE C2 FALSE POSITIVE. `"rate" in "generate"` is True.

        The old anthropic classifier reported every failure whose text contained
        "generate" — most of them — as a rate limit, giving it the rate-limit
        retry budget and the wrong reason in the logs. This asserts on the shared
        classifier; the wiring is asserted per provider in
        `TestEveryProviderClassifiesThroughTheSharedLadder`, which is the guard
        that was watched failing against the old code."""
        exc = RuntimeError("Failed to generate a completion for this request")
        result = classify_vendor_error(exc, sdk="anthropic")
        assert type(result) is AIProviderError
        assert not isinstance(result, AIRateLimitError)

    @pytest.mark.parametrize(
        "message",
        [
            "Rate limit reached for model",
            "rate-limited, try again later",
            "Error code: 429 - too many requests",
            "resource has been exhausted (e.g. check quota)",
            "Overloaded",
        ],
    )
    def test_genuine_rate_limit_wording_still_classifies(self, message):
        assert isinstance(
            classify_vendor_error(RuntimeError(message), sdk="anthropic"),
            AIRateLimitError,
        )

    @pytest.mark.parametrize(
        "message", ["Request timed out", "connection timeout", "Deadline exceeded"]
    )
    def test_genuine_timeout_wording_still_classifies(self, message):
        assert isinstance(
            classify_vendor_error(RuntimeError(message), sdk="gemini"), AITimeoutError
        )

    def test_an_unrecognised_message_is_a_transient_provider_error(self):
        assert type(classify_vendor_error(RuntimeError("boom"), sdk="groq")) is AIProviderError


class TestQuotaSemanticsPerProvider:
    """Was `TestQuotaSemanticsAreUnchanged`, which pinned today's behaviour
    INCLUDING the C1 gap and named itself as the test C1 must update in the same
    commit (D1.4). C1 is now closed, so this class asserts what it asserted for
    Groq and the OpenAI family — those lists are preserved verbatim — and the two
    cases that used to record the gap now assert it is shut. The C1 guards proper
    live in `tests/test_retry_classification.py`."""

    def test_groq_marks_a_daily_ceiling_as_quota(self):
        exc = RuntimeError("Rate limit reached: 100000 tokens per day (TPD)")
        result = GroqProvider._classify(exc)
        assert isinstance(result, AIRateLimitError)
        assert result.is_quota is True
        assert result.retryable is False

    def test_groq_treats_a_per_minute_limit_as_retryable(self):
        result = GroqProvider._classify(RuntimeError("Rate limit reached: 30 requests per minute"))
        assert isinstance(result, AIRateLimitError)
        assert result.is_quota is False
        assert result.retryable is True

    def test_openai_family_detects_quota(self):
        result = OpenAIProvider._classify(RuntimeError("You exceeded your current quota"))
        assert isinstance(result, AIRateLimitError)
        assert result.is_quota is True

    def test_gemini_now_detects_a_daily_ceiling(self):
        """THE C1 CHANGE. This assertion is inverted from what it was: Gemini
        used to retry an exhausted daily budget five times over."""
        result = GeminiProvider._classify(
            RuntimeError("429 Quota exceeded for quota metric 'requests per day'")
        )
        assert isinstance(result, AIRateLimitError)
        assert result.is_quota is True
        assert result.retryable is False

    def test_gemini_still_retries_a_per_minute_limit(self):
        """The other half of C1, and the reason Gemini's marker list is narrower
        than Groq's: Google says "quota" for a per-minute limit too, so a shared
        list would have abandoned a request about to succeed."""
        result = GeminiProvider._classify(
            RuntimeError("429 Quota exceeded for quota metric 'requests per minute'")
        )
        assert isinstance(result, AIRateLimitError)
        assert result.is_quota is False
        assert result.retryable is True

    def test_anthropic_declares_no_daily_quota_vocabulary(self):
        """Anthropic's 429s are per-minute buckets that reset within the minute,
        so retrying them is correct. The empty marker list is a declaration, not
        the gap C1 closed — what Anthropic gained is Retry-After (below)."""
        assert AnthropicProvider.quota_markers == ()
        result = AnthropicProvider._classify(RuntimeError("429 rate_limit_error"))
        assert isinstance(result, AIRateLimitError)
        assert result.is_quota is False

    def test_retry_after_is_read_from_the_response_headers(self):
        exc = RuntimeError("Rate limit reached: 30 requests per minute")
        exc.response = types.SimpleNamespace(headers={"retry-after": "12"})
        result = GroqProvider._classify(exc)
        assert result.retry_after == 12.0

    def test_groq_and_openai_marker_lists_are_preserved_verbatim(self):
        """The pre-C1 expression, character for character. Groq's is the only
        list ever exercised against a live account; C1 had no business tuning it
        while closing a gap on a different provider."""
        original = ("per day", "tpd", "rpd", "daily", "quota")
        assert GroqProvider.quota_markers == original
        assert OpenAIProvider.quota_markers == original
        assert matches_quota_vocabulary("tokens per day", original) is True
        assert matches_quota_vocabulary("30 requests per minute", original) is False

    def test_retry_after_of_tolerates_an_exception_without_a_response(self):
        assert retry_after_of(RuntimeError("no response attached")) is None


class TestEveryProviderClassifiesThroughTheSharedLadder:
    """The duplication WAS the defect: four copies drifted into four word lists,
    one grew the "generate" bug (C2) and two silently stopped classifying quota
    (C1). `_classify` now lives ONCE, on `LLMProvider`, so the structural guard
    below is the load-bearing one — a provider that overrides it has taken back
    the decision §9A rule 13 centralised."""

    @pytest.mark.parametrize(
        "provider", [GroqProvider, AnthropicProvider, GeminiProvider, OpenAIProvider]
    )
    def test_no_provider_owns_its_own_classifier(self, provider):
        assert "_classify" not in vars(provider), (
            f"{provider.__name__} overrides _classify. Providers declare "
            f"vocabulary (sdk_namespace, quota_markers); the decision stays in "
            f"app/ai/providers/errors.py — §9A rule 13."
        )

    @pytest.mark.parametrize(
        "provider", [GroqProvider, AnthropicProvider, GeminiProvider, OpenAIProvider]
    )
    def test_generate_is_never_a_rate_limit_on_any_provider(self, provider):
        exc = RuntimeError("could not generate a response")
        assert not isinstance(provider._classify(exc), AIRateLimitError)

    @pytest.mark.parametrize(
        "provider", [GroqProvider, AnthropicProvider, GeminiProvider, OpenAIProvider]
    )
    def test_every_provider_returns_the_ai_hierarchy(self, provider):
        assert isinstance(provider._classify(RuntimeError("unknown")), AIProviderError)


# ── C8 — "is the LLM configured?" is not "is Groq configured?" ────────────────
@pytest.fixture
def chain(monkeypatch):
    """Point the reasoning chain somewhere explicit, with no runtime override."""

    def _configure(primary: str, fallbacks: str = "", enable_fallback: bool = True):
        monkeypatch.setattr(settings, "AI_PROVIDER", primary)
        monkeypatch.setattr(settings, "AI_FALLBACK_PROVIDERS", fallbacks)
        monkeypatch.setattr(settings, "AI_ENABLE_FALLBACK", enable_fallback)

    yield _configure


class TestReasoningConfiguration:
    def test_openai_only_deployment_reports_configured(self, chain, monkeypatch):
        """THE C8 SCENARIO. No Groq key, a working OpenAI key: the service
        answers every AI request and used to report `llm: not_configured`."""
        chain("openai")
        monkeypatch.setattr(settings, "GROQ_API_KEY", "")
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test-openai")
        assert configured_reasoning_providers() == ["openai"]
        assert is_reasoning_configured() is True
        assert settings.is_llm_configured is True

    def test_no_key_anywhere_reports_not_configured(self, chain, monkeypatch):
        chain("groq", "openai")
        monkeypatch.setattr(settings, "GROQ_API_KEY", "")
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "")
        assert configured_reasoning_providers() == []
        assert settings.is_llm_configured is False

    def test_a_configured_fallback_counts(self, chain, monkeypatch):
        """The primary is dead and a fallback can answer — the service can
        reason, so saying otherwise would be the same lie in a new place."""
        chain("groq", "openai")
        monkeypatch.setattr(settings, "GROQ_API_KEY", "")
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test-openai")
        assert configured_reasoning_providers() == ["openai"]

    def test_a_fallback_does_not_count_when_fallback_is_disabled(self, chain, monkeypatch):
        chain("groq", "openai", enable_fallback=False)
        monkeypatch.setattr(settings, "GROQ_API_KEY", "")
        monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-test-openai")
        assert configured_reasoning_providers() == []

    def test_the_groq_placeholder_key_is_still_not_configuration(self, chain, monkeypatch):
        """The placeholder check moved out of `Settings` and into the provider.
        It must not have been dropped on the way: a placeholder key that reads
        as configured turns a missing-key warning into a 503 nobody expected."""
        chain("groq")
        monkeypatch.setattr(settings, "GROQ_API_KEY", PLACEHOLDER_KEY)
        assert GroqProvider().is_configured() is False
        assert settings.is_llm_configured is False

    def test_a_real_groq_key_is_configuration(self, chain, monkeypatch):
        chain("groq")
        monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_real_looking_key")
        assert settings.is_llm_configured is True

    def test_no_vendor_name_decides_the_answer(self, chain, monkeypatch):
        """§9A rule 10 — capability metadata is declared, never inferred. Every
        provider is asked the same question through the same interface, so the
        answer tracks the declared key setting rather than a name."""
        chain("kimi")
        monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_real_looking_key")
        monkeypatch.setattr(settings, "MOONSHOT_API_KEY", "")
        assert settings.is_llm_configured is False
        monkeypatch.setattr(settings, "MOONSHOT_API_KEY", "sk-test-moonshot")
        assert settings.is_llm_configured is True
