"""
AIOrchestrator — the single entry point for structured AI calls.

Responsibilities: resolve provider + model via the **AI Gateway** (logical roles,
configurable fallback chain) → select + render the capability's prompt → call the
provider → parse + validate structured output, with the historical retry ladder
(network 3 → JSON 3 → schema 2) preserved exactly, now wrapped in a provider
FALLBACK loop → capture observability (latency, provider, model, retries, tokens,
estimated cost) via the usage tracker → raise typed AIErrors (never raw provider
errors).

Callers pass a logical `role` (default DEFAULT_REASONING) and a Pydantic response
model; they get back a validated instance plus an AIExecution record. Explicit
`provider`/`model` still override the gateway for one-off needs.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Optional, Type, TypeVar

from app.ai.config import get_ai_config
from app.ai.gateway import ModelRole, active_provider, cost_of, fallback_chain, resolve, usage_tracker
from app.ai.gateway.model_registry import get_model
from app.ai.gateway.capability_routing import model_route_for
from app.ai.gateway.gateway import ModelSelection, ModelSource
from app.ai.gateway.health import health_manager, kind_for_error
from app.ai.gateway.provider_config import get_provider_config
from app.ai.prompts.registry import get_prompt
from app.ai.providers.registry import get_provider
from app.ai.schemas.base import AIExecution, AIResult, Capability, TokenUsage
from app.ai.utils.backoff import exponential_backoff, rate_limit_delay
from app.ai.utils.budget import CallBudget
from app.ai.utils.errors import (
    AIBudgetExhaustedError, AIConfigError, AIError, AIParseError, AIProviderError,
    AIRateLimitError, AITimeoutError, AIValidationError,
)
from app.ai.utils.json import parse_json_object, with_repair_instruction

logger = logging.getLogger("app.ai")

T = TypeVar("T")


class AIOrchestrator:
    """Stateless orchestration service (safe to use as a singleton)."""

    def run(
        self,
        *,
        capability: Capability,
        variables: dict,
        schema: Type[T],
        role: ModelRole = ModelRole.DEFAULT_REASONING,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        timeout_seconds: Optional[int] = None,
        reasoning_effort: Optional[str] = None,
    ) -> AIResult[T]:
        cfg = get_ai_config()
        temp = cfg.temperature if temperature is None else temperature
        max_tok = max_tokens or cfg.max_tokens
        # Per-provider timeout is resolved inside _attempt; only an explicit
        # per-call override is threaded through here (None → provider/global config).
        timeout_override = timeout_seconds

        template = get_prompt(capability)
        system = template.system
        user = template.build_user(**variables)

        # Capability→MODEL routing — INERT by default. When enabled and mapped, the
        # capability is pinned to a model and its provider is INFERRED from the model
        # registry (model-first). Explicit call-site provider/model overrides win.
        routed_provider = routed_model = None
        if provider is None and model is None:
            routed = model_route_for(capability.value)
            if routed:
                routed_provider, routed_model = routed
        effective_provider = provider or routed_provider
        effective_model = model or routed_model

        # Provider + model come from the Gateway. An explicit/routed provider or
        # model pins a single selection; otherwise the configurable fallback chain.
        if effective_provider or effective_model:
            provider_name = (effective_provider or active_provider()).lower()
            if effective_model:
                # A pinned model is the MOST specific instruction there is, so it
                # is recorded as such and nothing downstream may override it (C5).
                # The gateway is NOT asked to resolve a model here: the answer is
                # already known, and asking anyway would make a request fail over
                # a role the pinned provider happens not to declare (C4's raise).
                selected_model = effective_model
                source = ModelSource.CALL_SITE if model else ModelSource.CAPABILITY_ROUTING
            else:
                base = resolve(role, provider=provider_name)
                selected_model, source = base.model, base.source
            selections = [ModelSelection(
                provider=provider_name, model=selected_model, role=role, source=source,
            )]
        else:
            selections = fallback_chain(role)

        # DISABLED is not a health state to fall back to — it is an instruction.
        # `fallback_chain()` already excludes disabled providers, but the pinned
        # paths above (an explicit `provider=`/`model=`, or capability routing)
        # never touch the chain, so the invariant is enforced here as well, at the
        # point where routing is actually decided. This filter must come BEFORE
        # the healthy/unhealthy split: a disabled provider is not available, so it
        # used to land in `unhealthy` and get called as a last resort — which is
        # exactly how a provider an operator had switched off kept serving
        # traffic while the admin UI showed it as DISABLED (C3).
        routable = [s for s in selections if not health_manager.is_disabled(s.provider)]

        # Health-aware ordering: try providers currently HEALTHY first; keep
        # unhealthy ones only as a last resort (so we never hard-fail purely on
        # stale health). This is what stops us re-calling a known-down provider.
        healthy = [s for s in routable if health_manager.is_available(s.provider)]
        unhealthy = [s for s in routable if not health_manager.is_available(s.provider)]
        ordered = healthy + unhealthy
        primary = routable[0].provider if routable else ""

        if not ordered:
            # Every candidate was disabled. Say so, name the list, and fail
            # NON-retryably: this is a configuration with no answer, not an
            # outage, and retrying it burns a ladder that cannot succeed.
            #
            # `selections` is empty when the chain itself filtered everything out
            # and non-empty when a PINNED provider was disabled. The two are
            # different mistakes and the message distinguishes them, because the
            # person reading it is deciding which setting to change.
            from app.core.config import settings as _settings

            disabled = ", ".join(sorted(_settings.disabled_providers)) or "empty"
            pinned = ", ".join(s.provider for s in selections)
            cause = (
                f"the pinned provider(s) ({pinned}) are disabled"
                if pinned
                else "every provider in the configured chain is disabled"
            )
            raise AIConfigError(
                f"No routable AI provider for capability '{capability.value}': {cause}. "
                f"AI_DISABLED_PROVIDERS={disabled}. Remove one from that list, or "
                f"configure a provider that is not on it."
            )

        # ONE budget for the whole request — it spans the failover loop, so N
        # providers can no longer multiply the ladder's cost (S-5).
        budget = CallBudget(capability=capability.value)

        last_error: Optional[AIError] = None
        for selection in ordered:
            try:
                data, execution = self._attempt(
                    capability, selection, system, user, schema, cfg, temp, max_tok,
                    timeout_override, budget, reasoning_effort=reasoning_effort,
                )
                self._log(execution)
                health_manager.record_success(selection.provider)
                # Fallback event: a non-primary provider answered.
                if selection.provider != primary:
                    from app.core.observability import request_id_ctx
                    logger.warning(
                        "AI gateway FAILOVER | capability=%s from=%s to=%s reason=%s latency=%dms",
                        capability.value, primary, selection.provider,
                        type(last_error).__name__ if last_error else "skipped",
                        execution.latency_ms,
                    )
                    usage_tracker.record_fallback(
                        capability=capability.value, from_provider=primary,
                        to_provider=selection.provider,
                        reason=type(last_error).__name__ if last_error else "unhealthy_primary",
                        latency_ms=execution.latency_ms, request_id=request_id_ctx.get(),
                    )
                return AIResult(data=data, execution=execution)  # type: ignore[return-value]
            except AIBudgetExhaustedError:
                # Not a provider failure, so no health penalty and no failover:
                # the next provider would be refused on the first call anyway,
                # and recording this against the provider would blame it for a
                # ceiling the request hit.
                raise
            except AIError as exc:
                last_error = exc
                health_manager.record_failure(
                    selection.provider, kind=kind_for_error(exc), error=str(exc)
                )
                if len(ordered) > 1:
                    logger.warning(
                        "AI gateway: provider '%s' failed (%s); trying next provider.",
                        selection.provider, type(exc).__name__,
                    )
                continue

        # All providers exhausted — never leak a raw vendor error to business logic.
        raise last_error or AIProviderError("All configured AI providers are unavailable.")

    # -- one provider attempt (owns the full retry ladder) -----------------
    def _attempt(self, capability, selection, system, user, schema, cfg, temp, max_tok,
                 timeout_override, budget, reasoning_effort=None):
        prov = get_provider(selection.provider)  # may raise AIConfigError → fallback
        # Per-provider config (M2): timeout / retry policy / default-model override,
        # each falling back to the global AI_* defaults. Behaviour is unchanged when
        # AI_PROVIDERS is empty.
        pcfg = get_provider_config(selection.provider)
        # The gateway already decided the model, including this provider's own
        # `default_model` at its correct precedence. Re-applying it here is what
        # made an explicit call-site `model=` silently lose to a config file
        # (C5), and it meant the model was chosen in two places that did not
        # know about each other. Retry/timeout policy still comes from `pcfg`.
        model_name = selection.model
        timeout = timeout_override or pcfg.timeout_seconds
        # QA-mode duplicate-prompt detection (no-op in production).
        fingerprint = hashlib.sha256(
            f"{capability.value}|{selection.model}|{system}|{user}".encode("utf-8", "ignore")
        ).hexdigest()
        usage_tracker.note_prompt(fingerprint)
        start = time.time()

        # QA-mode cache: an identical prior request reuses its output (0 API calls).
        cached = usage_tracker.qa_cache_get(fingerprint)
        if cached is not None:
            try:
                data = schema(**cached)  # type: ignore[call-arg]
                execution = self._execution(
                    capability, selection.provider, model_name, True, start, 0, 0, 0, TokenUsage(),
                )
                return data, execution  # not recorded → keeps the "saved a call" invariant
            except Exception:  # cached shape no longer valid → fall through to a live call
                pass

        # Native JSON mode (C6) — decided ONCE, before the ladder, from two
        # declarations that must BOTH be true:
        #   * the provider implements the request parameter (`can_json`), and
        #   * the resolved model declares it supports JSON (`ModelSpec`).
        # An unregistered model is "unknown", not "yes": the registry documents
        # that unknown models still work, so guessing here would send a parameter
        # a model might 400 on, and a 400 is retried three times before failing.
        # Declared, never inferred (§9A rule 10) — and this is what finally makes
        # `can_json` load-bearing rather than decorative, which was C6.
        model_spec = get_model(model_name)
        json_mode = bool(prov.supports_json() and model_spec and model_spec.supports_json)
        # Passed as **kwargs so a provider that does NOT declare `can_json` never
        # receives a parameter its `complete()` was not written to accept.
        json_kwargs = {"json_mode": True} if json_mode else {}
        # Reasoning-effort control — same declared-never-inferred contract: only
        # a caller that asked for it AND a provider whose `complete()` accepts
        # the parameter (`can_reasoning_effort`) ever see it.
        if reasoning_effort and prov.supports_reasoning_effort():
            json_kwargs["reasoning_effort"] = reasoning_effort

        # `provider_calls` used to be its own counter. It is now a reading of the
        # ONE budget, taken from a mark, so the request total and the per-attempt
        # count can never disagree (S-5).
        attempt_mark = budget.mark()
        parse_attempts = validate_attempts = 0
        usage = TokenUsage()
        last_error: Optional[AIError] = None
        timed_out = False

        try:
            for _ in range(cfg.max_schema_retries):
                parsed: Optional[dict] = None
                for json_attempt in range(cfg.max_json_retries):
                    # A parse failure is re-asked WITH a repair instruction; the
                    # first attempt is byte-identical to the pre-C6 prompt, which
                    # is what keeps deterministic evaluation intact.
                    attempt_user = with_repair_instruction(user, json_attempt)
                    text: Optional[str] = None
                    # Network attempts and transient-rate-limit retries have
                    # SEPARATE bounded budgets, each with backoff (A4). Quota
                    # exhaustion is never retried (it won't clear today).
                    network_fails = rate_limit_retries = 0
                    while True:
                        # Refused BEFORE the call, so an exhausted budget costs
                        # nothing. Non-retryable, so it leaves every ladder.
                        budget.spend(provider=selection.provider)
                        try:
                            resp = prov.complete(
                                system=system, user=attempt_user, model=model_name,
                                temperature=temp, max_tokens=max_tok, timeout_seconds=timeout,
                                **json_kwargs,
                            )
                            usage = resp.usage
                            text = resp.text
                            break
                        except AIConfigError:
                            raise  # non-retryable for THIS provider → bubble to fallback
                        except AIRateLimitError as exc:
                            last_error = exc
                            if exc.is_quota or rate_limit_retries >= pcfg.max_rate_limit_retries:
                                self._log_retry(
                                    capability, budget.spent_since(attempt_mark),
                                    "rate_limit_quota" if exc.is_quota else "rate_limit_exhausted",
                                    0.0, exc, retry_after=exc.retry_after, final=True,
                                )
                                break  # fail fast → outer fallback loop (if any)
                            rate_limit_retries += 1
                            delay = self._rate_limit_delay(exc, rate_limit_retries, pcfg)
                            self._log_retry(capability, budget.spent_since(attempt_mark), "rate_limit", delay, exc,
                                            retry_after=exc.retry_after)
                            time.sleep(delay)
                            continue
                        except AITimeoutError as exc:
                            timed_out = True
                            last_error = exc
                            network_fails += 1
                            if network_fails >= pcfg.max_network_retries:
                                self._log_retry(capability, budget.spent_since(attempt_mark), "timeout_exhausted",
                                                0.0, exc, final=True)
                                break
                            delay = self._backoff(network_fails, pcfg)
                            self._log_retry(capability, budget.spent_since(attempt_mark), "timeout", delay, exc)
                            time.sleep(delay)
                            continue
                        except AIProviderError as exc:
                            last_error = exc
                            network_fails += 1
                            if network_fails >= pcfg.max_network_retries:
                                self._log_retry(capability, budget.spent_since(attempt_mark), "provider_error_exhausted",
                                                0.0, exc, final=True)
                                break
                            delay = self._backoff(network_fails, pcfg)
                            self._log_retry(capability, budget.spent_since(attempt_mark), "provider_error", delay, exc)
                            time.sleep(delay)
                            continue
                    if text is None:
                        raise last_error or AIProviderError("Provider call failed.")

                    parse_attempts += 1
                    try:
                        parsed = parse_json_object(text)
                        break
                    except json.JSONDecodeError as exc:
                        last_error = AIParseError(str(exc))
                        logger.warning("AI JSON parse failed (attempt %d): %s", parse_attempts, exc)
                        continue
                if parsed is None:
                    raise last_error or AIParseError("Model returned invalid JSON.")

                validate_attempts += 1
                try:
                    data = schema(**parsed)  # type: ignore[call-arg]
                except Exception as exc:
                    last_error = AIValidationError(str(exc))
                    logger.warning("AI schema validation failed (attempt %d): %s", validate_attempts, exc)
                    continue

                execution = self._execution(
                    capability, selection.provider, model_name, True, start,
                    budget.spent_since(attempt_mark), parse_attempts, validate_attempts, usage,
                )
                self._record(selection.provider, model_name, execution, timed_out=False)
                usage_tracker.qa_cache_put(fingerprint, parsed)  # QA-mode reuse
                return data, execution

            raise last_error or AIValidationError("Response failed schema validation.")

        except AIError as exc:
            execution = self._execution(
                capability, selection.provider, model_name, False, start,
                budget.spent_since(attempt_mark), parse_attempts, validate_attempts, usage, error=str(exc),
            )
            self._record(selection.provider, model_name, execution, timed_out=timed_out)
            self._log(execution)
            raise

    # -- retry backoff + observability (A4) --------------------------------
    @staticmethod
    def _backoff(attempt: int, cfg) -> float:
        """Exponential backoff with equal jitter. `attempt` is 1-based.

        The math lives in `app.ai.utils.backoff` so the embedding service retries
        on exactly the same curve; this stays as the orchestrator's spelling of it.
        """
        return exponential_backoff(
            attempt, base_ms=cfg.retry_base_delay_ms, cap_ms=cfg.retry_max_delay_ms
        )

    @staticmethod
    def _rate_limit_delay(exc: AIRateLimitError, attempt: int, cfg) -> float:
        """Honor Retry-After when the provider sent one (capped); otherwise fall
        back to exponential jittered backoff."""
        return rate_limit_delay(
            exc.retry_after, attempt,
            base_ms=cfg.retry_base_delay_ms, cap_ms=cfg.retry_max_delay_ms,
        )

    @staticmethod
    def _log_retry(capability, attempt: int, reason: str, delay: float, exc,
                   *, retry_after=None, final: bool = False) -> None:
        """One concise structured line per retry decision — operational evidence
        for diagnosing production reliability issues (attempt, reason, delay,
        Retry-After, outcome). Kept to a single line to avoid log noise."""
        logger.warning(
            "AI retry | capability=%s attempt=%d reason=%s delay_ms=%d retry_after=%s outcome=%s error=%s",
            getattr(capability, "value", capability), attempt, reason, round(delay * 1000),
            ("none" if retry_after is None else f"{retry_after}s"),
            ("giving_up" if final else "retrying"), str(exc)[:120],
        )

    # -- helpers -----------------------------------------------------------
    @staticmethod
    def _execution(capability, provider, model, success, start, calls, parses, validates, usage, error=None):
        return AIExecution(
            capability=capability.value, provider=provider, model=model, success=success,
            latency_ms=round((time.time() - start) * 1000),
            network_attempts=calls, json_attempts=parses, schema_attempts=validates,
            usage=usage, error=error,
        )

    @staticmethod
    def _record(provider, model, execution: AIExecution, *, timeout: bool = False, timed_out: bool = False) -> None:
        usage_tracker.record(
            provider=provider, model=model, success=execution.success,
            latency_ms=execution.latency_ms,
            prompt_tokens=execution.usage.prompt_tokens,
            completion_tokens=execution.usage.completion_tokens,
            estimated_cost=cost_of(model, execution.usage.prompt_tokens or 0, execution.usage.completion_tokens or 0),
            timeout=timeout or timed_out,
            capability=execution.capability,
            provider_calls=execution.network_attempts,
        )

    @staticmethod
    def _log(execution: AIExecution) -> None:
        logger.info(
            "AI exec | capability=%s provider=%s model=%s success=%s latency=%dms "
            "calls=%d retries=%d tokens=%s",
            execution.capability, execution.provider, execution.model, execution.success,
            execution.latency_ms, execution.network_attempts, execution.retry_count,
            execution.usage.total_tokens,
        )


#: Module-level singleton — import and call `orchestrator.run(...)`.
orchestrator = AIOrchestrator()
