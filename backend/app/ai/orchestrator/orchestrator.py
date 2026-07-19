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
from app.ai.gateway import ModelRole, cost_of, fallback_chain, resolve, usage_tracker
from app.ai.gateway.gateway import ModelSelection
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
        timeout = timeout_seconds or cfg.timeout_seconds

        template = get_prompt(capability)
        system = template.system
        user = template.build_user(**variables)

        # Provider + model come from the Gateway. An explicit provider/model pins a
        # single selection; otherwise the configurable fallback chain is used.
        if provider or model:
            base = resolve(role, provider=provider)
            selections = [ModelSelection(provider=(provider or base.provider), model=(model or base.model), role=role)]
        else:
            selections = fallback_chain(role)

        last_error: Optional[AIError] = None
        for selection in selections:
            try:
                data, execution = self._attempt(
                    capability, selection, system, user, schema, cfg, temp, max_tok, timeout,
                )
                self._log(execution)
                return AIResult(data=data, execution=execution)  # type: ignore[return-value]
            except AIError as exc:
                last_error = exc
                if len(selections) > 1:
                    logger.warning(
                        "AI gateway: provider '%s' failed (%s); trying fallback.",
                        selection.provider, type(exc).__name__,
                    )
                continue

        # All providers exhausted.
        raise last_error or AIProviderError("All configured providers failed.")

    # -- one provider attempt (owns the full retry ladder) -----------------
    def _attempt(self, capability, selection, system, user, schema, cfg, temp, max_tok, timeout):
        prov = get_provider(selection.provider)  # may raise AIConfigError → fallback
        model_name = selection.model
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
                    for _ in range(cfg.max_network_retries):
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
                            # A rate-limit / quota error will NOT clear on an
                            # immediate retry — retrying only burns more quota.
                            # Stop this provider now (fallback provider, if any,
                            # is still tried by the outer run() loop).
                            last_error = exc
                            logger.warning("AI provider rate-limited (call %d) — not retrying: %s", provider_calls, exc)
                            break
                        except AITimeoutError as exc:
                            timed_out = True
                            last_error = exc
                            logger.warning("AI provider timeout (call %d): %s", provider_calls, exc)
                            continue
                        except AIProviderError as exc:
                            last_error = exc
                            logger.warning("AI provider error (call %d): %s", provider_calls, exc)
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
