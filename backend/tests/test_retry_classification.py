"""
Phase 1, task 3 — Retry Classification. Guards for C1.

WHAT WAS WRONG
--------------
`is_quota` decides whether a failure is retried at all, and it was computed by
each provider and handed to the shared classifier as a finished verdict. Two of
the four never computed it. So an exhausted DAILY budget on Gemini or Anthropic
was classified transient and retried — spending more of a budget that cannot
clear today, which is the one thing retrying can never fix. R5 rated it High
once live.

`retry_after` had the same shape: one provider extracted it, three ignored a
wait time the vendor had explicitly sent.

WHAT THE TESTS ASSERT
---------------------
The load-bearing test is `test_a_daily_quota_costs_exactly_one_provider_call`.
Not "the flag is set" — that a quota-exhausted provider is called **once**, then
failed over from, driven through the real orchestrator ladder. The flag is the
mechanism; the call count is the finding.

Everything else defends the split that makes it correct:

  * providers declare VOCABULARY, the classifier decides (rule 13)
  * Groq's and OpenAI's marker lists are preserved verbatim
  * Gemini's is narrower ON PURPOSE — Google says "quota" for a per-minute
    limit too, and a shared list would abandon a request about to succeed
  * classification is deterministic
  * an unknown failure keeps its BOUNDED ladder — no storm, no new fast-fail

Offline: no key, no network, no SDK, no wall clock (backoff is patched out).
"""

from __future__ import annotations

import importlib
import types

import pytest
from pydantic import BaseModel

from app.ai.gateway import health_manager, usage_tracker
from app.ai.gateway.gateway import clear_override
from app.ai.gateway.health import HealthState
from app.ai.gateway.provider_registry import ProviderSpec, register_provider_spec
from app.ai.gateway.roles import ModelRole
from app.ai.prompts.base import PromptTemplate
from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.base import LLMProvider
from app.ai.providers.errors import classify_vendor_error, matches_quota_vocabulary
from app.ai.providers.fake_provider import FakeProvider
from app.ai.providers.gemini_provider import GeminiProvider
from app.ai.providers.groq_provider import GroqProvider
from app.ai.providers.openai_compat import KimiProvider, OpenAIProvider, OpenRouterProvider
from app.ai.providers.registry import register_provider
from app.ai.schemas.base import Capability, ProviderResponse, TokenUsage
from app.ai.utils.errors import AIError, AIProviderError, AIRateLimitError, AITimeoutError
from app.core.config import settings

orch_mod = importlib.import_module("app.ai.orchestrator.orchestrator")

ALL_PROVIDERS = [
    GroqProvider, AnthropicProvider, GeminiProvider,
    OpenAIProvider, OpenRouterProvider, KimiProvider,
]


class _Reply(BaseModel):
    answer: str = ""


def _rate_limited(message: str, *, retry_after: str | None = None) -> Exception:
    exc = RuntimeError(message)
    if retry_after is not None:
        exc.response = types.SimpleNamespace(headers={"retry-after": retry_after})
    return exc


# ── the finding, measured in provider calls ──────────────────────────────────
@pytest.fixture
def ladder(monkeypatch):
    """The real orchestrator ladder, with the clock removed.

    A provider whose failure is scripted, plus a healthy fallback, so the
    difference between "retried" and "failed over immediately" is a number this
    test can read rather than a claim it has to trust.
    """
    calls: dict[str, int] = {}

    def _make(name: str, error, markers: tuple[str, ...] = ()):
        class _P(LLMProvider):
            quota_markers = markers

            def complete(self, *, system, user, model, temperature, max_tokens, timeout_seconds):
                calls[self.name] = calls.get(self.name, 0) + 1
                if error is None:
                    return ProviderResponse(
                        text='{"answer":"%s"}' % self.name, model=model,
                        provider=self.name, usage=TokenUsage(1, 1, 2),
                    )
                raise type(self)._classify(error())

        _P.name = name
        _P.display_name = name
        _P.api_key_setting = ""
        _P.role_models = {ModelRole.DEFAULT_REASONING: f"{name}-model"}
        register_provider(name, _P)
        register_provider_spec(ProviderSpec(
            name, name, frozenset({"reasoning"}), "",
            role_models={ModelRole.DEFAULT_REASONING: f"{name}-model"},
        ))
        return _P

    monkeypatch.setattr(orch_mod.time, "sleep", lambda _s: None)   # no wall clock
    monkeypatch.setattr(
        orch_mod, "get_prompt",
        lambda cap: PromptTemplate(id="t", version="1", system="s", render=lambda **v: "u"),
    )
    monkeypatch.setattr(settings, "AI_DISABLED_PROVIDERS", "")
    monkeypatch.setattr(settings, "AI_ENABLE_FALLBACK", True)
    clear_override()
    health_manager.reset()
    usage_tracker.reset()

    def _configure(primary: str, error, markers=(), *, fallback: str | None = None):
        _make(primary, error, markers)
        if fallback:
            _make(fallback, None)
        monkeypatch.setattr(settings, "AI_PROVIDER", primary)
        monkeypatch.setattr(settings, "AI_FALLBACK_PROVIDERS", fallback or "")
        return calls

    yield _configure, calls
    clear_override()
    health_manager.reset()


def _run():
    return orch_mod.orchestrator.run(
        capability=Capability.RECRUITER_COPILOT, variables={}, schema=_Reply,
    )


class TestQuotaIsNeverRetried:
    def test_a_daily_quota_costs_exactly_one_provider_call(self, ladder):
        """THE FINDING. Before C1 this Gemini-shaped failure was retried; the
        assertion that matters is the call count, not the flag."""
        configure, calls = ladder
        configure(
            "c1_quota",
            lambda: _rate_limited("429 Quota exceeded for quota metric 'requests per day'"),
            GeminiProvider.quota_markers,
            fallback="c1_ok",
        )
        result = _run()
        assert calls["c1_quota"] == 1
        assert result.data.answer == "c1_ok"

    def test_a_transient_rate_limit_is_still_retried(self, ladder):
        """The other direction, and the one that keeps the fix honest: a
        per-minute limit clears in seconds and must NOT become a fast-fail."""
        configure, calls = ladder
        configure(
            "c1_transient",
            lambda: _rate_limited("429 Quota exceeded for quota metric 'requests per minute'"),
            GeminiProvider.quota_markers,
        )
        with pytest.raises(AIError):
            _run()
        assert calls["c1_transient"] > 1

    def test_quota_fails_over_rather_than_failing_the_request(self, ladder):
        """Quota on one provider is not an outage. The chain must still answer —
        this is orchestrator behaviour that predates C1 and must survive it."""
        configure, calls = ladder
        configure(
            "c1_q2", lambda: _rate_limited("Rate limit reached: tokens per day (TPD)"),
            GroqProvider.quota_markers, fallback="c1_ok2",
        )
        assert _run().data.answer == "c1_ok2"
        assert calls["c1_q2"] == 1

    def test_quota_marks_the_provider_rate_limited_for_its_cooldown(self, ladder):
        """So the NEXT request skips it too, instead of rediscovering the
        exhausted budget with another call."""
        configure, _ = ladder
        configure(
            "c1_q3", lambda: _rate_limited("Rate limit reached: tokens per day (TPD)"),
            GroqProvider.quota_markers,
        )
        with pytest.raises(AIError):
            _run()
        assert health_manager.state_of("c1_q3") is HealthState.RATE_LIMITED
        assert health_manager.is_available("c1_q3") is False


class TestProvidersDeclareVocabularyOnly:
    """§9A rule 13, extended to the retry decision. A provider says what its
    vendor CALLS things; `errors.py` decides what that MEANS."""

    @pytest.mark.parametrize("provider", ALL_PROVIDERS + [FakeProvider])
    def test_no_provider_overrides_the_classifier(self, provider):
        assert "_classify" not in vars(provider)

    @pytest.mark.parametrize("provider", ALL_PROVIDERS)
    def test_every_real_provider_declares_which_sdk_it_raises(self, provider):
        assert provider.sdk_namespace, (
            f"{provider.__name__} declares no sdk_namespace, so its typed vendor "
            f"exceptions cannot be recognised and it falls back to text matching."
        )

    @pytest.mark.parametrize("provider", ALL_PROVIDERS + [FakeProvider])
    def test_quota_markers_are_a_tuple_of_lowercase_phrases(self, provider):
        assert isinstance(provider.quota_markers, tuple)
        assert all(m == m.lower() and m.strip() == m for m in provider.quota_markers)

    def test_the_fake_needs_no_vocabulary(self, provider=FakeProvider):
        """§9A rule 12: the contract's reference implementation raises the AI
        hierarchy directly — `AIRateLimitError(is_quota=...)` — so it exercises
        both retry branches without ever classifying a vendor exception. The
        retry contract did not have to change to accommodate it, which is the
        check that the contract is the right shape."""
        assert provider.sdk_namespace == ""
        assert provider.quota_markers == ()


class TestVocabularyIsPerVendorForACorrectnessReason:
    def test_gemini_is_narrower_than_groq(self):
        """Not a style choice. "quota" is a daily marker at Groq and appears in
        Google's per-minute messages, so sharing one list would fast-fail a
        Gemini request that was about to succeed."""
        assert "quota" in GroqProvider.quota_markers
        assert "quota" not in GeminiProvider.quota_markers

    def test_the_same_message_classifies_differently_per_vendor(self):
        message = "Quota exceeded for quota metric 'requests per minute'"
        groq = classify_vendor_error(RuntimeError(message), sdk="groq",
                                     quota_markers=GroqProvider.quota_markers)
        gemini = classify_vendor_error(RuntimeError(message), sdk="google",
                                       quota_markers=GeminiProvider.quota_markers)
        assert groq.is_quota is True        # Groq's verified list, unchanged
        assert gemini.is_quota is False     # correct for Google's wording

    def test_an_empty_marker_list_means_never_quota(self):
        result = classify_vendor_error(
            RuntimeError("429 rate limit: tokens per day"), sdk="anthropic", quota_markers=(),
        )
        assert isinstance(result, AIRateLimitError)
        assert result.is_quota is False

    def test_marker_matching_is_case_insensitive(self):
        assert matches_quota_vocabulary("Limit 6000 TPD reached", ("tpd",)) is True
        assert matches_quota_vocabulary("nothing relevant", ("tpd",)) is False


class TestRetryAfterIsHonouredWhereTheVendorSendsIt:
    @pytest.mark.parametrize("provider", ALL_PROVIDERS)
    def test_every_provider_reads_the_header(self, provider):
        """Previously Groq alone did. Three providers ignored a wait time the
        vendor had explicitly stated, and retried too early to succeed."""
        result = provider._classify(_rate_limited("rate limit reached", retry_after="7"))
        assert result.retry_after == 7.0

    def test_absent_header_falls_back_to_backoff(self):
        result = GeminiProvider._classify(RuntimeError("429 rate limit"))
        assert result.retry_after is None

    def test_an_unparseable_header_is_not_a_crash(self):
        result = OpenAIProvider._classify(
            _rate_limited("rate limit reached", retry_after="Wed, 21 Oct 2026 07:28:00 GMT")
        )
        assert result.retry_after is None


class TestDeterminism:
    """A retry decision that varies between identical inputs is unreviewable,
    and makes an evaluation run unrepeatable."""

    def test_the_same_exception_classifies_identically_every_time(self):
        exc = _rate_limited("Rate limit reached: tokens per day (TPD)", retry_after="3")
        results = [GroqProvider._classify(exc) for _ in range(25)]
        assert {(type(r), r.is_quota, r.retry_after, r.retryable) for r in results} == {
            (AIRateLimitError, True, 3.0, False)
        }

    @pytest.mark.parametrize("provider", ALL_PROVIDERS)
    def test_classification_reads_no_state(self, provider):
        exc = RuntimeError("429 too many requests")
        first = provider._classify(exc)
        second = provider._classify(exc)
        assert type(first) is type(second)
        assert first.is_quota == second.is_quota


class TestUnknownFailuresDoNotStorm:
    def test_an_unknown_error_keeps_its_bounded_ladder(self, ladder):
        """Unknown stays retryable — guessing "fatal" takes down a working
        feature (§9A rule 9). What makes that safe is the BOUND, so this asserts
        the bound rather than the flag."""
        configure, calls = ladder
        configure("c1_unknown", lambda: RuntimeError("something nobody has seen before"))
        with pytest.raises(AIError):
            _run()
        ceiling = (settings.AI_MAX_NETWORK_RETRIES
                   * settings.AI_MAX_JSON_RETRIES
                   * settings.AI_MAX_SCHEMA_RETRIES)
        assert 1 < calls["c1_unknown"] <= ceiling

    def test_an_unknown_error_is_not_reclassified_as_quota(self):
        result = GroqProvider._classify(RuntimeError("upstream exploded"))
        assert type(result) is AIProviderError
        assert not isinstance(result, AIRateLimitError)

    def test_a_timeout_is_still_a_timeout(self):
        assert isinstance(GroqProvider._classify(RuntimeError("request timed out")), AITimeoutError)


class TestTheHarnessCanStillSeeEveryRetryPath:
    """`AIExecution` is what the evaluation harness records, and every retry path
    must stay distinguishable there.

    **With one pre-existing limitation, which C1 does not fix and must not be
    mistaken for fixed.** On failure `orchestrator.run` raises an `AIError`
    carrying no `AIExecution`, so `EvalRecord.network_attempts` is `None` — the
    limitation already recorded at the end of §11.6. A failed quota is therefore
    distinguishable from a failed transient limit by `error_type` and
    `is_quota`, and by the orchestrator's `reason=rate_limit_quota` log line, but
    **not by an attempt count in the record**. The count C1 actually changed is
    observable in a test (below) and in the logs, not yet in the dataset.

    Closing that means attaching execution metadata to the raised exception,
    which §11.6 lists as a Phase 1 candidate. It is not C1 and was not done here.
    """

    def test_execution_records_the_attempt_count_on_success(self, ladder):
        configure, _ = ladder
        configure("c1_seen", None)
        result = _run()
        assert result.execution.network_attempts == 1
        assert result.execution.provider == "c1_seen"

    def test_the_known_limitation_is_still_exactly_this_shape(self, ladder):
        """Pinned so the next task neither rediscovers it nor assumes it was
        fixed here: a FAILED run raises without execution metadata."""
        configure, _ = ladder
        configure("c1_nometa", lambda: RuntimeError("boom"))
        with pytest.raises(AIError) as excinfo:
            _run()
        assert getattr(excinfo.value, "execution", None) is None

    def test_a_quota_failure_surfaces_its_error_type(self, ladder):
        """What IS distinguishable today: the error type and the quota flag,
        plus the call count observable from the provider itself."""
        configure, calls = ladder
        configure(
            "c1_seen2",
            # A realistic Groq body. The message must read as a RATE LIMIT before
            # the quota markers are consulted at all — a two-stage gate, so a
            # stray "per day" in an unrelated error cannot manufacture a quota.
            lambda: _rate_limited("Rate limit reached: limit 100000 tokens per day (TPD)"),
            GroqProvider.quota_markers,
        )
        with pytest.raises(AIRateLimitError) as excinfo:
            _run()
        assert excinfo.value.is_quota is True
        assert calls["c1_seen2"] == 1
