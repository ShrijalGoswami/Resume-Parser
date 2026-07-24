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
import random
import time
from typing import Optional, Type, TypeVar

from app.ai.config import get_ai_config
from app.ai.gateway import ModelRole, cost_of, fallback_chain, resolve, usage_tracker
from app.ai.gateway.capability_routing import route_for
from app.ai.gateway.gateway import ModelSelection
from app.ai.gateway.health import health_manager, kind_for_error
from app.ai.gateway.provider_config import get_provider_config
from app.ai.prompts.registry import get_prompt
from app.ai.providers.registry import get_provider
from app.ai.schemas.base import AIExecution, AIResult, Capability, TokenUsage
from app.ai.utils.errors import (
    AIConfigError, AIError, AIParseError, AIProviderError, AIRateLimitError,
    AITimeoutError, AIValidationError,
)
from app.ai.utils.json import parse_json_object

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

        # Capability→provider routing (M5) — INERT by default: route_for returns
        # None unless routing is enabled AND the capability is mapped, so today this
        # changes nothing. When set, it pins the capability to a provider.
        routed = route_for(capability.value) if provider is None else None
        effective_provider = provider or routed

        # Provider + model come from the Gateway. An explicit/routed provider (or an
        # explicit model) pins a single selection; otherwise the fallback chain.
        if effective_provider or model:
            base = resolve(role, provider=effective_provider)
            selections = [ModelSelection(provider=(effective_provider or base.provider), model=(model or base.model), role=role)]
        else:
            selections = fallback_chain(role)

        # Health-aware ordering: try providers currently HEALTHY first; keep
        # unhealthy ones only as a last resort (so we never hard-fail purely on
        # stale health). This is what stops us re-calling a known-down provider.
        healthy = [s for s in selections if health_manager.is_available(s.provider)]
        unhealthy = [s for s in selections if not health_manager.is_available(s.provider)]
        ordered = healthy + unhealthy
        primary = selections[0].provider if selections else ""

        last_error: Optional[AIError] = None
        for selection in ordered:
            try:
                data, execution = self._attempt(
                    capability, selection, system, user, schema, cfg, temp, max_tok, timeout_override,
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
    def _attempt(self, capability, selection, system, user, schema, cfg, temp, max_tok, timeout_override):
        prov = get_provider(selection.provider)  # may raise AIConfigError → fallback
        # Per-provider config (M2): timeout / retry policy / default-model override,
        # each falling back to the global AI_* defaults. Behaviour is unchanged when
        # AI_PROVIDERS is empty.
        pcfg = get_provider_config(selection.provider)
        model_name = pcfg.default_model or selection.model
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

        provider_calls = parse_attempts = validate_attempts = 0
        usage = TokenUsage()
        last_error: Optional[AIError] = None
        timed_out = False

        try:
            for _ in range(cfg.max_schema_retries):
                parsed: Optional[dict] = None
                for _ in range(cfg.max_json_retries):
                    text: Optional[str] = None
                    # Network attempts and transient-rate-limit retries have
                    # SEPARATE bounded budgets, each with backoff (A4). Quota
                    # exhaustion is never retried (it won't clear today).
                    network_fails = rate_limit_retries = 0
                    while True:
                        provider_calls += 1
                        try:
                            resp = prov.complete(
                                system=system, user=user, model=model_name,
                                temperature=temp, max_tokens=max_tok, timeout_seconds=timeout,
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
                                    capability, provider_calls,
                                    "rate_limit_quota" if exc.is_quota else "rate_limit_exhausted",
                                    0.0, exc, retry_after=exc.retry_after, final=True,
                                )
                                break  # fail fast → outer fallback loop (if any)
                            rate_limit_retries += 1
                            delay = self._rate_limit_delay(exc, rate_limit_retries, pcfg)
                            self._log_retry(capability, provider_calls, "rate_limit", delay, exc,
                                            retry_after=exc.retry_after)
                            time.sleep(delay)
                            continue
                        except AITimeoutError as exc:
                            timed_out = True
                            last_error = exc
                            network_fails += 1
                            if network_fails >= pcfg.max_network_retries:
                                self._log_retry(capability, provider_calls, "timeout_exhausted",
                                                0.0, exc, final=True)
                                break
                            delay = self._backoff(network_fails, pcfg)
                            self._log_retry(capability, provider_calls, "timeout", delay, exc)
                            time.sleep(delay)
                            continue
                        except AIProviderError as exc:
                            last_error = exc
                            network_fails += 1
                            if network_fails >= pcfg.max_network_retries:
                                self._log_retry(capability, provider_calls, "provider_error_exhausted",
                                                0.0, exc, final=True)
                                break
                            delay = self._backoff(network_fails, pcfg)
                            self._log_retry(capability, provider_calls, "provider_error", delay, exc)
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
                    provider_calls, parse_attempts, validate_attempts, usage,
                )
                self._record(selection.provider, model_name, execution, timed_out=False)
                usage_tracker.qa_cache_put(fingerprint, parsed)  # QA-mode reuse
                return data, execution

            raise last_error or AIValidationError("Response failed schema validation.")

        except AIError as exc:
            execution = self._execution(
                capability, selection.provider, model_name, False, start,
                provider_calls, parse_attempts, validate_attempts, usage, error=str(exc),
            )
            self._record(selection.provider, model_name, execution, timed_out=timed_out)
            self._log(execution)
            raise

    # -- retry backoff + observability (A4) --------------------------------
    @staticmethod
    def _backoff(attempt: int, cfg) -> float:
        """Exponential backoff with EQUAL jitter, capped. `attempt` is 1-based.
        Equal jitter (half fixed + half random) guarantees a non-trivial minimum
        wait, so backoff is provable in tests yet still de-correlates retries."""
        base = cfg.retry_base_delay_ms / 1000.0
        cap = cfg.retry_max_delay_ms / 1000.0
        raw = min(cap, base * (2 ** (attempt - 1)))
        return raw / 2 + random.uniform(0, raw / 2)

    @staticmethod
    def _rate_limit_delay(exc: AIRateLimitError, attempt: int, cfg) -> float:
        """Honor Retry-After when the provider sent one (capped); otherwise fall
        back to exponential jittered backoff."""
        cap = cfg.retry_max_delay_ms / 1000.0
        if exc.retry_after is not None:
            return min(cap, float(exc.retry_after))
        return AIOrchestrator._backoff(attempt, cfg)

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
