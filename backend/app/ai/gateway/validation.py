"""
AI configuration validation — the one authoritative place (C9).

THIS MODULE OWNS CONFIGURATION CORRECTNESS (§9A rule 15)
--------------------------------------------------------
**Providers expose facts. Validation decides whether the configuration is
acceptable.** A provider declares what it is — its key setting, its capabilities,
its models, its retry vocabulary — and never judges whether the deployment around
it makes sense. That judgement is made here, once, for all of them.

Three properties this module must never lose:

  * **Validation never repairs configuration.** It returns findings. A validator
    that quietly corrected a value would hide the mistake it exists to reveal,
    and the operator would keep the wrong mental model of their own deployment.
  * **Validation never performs network calls.** Nothing here contacts a
    provider, and nothing here may start to. It reads settings and registries,
    and it must be safe to call on every `/health` request and at boot on a
    machine with no egress.
  * **Configuration correctness and provider availability are INDEPENDENT
    CONCEPTS.** Whether a configuration could ever work is a different question
    from whether a vendor is answering right now, and they have different fixes,
    different owners and different urgencies. Availability lives in
    `health.py` / `provider_health`, never here.

**A provider outage must never become a startup configuration failure.** A
service that refuses to restart because a vendor is having a bad afternoon has
converted someone else's incident into its own, at the worst possible moment —
during theirs. This is why nothing in this module probes anything.

**If a future provider requires provider-specific validation behaviour, extend
the validation contract rather than branching around it.** Add a fact for the
provider to declare and a check that reads it, so every provider is validated by
the same code path. A branch keyed on a provider's name is forbidden by §9A
rule 3 and is how the per-vendor drift that produced C1 and C2 returns.

WHAT THIS EXISTS TO STOP
------------------------
Every AI configuration mistake used to boot cleanly and fail later, per request,
in production. `AI_PROVIDER=grok` resolved to a chain of `['grok']` carrying a
plausible-looking model name and 503'd on every request. A typo in
`AI_FALLBACK_PROVIDERS` was silently dropped, so an operator believed they had
two fallbacks and had one. A typo in `AI_DISABLED_PROVIDERS` disabled nothing —
the incident lever already pulled, already doing nothing.

`validate_capability_routing()` has been strict and fatal since it was written,
but only for `AI_CAPABILITY_MODELS`, which is inert by default. The path every
request actually takes had no validation at all. This module gives it the same
strictness, and `validate_ai_configuration()` below is the single entry point
that runs both.

FINDINGS, NOT REPAIRS
---------------------
`check_provider_configuration()` is **pure**: it reads settings and the two
registries, returns a list of `ConfigProblem`, and never raises, never mutates,
never repairs. `app/billing/invariants.py` is the precedent — *"pure; takes rows,
returns findings, never repairs"* — and the reason is the same: the health
surface and the startup gate must reach the same verdict without one of them
re-implementing the other, and a validator that quietly corrected configuration
would hide the mistake it exists to reveal.

WHAT IS FATAL, AND WHY THE REST IS NOT
--------------------------------------
**Fatal** is reserved for closed sets — a provider name outside the registry can
never work, whatever else is true. Those are always typos and always
unrecoverable, so they should fail a deploy rather than a customer's request.

**Three things are deliberately NOT fatal**, because refusing to boot would be
the worse bug in each case:

  * **No credential configured.** This product supports running without AI at
    all — parsing, auth, roles and candidates work, and `/health` already reports
    `llm: not_configured`. Making a missing key fatal would break every developer
    who has not set one, and would take the whole product down over a feature.
  * **Every provider disabled.** That is the incident lever `AI_DISABLED_PROVIDERS`
    exists to be. Turning "AI is switched off" into "the service will not start"
    inverts the standing rule that a subsystem's failure must not become
    everyone's outage. The orchestrator already refuses such a request loudly and
    non-retryably.
  * **An unregistered role-model override.** `model_registry.py` documents that
    *"unknown models still work — they just lack metadata/pricing until
    registered"*, so an unrecognised model name is a SUPPORTED state, not an
    error: a typo and a model released last week are indistinguishable from here.
    Capability routing can be stricter about this because it *infers the provider
    from the model*; a role override already knows its provider, so it cannot.

Every non-fatal finding is still reported — logged at boot and surfaced in
`config_snapshot()`. Reported is not the same as ignored.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Iterable

from app.ai.gateway.model_registry import get_model
from app.ai.gateway.provider_registry import available_provider_specs, get_provider_spec
from app.ai.gateway.roles import ROLE_MODEL_SETTING, ModelRole
from app.core.config import settings

logger = logging.getLogger("app.ai")

#: Severity is a two-value set on purpose. A third ("info") would immediately
#: collect everything nobody wanted to act on, and the distinction that matters
#: is exactly "does this stop the deploy".
FATAL = "fatal"
WARNING = "warning"


class AIConfigurationError(RuntimeError):
    """Invalid AI provider configuration. Fatal at startup, like RoutingConfigError."""


@dataclass(frozen=True)
class ConfigProblem:
    """One finding. `setting` names what to edit — a validation message that does
    not say which variable is wrong makes the reader grep for it. `provider` is
    carried as a field rather than left to be recovered from the message, because
    matching a provider name against prose finds 'openai' inside 'openai_compat'.
    """

    severity: str
    setting: str
    message: str
    provider: str = ""

    def __str__(self) -> str:
        return f"{self.setting}: {self.message}"


# ── the pure check ───────────────────────────────────────────────────────────
def check_provider_configuration() -> list[ConfigProblem]:
    """Inspect AI provider configuration and return every problem found.

    Never raises, never repairs. Callers decide what a finding means:
    `validate_ai_configuration()` refuses to boot on a fatal one;
    `config_snapshot()` reports them all.
    """
    problems: list[ConfigProblem] = []
    # Known = has gateway metadata. Deliberately NOT intersected with the
    # instance registry: `hashing` is a genuinely registered provider that serves
    # embeddings only, and calling it "unknown" would send an operator hunting a
    # typo that is not there. Being registered and being usable for reasoning are
    # separate questions, answered separately below.
    known = _known_provider_names()

    primary = settings.reasoning_provider
    problems += _check_names([primary], "AI_PROVIDER", known, severity=FATAL)
    problems += _check_names(settings.fallback_providers, "AI_FALLBACK_PROVIDERS",
                             known, severity=FATAL)
    problems += _check_names(sorted(settings.disabled_providers), "AI_DISABLED_PROVIDERS",
                             known, severity=FATAL)
    problems += _check_names(_provider_config_keys(), "AI_PROVIDERS", known, severity=FATAL)

    problems += _check_can_reason(primary, settings.fallback_providers, known)
    problems += _check_environment(primary, settings.fallback_providers)
    problems += _check_routable_chain(primary)
    problems += _check_role_models()
    problems += _check_provider_default_models()
    problems += _check_removed_settings()
    problems += _check_credentials()
    return problems


# ── the startup gate ─────────────────────────────────────────────────────────
def validate_ai_configuration() -> None:
    """Validate ALL AI configuration at boot. Raises on a fatal problem.

    The single entry point: provider configuration first, then the capability
    routing table, so there is one call to make and one place to look.
    """
    problems = check_provider_configuration()
    for problem in problems:
        if problem.severity == WARNING:
            logger.warning("AI configuration: %s", problem)

    fatal = [p for p in problems if p.severity == FATAL]
    if fatal:
        raise AIConfigurationError(
            "Invalid AI provider configuration — refusing to start:\n  - "
            + "\n  - ".join(str(p) for p in fatal)
        )

    # Unchanged, and still fatal on its own terms. Kept as a separate function
    # because it validates a different thing: the capability→model table, where
    # the provider is INFERRED from the model and unknown models are therefore
    # errors rather than tolerated (see the module docstring).
    from app.ai.gateway.capability_routing import validate_capability_routing

    validate_capability_routing()

    if not problems:
        logger.info("AI provider configuration validated: provider=%s chain=%s",
                    settings.reasoning_provider,
                    ",".join(_configured_chain()) or "none")


# ── individual checks ────────────────────────────────────────────────────────
def _known_provider_names() -> set[str]:
    """Every provider the gateway has metadata for, reasoning or not."""
    return {s.name for s in available_provider_specs()}


def _provider_config_keys() -> list[str]:
    from app.ai.gateway.provider_config import canonical_provider

    raw = settings.AI_PROVIDERS or {}
    if not isinstance(raw, dict):
        return []
    return [canonical_provider(k) for k in raw]


def _check_names(names: Iterable[str], setting: str, known: set[str],
                 *, severity: str) -> list[ConfigProblem]:
    out = []
    for name in names:
        if name and name not in known:
            out.append(ConfigProblem(
                severity, setting,
                f"unknown provider '{name}'. Known: {', '.join(sorted(known))}.",
                provider=name,
            ))
    return out


def _check_can_reason(primary: str, fallbacks: Iterable[str],
                      known: set[str]) -> list[ConfigProblem]:
    """A reasoning chain must be made of providers that can actually reason.

    Two distinct faults, reported distinctly because they have different fixes:

      * the provider declares no reasoning capability — `hashing` is the live
        example, registered and correct but for embeddings only. Declared, never
        inferred (§9A rule 10): this reads the capability off the spec rather
        than guessing from the name.
      * the provider declares reasoning but has no implementation to construct —
        a half-registration, where gateway metadata exists and the class does
        not. That resolves to a chain entry which then explodes at
        `get_provider()`, per request.
    """
    from app.ai.providers.registry import available_providers

    constructible = set(available_providers())
    out = []
    for name in [primary, *fallbacks]:
        if not name or name not in known:
            continue  # already reported as unknown
        setting = "AI_PROVIDER" if name == primary else "AI_FALLBACK_PROVIDERS"
        spec = get_provider_spec(name)
        if spec and not spec.supports("reasoning"):
            out.append(ConfigProblem(
                FATAL, setting,
                f"provider '{name}' is registered but does not support reasoning "
                f"(it declares: {', '.join(sorted(spec.capabilities)) or 'nothing'}), "
                f"so it cannot serve an LLM request.",
                provider=name,
            ))
        elif name not in constructible:
            out.append(ConfigProblem(
                FATAL, setting,
                f"provider '{name}' has gateway metadata but no implementation "
                f"registered in app/ai/providers/registry.py, so every request "
                f"routed to it would fail.",
                provider=name,
            ))
    return out


def _check_environment(primary: str, fallbacks: Iterable[str]) -> list[ConfigProblem]:
    """Provider/environment combinations that must never ship.

    The fake already refuses to construct in production, but that refusal arrives
    per request, after a deploy. A deploy is the right thing to fail.
    """
    if (settings.ENVIRONMENT or "").strip().lower() != "production":
        return []
    named = [n for n in [primary, *fallbacks] if n == "fake"]
    if not named:
        return []
    setting = "AI_PROVIDER" if primary == "fake" else "AI_FALLBACK_PROVIDERS"
    return [ConfigProblem(
        FATAL, setting,
        "the 'fake' provider is selected in production. It answers without a "
        "model, so the product would appear to work while every candidate "
        "assessment was fabricated.",
        provider="fake",
    )]


def _check_routable_chain(primary: str) -> list[ConfigProblem]:
    """Warn when nothing is left to route to — see the module docstring for why
    this is a warning and not a refusal to boot."""
    from app.ai.gateway.gateway import routable_providers

    if routable_providers():
        return []
    disabled = ", ".join(sorted(settings.disabled_providers)) or "none"
    return [ConfigProblem(
        WARNING, "AI_DISABLED_PROVIDERS",
        f"every provider in the chain is disabled (primary '{primary}', "
        f"disabled: {disabled}), so no AI request can be served. The service "
        f"still starts because everything that is not AI still works.",
    )]


def _check_role_models() -> list[ConfigProblem]:
    """Role overrides: unknown model, or a model belonging to a provider that is
    not in the chain. Both warnings — see the module docstring."""
    out = []
    chain = {settings.reasoning_provider, *settings.fallback_providers}
    for role, setting in ROLE_MODEL_SETTING.items():
        name = (getattr(settings, setting, "") or "").strip()
        if not name:
            continue
        spec = get_model(name)
        if spec is None:
            out.append(ConfigProblem(
                WARNING, setting,
                f"model '{name}' is not in the model registry, so it has no "
                f"metadata or pricing. This is tolerated — check it is not a typo.",
            ))
        elif spec.provider not in chain:
            out.append(ConfigProblem(
                WARNING, setting,
                f"model '{name}' belongs to provider '{spec.provider}', which is "
                f"not in the configured chain ({', '.join(sorted(chain))}). It "
                f"will be sent to whichever provider answers.",
            ))
    return out


def _check_provider_default_models() -> list[ConfigProblem]:
    """`AI_PROVIDERS[p].default_model` is now a resolution input at a higher
    precedence than the role override (C5), so it gets the same scrutiny they do.

    Warnings for the same reason (D1.23): the model registry tolerates unknown
    models by design, so a typo and a model released last week are
    indistinguishable from here.
    """
    from app.ai.gateway.provider_config import canonical_provider

    raw = settings.AI_PROVIDERS or {}
    if not isinstance(raw, dict):
        return []
    out = []
    for key, overrides in raw.items():
        if not isinstance(overrides, dict):
            continue
        name = str(overrides.get("default_model") or overrides.get("model") or "").strip()
        if not name:
            continue
        provider = canonical_provider(key)
        spec = get_model(name)
        if spec is None:
            out.append(ConfigProblem(
                WARNING, "AI_PROVIDERS",
                f"'{provider}'.default_model is '{name}', which is not in the "
                f"model registry, so it has no metadata or pricing. This is "
                f"tolerated — check it is not a typo.",
                provider=provider,
            ))
        elif spec.provider != provider:
            out.append(ConfigProblem(
                WARNING, "AI_PROVIDERS",
                f"'{provider}'.default_model is '{name}', which is registered to "
                f"provider '{spec.provider}'. It will be sent to '{provider}', "
                f"which is unlikely to recognise it.",
                provider=provider,
            ))
    return out


def _check_removed_settings() -> list[ConfigProblem]:
    """Report settings this codebase no longer reads.

    Silently ignoring a variable an operator deliberately set is the failure this
    whole module exists to prevent — a removed setting is invisible otherwise,
    because `Settings` is configured with `extra="ignore"`. Read from the process
    environment rather than from `Settings`, precisely because the field is gone.
    """
    import os

    if not (os.environ.get("AI_DEFAULT_MODEL") or "").strip():
        return []
    return [ConfigProblem(
        WARNING, "AI_DEFAULT_MODEL",
        "this setting was removed (C4) and is no longer read. It was one "
        "vendor's model name used as the cross-provider last resort, so any "
        "provider with an incomplete role map was handed it. Set the model on "
        "the provider that will serve it — AI_PROVIDERS['<provider>']"
        ".default_model — or leave it to the provider's own declared default.",
    )]


def _check_credentials() -> list[ConfigProblem]:
    """Warn when nothing in the chain has a credential. Not fatal: running
    without AI is a configuration this product supports."""
    from app.ai.gateway.gateway import routable_providers

    chain = routable_providers()
    if not chain or _configured_chain():
        return []
    return [ConfigProblem(
        WARNING, "provider API keys",
        f"no provider in the chain ({', '.join(chain)}) has its API key set, so "
        f"AI endpoints will return 503. Everything that is not AI still works.",
    )]


def _configured_chain() -> list[str]:
    from app.ai.gateway.gateway import configured_reasoning_providers

    return configured_reasoning_providers()


# ── the four-way state a health surface needs ────────────────────────────────
#: Deliberately distinct words, because they have different fixes:
#:   disabled       — switched off on purpose; not a fault
#:   misconfigured  — the configuration names something that cannot work
#:   not_configured — valid, but has no credential; AI is simply off
#:   configured     — usable
DISABLED = "disabled"
MISCONFIGURED = "misconfigured"
NOT_CONFIGURED = "not_configured"
CONFIGURED = "configured"


def configuration_state(provider: str, problems: list[ConfigProblem]) -> str:
    """The configuration state of ONE provider, for a health surface.

    Note what this is not: it is not liveness. A provider can be `configured`
    here and unreachable right now — that is `provider_health`, a different
    question with a different answer, and conflating them is how a temporary
    outage gets diagnosed as a config error at 3am.

    A provider is only `misconfigured` when a FATAL finding names it. An
    embeddings-only provider such as `hashing` is perfectly configured while
    being useless for reasoning; it becomes a fault only when something puts it
    in the reasoning chain, and then the finding says so.
    """
    from app.ai.providers.registry import get_provider

    name = (provider or "").lower()
    if name in settings.disabled_providers:
        return DISABLED
    if any(p.severity == FATAL and p.provider == name for p in problems):
        return MISCONFIGURED
    try:
        return CONFIGURED if get_provider(name).is_configured() else NOT_CONFIGURED
    except Exception:  # noqa: BLE001 — no LLM implementation (e.g. embeddings-only)
        spec = get_provider_spec(name)
        key = spec.api_key_setting if spec else ""
        if not key:
            return CONFIGURED
        return CONFIGURED if (getattr(settings, key, "") or "").strip() else NOT_CONFIGURED
