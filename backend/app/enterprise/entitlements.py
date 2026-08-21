"""
The entitlement engine — "has this organization bought this?"

This is the THIRD authorization axis and it is orthogonal to the other two:

    authentication   who are you            core/auth.py
    authorization    what may your ROLE do  enterprise/rbac.py    → 403
    entitlement      what has your ORG paid enterprise/*this*     → 402

Keeping them separate is not tidiness. A recruiter on FREE and a viewer on PRO
both fail to open the Copilot, but the first needs a plan upgrade and the second
needs an admin — and telling a paying admin they "lack permission" is the worst
sentence a monetized product can show. Two axes, two status codes, two messages.

Decisions, not booleans
-----------------------
Every method returns a `Decision`. A bare `bool` cannot say which plan unlocks
the feature or how much of the quota is left, so every call site would have to
re-derive it — which is exactly the `if plan == "pro"` this design forbids, one
layer up. Because `Decision` carries `required_plan`, the upsell copy is DERIVED
from the catalog and no component ever hardcodes a tier name.

Resolution order
----------------
    plan status inactive        → everything above FREE closes
    entitlement grant           → may ADD above the plan (commercial, expiring)
    catalog min_plan            → the ceiling
    org_feature_flags override  → may only SUBTRACT (operational kill-switch)

The last line is a change from the pre-monetization behaviour, where an override
row could switch a capability ON above the paid plan. That made a support toggle
and a commercial decision indistinguishable in the data.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from fastapi import HTTPException, status

from app.core.config import settings
from app.enterprise.catalog import (
    FEATURES, METRIC_CAMPAIGNS, METRIC_CAMPAIGN_CANDIDATES,
    METRIC_COPILOT_QUESTIONS, METRIC_INTERVIEW_PACKS, METRIC_MEMBERS,
    METRIC_RESUMES, METRIC_LABELS, PLAN_FEATURE_EXTRAS, PLAN_LABELS, Plan,
    RULESET_FOUNDING, UNLIMITED, campaign_candidate_limit, feature_min_plan,
    get_feature, is_at_least, is_unlimited, limit_for, metric_window,
    minimum_plan_for_campaign_candidates, minimum_plan_for_limit,
    normalize_plan, normalize_ruleset, resume_window,
)
from app.enterprise.usage import UsageSnapshot

logger = logging.getLogger(__name__)

# Reasons — these travel to the client as `code` and drive which surface it shows.
REASON_OK = "ok"
REASON_FEATURE = "feature_not_in_plan"
REASON_LIMIT = "limit_exceeded"
REASON_INACTIVE = "plan_inactive"

#: Subscription statuses that still grant the paid plan. `past_due` keeps working
#: on purpose: dunning is a billing conversation, not a reason to lock a team out
#: of its hiring pipeline mid-week.
ACTIVE_STATUSES = frozenset({"active", "trialing", "past_due"})


class PlanError(HTTPException):
    """402 with a machine-readable body, so the client renders the exact upsell
    without parsing prose."""

    def __init__(self, decision: "Decision"):
        super().__init__(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=decision.as_error())
        self.decision = decision


@dataclass(frozen=True)
class Decision:
    allowed: bool
    reason: str = REASON_OK
    message: str = ""
    feature: Optional[str] = None
    metric: Optional[str] = None
    current_plan: str = Plan.free.value
    required_plan: Optional[str] = None
    upgrade_target: Optional[str] = None
    limit: Optional[int] = None
    used: Optional[int] = None
    plan_version: int = 1
    extra: dict = field(default_factory=dict)

    def __bool__(self) -> bool:
        """`if svc.can_use_copilot():` reads naturally and stays correct.

        Convenience only — the enforcement paths use `raise_for_denied()` so the
        reason and the upgrade target reach the client.
        """
        return self.allowed

    @property
    def remaining(self) -> Optional[int]:
        if self.limit is None or self.used is None or is_unlimited(self.limit):
            return None
        return max(0, self.limit - self.used)

    def raise_for_denied(self) -> "Decision":
        if not self.allowed and enforcement_enabled():
            raise PlanError(self)
        if not self.allowed:
            logger.warning(
                "entitlement.not_enforced | reason=%s feature=%s metric=%s plan=%s "
                "required=%s used=%s limit=%s (ENTITLEMENT_ENFORCEMENT=off)",
                self.reason, self.feature, self.metric, self.current_plan,
                self.required_plan, self.used, self.limit,
            )
        return self

    def as_error(self) -> dict:
        return {
            "detail": self.message,
            "code": self.reason,
            "feature": self.feature,
            "metric": self.metric,
            "current_plan": self.current_plan,
            "required_plan": self.required_plan,
            "upgrade_target": self.upgrade_target,
            "limit": self.limit,
            "used": self.used,
            "remaining": self.remaining,
            "plan_version": self.plan_version,
        }

    def as_dict(self) -> dict:
        return {"allowed": self.allowed, **self.as_error()}


def enforcement_enabled() -> bool:
    """`ENTITLEMENT_ENFORCEMENT=off` is the rollback lever: one environment
    variable disables every gate without a deploy. Anything else enforces."""
    return (getattr(settings, "ENTITLEMENT_ENFORCEMENT", "on") or "on").strip().lower() != "off"


class PlanService:
    """Entitlement decisions for one organization.

    Constructed from already-resolved state — it performs NO I/O, so it is cheap
    to build per request and trivially testable without a database.
    """

    def __init__(
        self,
        *,
        plan: str,
        ruleset: str = "",
        plan_status: str = "active",
        plan_version: int = 1,
        usage: Optional[UsageSnapshot] = None,
        grants: Optional[set[str]] = None,
        feature_overrides: Optional[dict[str, bool]] = None,
        limit_overrides: Optional[dict] = None,
    ):
        self.plan = normalize_plan(plan)
        self.ruleset = normalize_ruleset(ruleset)
        self.plan_status = (plan_status or "active").strip().lower()
        self.plan_version = plan_version
        self.usage = usage or UsageSnapshot()
        self.grants = set(grants or ())
        self.feature_overrides = dict(feature_overrides or {})
        self.limit_overrides = dict(limit_overrides or {})

    # ── plan state ──────────────────────────────────────────────────────────
    @property
    def is_founding(self) -> bool:
        return self.ruleset == RULESET_FOUNDING

    @property
    def plan_active(self) -> bool:
        return self.plan_status in ACTIVE_STATUSES

    @property
    def effective_plan(self) -> Plan:
        """A lapsed subscription resolves to FREE.

        FOUNDING accounts are exempt: their plan predates billing entirely, and
        expiring them on a status field they never had would break the
        grandfather promise.
        """
        if self.is_founding or self.plan_active:
            return self.plan
        return Plan.free

    # ── features ────────────────────────────────────────────────────────────
    def has_feature(self, key: str) -> bool:
        return self.feature(key).allowed

    def feature(self, key: str) -> Decision:
        """Resolve one capability. See the module docstring for precedence."""
        spec = get_feature(key)
        if spec is None:
            # An unknown key is a bug, not a plan problem. Deny, and say so
            # honestly rather than inviting an upgrade that would not help.
            return Decision(
                allowed=False, reason=REASON_FEATURE, feature=key,
                current_plan=self.plan.value, plan_version=self.plan_version,
                message=f"Unknown capability '{key}'.",
            )

        plan = self.effective_plan
        base = self._base_features_allow(key, plan)
        granted = key in self.grants
        allowed = base or granted

        # Overrides may only subtract (see module docstring).
        if allowed and self.feature_overrides.get(key) is False:
            return Decision(
                allowed=False, reason=REASON_FEATURE, feature=key,
                current_plan=self.plan.value, required_plan=None, upgrade_target=None,
                plan_version=self.plan_version,
                message=f"{spec.label} has been turned off for your organization.",
                extra={"disabled_by_org": True},
            )

        if allowed:
            return Decision(allowed=True, feature=key, current_plan=self.plan.value,
                            plan_version=self.plan_version, message="")

        if not self.plan_active and not self.is_founding:
            return Decision(
                allowed=False, reason=REASON_INACTIVE, feature=key,
                current_plan=self.plan.value, required_plan=self.plan.value,
                upgrade_target=self.plan.value, plan_version=self.plan_version,
                message=f"Your subscription is {self.plan_status}. Reactivate billing to use {spec.label}.",
            )

        required = feature_min_plan(key) or Plan.enterprise
        return Decision(
            allowed=False, reason=REASON_FEATURE, feature=key,
            current_plan=self.plan.value, required_plan=required.value,
            upgrade_target=required.value, plan_version=self.plan_version,
            message=f"{spec.label} is available on the {PLAN_LABELS[required]} plan.",
        )

    def _base_features_allow(self, key: str, plan: Plan) -> bool:
        if self.is_founding:
            from app.enterprise.catalog import FOUNDING_FEATURES
            return key in FOUNDING_FEATURES
        # A plan's extras (the paid trials' metered slice of higher-tier
        # capabilities) count as base inclusion; their VOLUME is bounded by the
        # metered limits, not here.
        if key in PLAN_FEATURE_EXTRAS.get(plan, ()):
            return True
        spec = FEATURES.get(key)
        return bool(spec and is_at_least(plan, spec.min_plan))

    # ── quotas ──────────────────────────────────────────────────────────────
    def quota(self, metric: str, requested: int = 1) -> Decision:
        """Would consuming `requested` units of `metric` stay within the plan?"""
        plan = self.effective_plan
        limit = limit_for(plan, metric, ruleset=self.ruleset, overrides=self.limit_overrides)
        used = self.usage.used_for(metric, plan)
        noun = METRIC_LABELS.get(metric, metric)

        if is_unlimited(limit):
            return Decision(allowed=True, metric=metric, current_plan=self.plan.value,
                            limit=UNLIMITED, used=used, plan_version=self.plan_version)

        if used + requested <= limit:
            return Decision(allowed=True, metric=metric, current_plan=self.plan.value,
                            limit=limit, used=used, plan_version=self.plan_version)

        required = minimum_plan_for_limit(metric, used + requested)
        # `required` is None only when no plan can satisfy the request; the
        # honest message then is not "upgrade" but "this is the ceiling".
        target = required.value if required else None
        if required and is_at_least(self.plan, required):
            # Already on (or above) the cheapest plan that would fit — the answer
            # is not an upgrade. Happens when limit_overrides lower an allowance.
            target = None

        # A batch request needs to hear what the BATCH needs. "You've used 0 of 2"
        # is confusing when the answer is no because three were requested — the
        # user reads it as having used nothing and being refused anyway.
        remaining = max(0, limit - used)
        if requested > 1:
            head = (f"This needs {requested} {noun}; {remaining} of {limit} "
                    f"remain on the {PLAN_LABELS[plan]} plan.")
        else:
            head = f"You've used {used} of {limit} {noun} on the {PLAN_LABELS[plan]} plan."
        message = f"{head} Upgrade to {PLAN_LABELS[required]} for more." if target else head

        return Decision(
            allowed=False, reason=REASON_LIMIT, metric=metric,
            current_plan=self.plan.value, required_plan=target, upgrade_target=target,
            limit=limit, used=used, plan_version=self.plan_version, message=message,
            extra={"requested": requested},
        )

    # ── the named acts ──────────────────────────────────────────────────────
    # Every method is named for what the user is trying to DO. No caller ever
    # names a plan.
    def can_upload_resume(self, count: int = 1) -> Decision:
        return self.quota(METRIC_RESUMES, count)

    def can_invite_member(self, count: int = 1) -> Decision:
        return self.quota(METRIC_MEMBERS, count)

    def can_create_campaign(self, count: int = 1) -> Decision:
        return self.quota(METRIC_CAMPAIGNS, count)

    def can_analyze_full(self) -> Decision:
        return self.feature("full_resume_analysis")

    def can_compare_candidates(self) -> Decision:
        return self.feature("candidate_comparison")

    def can_use_copilot(self) -> Decision:
        return self.feature("ai_copilot")

    def can_use_semantic_search(self) -> Decision:
        return self.feature("semantic_search")

    def can_use_interview_ai(self) -> Decision:
        return self.feature("interview_intelligence")

    def can_generate_interview_pack(self, count: int = 1) -> Decision:
        """Feature gate AND volume quota, in that order.

        Every generation call — full pack or scoped regeneration — is one
        credit: each is a full orchestrator round-trip and costs the same order
        of tokens. The Interview Trial's single credit is spent by whichever
        generation happens first.
        """
        gate = self.feature("interview_intelligence")
        if not gate.allowed:
            return gate
        return self.quota(METRIC_INTERVIEW_PACKS, count)

    def can_ask_copilot(self, count: int = 1) -> Decision:
        """Feature gate AND volume quota for one Copilot question."""
        gate = self.feature("ai_copilot")
        if not gate.allowed:
            return gate
        return self.quota(METRIC_COPILOT_QUESTIONS, count)

    def can_add_campaign_candidates(self, existing: int, adding: int = 1) -> Decision:
        """Would this campaign stay within the plan's per-campaign candidate cap?

        `existing` is a live count of the campaign's candidates — this limit is
        scoped per CAMPAIGN, so it cannot come from the org usage snapshot.
        """
        plan = self.effective_plan
        limit = campaign_candidate_limit(
            plan, ruleset=self.ruleset, overrides=self.limit_overrides
        )
        if is_unlimited(limit):
            return Decision(allowed=True, metric=METRIC_CAMPAIGN_CANDIDATES,
                            current_plan=self.plan.value, limit=UNLIMITED,
                            used=existing, plan_version=self.plan_version)
        if existing + adding <= limit:
            return Decision(allowed=True, metric=METRIC_CAMPAIGN_CANDIDATES,
                            current_plan=self.plan.value, limit=limit,
                            used=existing, plan_version=self.plan_version)

        required = minimum_plan_for_campaign_candidates(existing + adding, above=plan)
        target = required.value if required else None
        noun = METRIC_LABELS[METRIC_CAMPAIGN_CANDIDATES]
        remaining = max(0, limit - existing)
        if adding > 1:
            head = (f"This adds {adding} candidates; {remaining} of {limit} "
                    f"{noun} remain on the {PLAN_LABELS[plan]} plan.")
        else:
            head = (f"This role already holds {existing} of {limit} "
                    f"candidates on the {PLAN_LABELS[plan]} plan.")
        message = f"{head} Upgrade to {PLAN_LABELS[required]} for more." if target else head
        return Decision(
            allowed=False, reason=REASON_LIMIT, metric=METRIC_CAMPAIGN_CANDIDATES,
            current_plan=self.plan.value, required_plan=target, upgrade_target=target,
            limit=limit, used=existing, plan_version=self.plan_version,
            message=message, extra={"requested": adding},
        )

    def can_use_advanced_analytics(self) -> Decision:
        return self.feature("advanced_analytics")

    def can_use_executive_reports(self) -> Decision:
        return self.feature("executive_reports")

    def can_use_autonomous_agent(self) -> Decision:
        return self.feature("autonomous_agent")

    def can_export(self, fmt: str = "pdf") -> Decision:
        key = "export_excel" if (fmt or "").strip().lower() in {"excel", "xlsx", "csv"} else "export_pdf"
        return self.feature(key)

    # ── serialisation for /org/context ──────────────────────────────────────
    def entitlements(self) -> dict[str, dict]:
        """`{feature: {enabled, required_plan}}` for every catalog feature.

        The client renders locks from this, so it must list EVERY feature —
        including the ones this organization cannot use. A feature missing from
        the map is a feature the UI cannot offer to sell.
        """
        out: dict[str, dict] = {}
        for key, spec in FEATURES.items():
            d = self.feature(key)
            out[key] = {
                "enabled": d.allowed,
                "required_plan": spec.min_plan.value,
                "label": spec.label,
            }
        return out

    def limits(self) -> dict[str, dict]:
        out: dict[str, dict] = {}
        for metric in (METRIC_RESUMES, METRIC_MEMBERS, METRIC_CAMPAIGNS):
            d = self.quota(metric, 0)
            out[metric] = {
                "used": d.used, "limit": d.limit, "remaining": d.remaining,
                "label": METRIC_LABELS.get(metric, metric),
            }
        out[METRIC_RESUMES]["window"] = resume_window(self.effective_plan)
        out[METRIC_RESUMES]["period"] = self.usage.period

        # Interview / Copilot credits: serialized only where the plan carries a
        # NON-ZERO allowance. A plan without the capability would render a
        # "0 of 0" meter, which reads as a fault rather than an absence — the
        # feature lock is that plan's surface, not a meter.
        for metric in (METRIC_INTERVIEW_PACKS, METRIC_COPILOT_QUESTIONS):
            limit = limit_for(self.effective_plan, metric,
                              ruleset=self.ruleset, overrides=self.limit_overrides)
            if limit == 0:
                continue
            d = self.quota(metric, 0)
            out[metric] = {
                "used": d.used, "limit": d.limit, "remaining": d.remaining,
                "label": METRIC_LABELS.get(metric, metric),
                "window": metric_window(metric, self.effective_plan),
                "period": self.usage.period,
            }
        return out
