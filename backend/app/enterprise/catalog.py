"""
Plan catalog — the single source of truth for what each plan includes.

Everything monetization-related is DATA in this module: which plans exist, their
order, which capability unlocks at which tier, and what each tier's limits are.
No other module decides any of that, and nothing anywhere writes
`if plan == "pro"`. A feature's minimum plan is what produces the "Upgrade to
Pro" wording, so the upsell copy is derived rather than typed — and the pricing
page can be generated from this same table instead of drifting away from it.

Two rulesets
------------
`v1` is the monetized catalog. `founding` is every organization that existed
before monetization: the capability set they already had, and no limits at all.
The grandfather promise is therefore one value on one column, readable and
reversible, rather than a scatter of per-org rows whose absence looks identical
to a bug. The founding ruleset must keep working for as long as those accounts
exist — it is a frozen record of a promise, not dead code.

Legacy slugs
------------
`professional` and `business` predate this catalog and are still on live rows.
They resolve through `_ALIASES` to `plus` and `pro`. They must never fall through
to `free`: silently downgrading a paying account is the worst failure this module
can have.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterable, Optional

UNLIMITED = -1


class Plan(str, Enum):
    free = "free"
    plus = "plus"
    pro = "pro"
    enterprise = "enterprise"


#: Ascending order. Everything comparative (`is_at_least`, monotonicity checks,
#: "which plan do I need") derives from this list, so adding a tier is one edit.
PLAN_ORDER: list[Plan] = [Plan.free, Plan.plus, Plan.pro, Plan.enterprise]
PLAN_KEYS: list[str] = [p.value for p in PLAN_ORDER]

PLAN_LABELS: dict[Plan, str] = {
    Plan.free: "Free",
    Plan.plus: "Plus",
    Plan.pro: "Pro",
    Plan.enterprise: "Enterprise",
}

#: Pre-catalog slugs still present on live subscription rows.
_ALIASES: dict[str, Plan] = {
    "professional": Plan.plus,
    "business": Plan.pro,
}

#: Resolution rulesets. See the module docstring.
RULESET_FOUNDING = "founding"
RULESET_V1 = "v1"
RULESETS: tuple[str, ...] = (RULESET_FOUNDING, RULESET_V1)


# ── Features ────────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Feature:
    key: str
    label: str
    min_plan: Plan
    #: Shown on a lock surface. One short sentence, no marketing.
    blurb: str = ""


def _f(key: str, label: str, min_plan: Plan, blurb: str = "") -> Feature:
    return Feature(key=key, label=label, min_plan=min_plan, blurb=blurb)


#: The capability catalog. Order is presentation order (Free → Enterprise).
FEATURES: dict[str, Feature] = {f.key: f for f in [
    # Free — the product must be genuinely usable, or the trial proves nothing.
    _f("resume_parser", "Resume Parser", Plan.free),
    _f("ats_score", "ATS Score", Plan.free),
    _f("basic_ai_summary", "Basic AI Summary", Plan.free),

    # Plus — the solo recruiter's working set.
    _f("full_resume_analysis", "Full Resume Analysis", Plan.plus,
       "Complete scoring, skills, and gap analysis for every candidate."),
    _f("candidate_comparison", "Candidate Comparison", Plan.plus,
       "Compare candidates side by side with AI reasoning."),
    _f("export_pdf", "PDF Export", Plan.plus,
       "Export candidate and role reports as PDF."),

    # Pro — the team's intelligence layer.
    _f("ai_copilot", "AI Copilot", Plan.pro,
       "Ask questions about your pipeline in plain language."),
    _f("semantic_search", "Semantic Search", Plan.pro,
       "Search your talent pool by meaning, not keywords."),
    _f("interview_intelligence", "Interview Intelligence", Plan.pro,
       "Generated interview packs grounded in the candidate's résumé."),
    _f("advanced_analytics", "Advanced Analytics", Plan.pro,
       "Pipeline health, funnel conversion, and hiring velocity."),
    _f("executive_reports", "Executive Reports", Plan.pro,
       "Narrative hiring reports for stakeholders."),
    _f("export_excel", "Excel Export", Plan.pro,
       "Export the full pipeline as a spreadsheet."),
    _f("predictive_intelligence", "Predictive Intelligence", Plan.pro,
       "Forecasts, scenario simulation, and your pipeline's digital twin."),
    _f("org_knowledge", "Organizational Knowledge", Plan.pro,
       "Your team's compounding memory of decisions, skills, and preferences."),
    _f("integrations", "Integrations", Plan.pro,
       "Connect your ATS, calendar, and messaging tools."),

    # Enterprise.
    _f("autonomous_agent", "Autonomous Agent", Plan.enterprise,
       "Continuous pipeline scanning with recommended actions."),
    _f("api_access", "API Access", Plan.enterprise,
       "Programmatic access with scoped organization keys."),
    _f("webhooks", "Webhooks", Plan.enterprise,
       "Push hiring events to your own endpoints."),
    _f("sso", "Single Sign-On", Plan.enterprise,
       "SAML/OIDC sign-in for your whole organization."),
    _f("audit_logs", "Audit Logs", Plan.enterprise,
       "Exportable record of every action taken in your organization."),
    _f("dedicated_support", "Dedicated Support", Plan.enterprise,
       "A named contact and a response-time commitment."),
]}

FEATURE_KEYS: list[str] = list(FEATURES)

#: What the FOUNDING ruleset grants. This is the capability set those accounts
#: had on the day monetization shipped — the six flags of the pre-catalog
#: `feature_flags.FEATURES` plus everything that was then ungated. Frozen: it
#: describes what was promised, so it does not follow later catalog edits.
FOUNDING_FEATURES: frozenset[str] = frozenset({
    "resume_parser", "ats_score", "basic_ai_summary",
    "full_resume_analysis", "candidate_comparison", "export_pdf",
    "ai_copilot", "semantic_search", "interview_intelligence",
    "advanced_analytics", "executive_reports", "export_excel",
    "autonomous_agent", "audit_logs",
    # Added when the monetization audit gated three subsystems that had been
    # reachable by every organization: Predictive Intelligence, Organizational
    # Knowledge and Integrations (with webhooks). Founding accounts had all of
    # them, so they keep all of them — the grandfather promise is about what an
    # account COULD DO on the day monetization shipped, not about which release
    # happened to gate it.
    "predictive_intelligence", "org_knowledge", "integrations", "webhooks",
})


# ── Limits ──────────────────────────────────────────────────────────────────
#: Metric keys. `resumes` is metered (a counter); the rest are point-in-time
#: counts of existing rows.
METRIC_RESUMES = "resumes"
METRIC_MEMBERS = "members"
METRIC_CAMPAIGNS = "campaigns"
METRIC_ORGANIZATIONS = "organizations"

METERED_METRICS: tuple[str, ...] = (METRIC_RESUMES,)

#: Counting window for the résumé credit, per plan. FREE's 2 credits are for the
#: lifetime of the organization (it is a trial, not an allowance); paid plans
#: renew monthly with the billing cycle.
WINDOW_LIFETIME = "lifetime"
WINDOW_MONTH = "month"

RESUME_WINDOW: dict[Plan, str] = {
    Plan.free: WINDOW_LIFETIME,
    Plan.plus: WINDOW_MONTH,
    Plan.pro: WINDOW_MONTH,
    Plan.enterprise: WINDOW_MONTH,
}

#: `-1` is unlimited. ENTERPRISE V1 is deliberately capped at ONE organization:
#: multi-org membership needs an org switcher and a change to context resolution,
#: and is a later phase (decision 7).
LIMITS: dict[Plan, dict[str, int]] = {
    Plan.free: {
        METRIC_RESUMES: 2,
        METRIC_MEMBERS: 1,
        METRIC_CAMPAIGNS: 2,
        METRIC_ORGANIZATIONS: 1,
    },
    Plan.plus: {
        METRIC_RESUMES: 25,
        METRIC_MEMBERS: 3,
        METRIC_CAMPAIGNS: UNLIMITED,
        METRIC_ORGANIZATIONS: 1,
    },
    Plan.pro: {
        METRIC_RESUMES: UNLIMITED,
        METRIC_MEMBERS: 25,
        METRIC_CAMPAIGNS: UNLIMITED,
        METRIC_ORGANIZATIONS: 1,
    },
    Plan.enterprise: {
        METRIC_RESUMES: UNLIMITED,
        METRIC_MEMBERS: UNLIMITED,
        METRIC_CAMPAIGNS: UNLIMITED,
        METRIC_ORGANIZATIONS: 1,
    },
}

#: Human-readable metric names for limit messages ("2 of 2 résumés used").
METRIC_LABELS: dict[str, str] = {
    METRIC_RESUMES: "résumés",
    METRIC_MEMBERS: "team members",
    METRIC_CAMPAIGNS: "roles",
    METRIC_ORGANIZATIONS: "organizations",
}


# ── Lookups ─────────────────────────────────────────────────────────────────
def normalize_plan(plan: Optional[str]) -> Plan:
    """Resolve any stored plan slug to a catalog plan.

    Unknown values resolve to FREE — but legacy slugs resolve to the tier they
    were sold as, never to FREE. An account that paid for `business` must not
    silently become free because a constant was renamed.
    """
    key = (plan or "").strip().lower()
    if not key:
        return Plan.free
    try:
        return Plan(key)
    except ValueError:
        return _ALIASES.get(key, Plan.free)


def plan_rank(plan: Plan) -> int:
    return PLAN_ORDER.index(plan)


def is_at_least(plan: Plan, minimum: Plan) -> bool:
    return plan_rank(plan) >= plan_rank(minimum)


def normalize_ruleset(ruleset: Optional[str]) -> str:
    """Unknown ruleset → `v1`.

    Deliberately the opposite default from `normalize_plan`: an unrecognised
    ruleset should apply the current rules, not silently hand out the founding
    (unlimited) set. Getting this backwards would make a typo into free
    everything.
    """
    key = (ruleset or "").strip().lower()
    return key if key in RULESETS else RULESET_V1


def get_feature(key: str) -> Optional[Feature]:
    return FEATURES.get(key)


def feature_min_plan(key: str) -> Optional[Plan]:
    feature = FEATURES.get(key)
    return feature.min_plan if feature else None


def features_for_plan(plan: Plan, *, ruleset: str = RULESET_V1) -> set[str]:
    """Every feature key this plan includes, before grants and overrides."""
    if normalize_ruleset(ruleset) == RULESET_FOUNDING:
        return set(FOUNDING_FEATURES)
    return {key for key, f in FEATURES.items() if is_at_least(plan, f.min_plan)}


def limits_for_plan(plan: Plan, *, ruleset: str = RULESET_V1,
                    overrides: Optional[dict] = None) -> dict[str, int]:
    """Resolved limits for a plan.

    FOUNDING organizations have no limits at all — that is the grandfather
    promise, expressed here rather than as a special case at each call site.
    `overrides` is the negotiated-deal escape hatch (`subscriptions.limit_overrides`).
    """
    if normalize_ruleset(ruleset) == RULESET_FOUNDING:
        return {metric: UNLIMITED for metric in LIMITS[Plan.free]}
    limits = dict(LIMITS.get(plan, LIMITS[Plan.free]))
    for metric, value in (overrides or {}).items():
        if metric in limits:
            try:
                limits[metric] = int(value)
            except (TypeError, ValueError):
                continue
    return limits


def limit_for(plan: Plan, metric: str, *, ruleset: str = RULESET_V1,
              overrides: Optional[dict] = None) -> int:
    return limits_for_plan(plan, ruleset=ruleset, overrides=overrides).get(metric, UNLIMITED)


def resume_window(plan: Plan) -> str:
    return RESUME_WINDOW.get(plan, WINDOW_MONTH)


def is_unlimited(value: int) -> bool:
    return value == UNLIMITED


def minimum_plan_for_limit(metric: str, required: int) -> Optional[Plan]:
    """The cheapest plan whose `metric` allowance covers `required`.

    This is what turns "you need more seats" into "Upgrade to Pro" without any
    call site knowing the tier names.
    """
    for plan in PLAN_ORDER:
        limit = LIMITS.get(plan, {}).get(metric, UNLIMITED)
        if is_unlimited(limit) or limit >= required:
            return plan
    return None


def catalog_snapshot(*, ruleset: str = RULESET_V1) -> dict:
    """Serialisable catalog — powers the future pricing page and the client mirror."""
    return {
        "plans": [
            {
                "key": p.value,
                "label": PLAN_LABELS[p],
                "rank": plan_rank(p),
                "limits": limits_for_plan(p, ruleset=ruleset),
                "resume_window": resume_window(p),
                "features": sorted(features_for_plan(p, ruleset=ruleset)),
            }
            for p in PLAN_ORDER
        ],
        "features": [
            {"key": f.key, "label": f.label, "min_plan": f.min_plan.value, "blurb": f.blurb}
            for f in FEATURES.values()
        ],
        "metrics": {m: METRIC_LABELS.get(m, m) for m in LIMITS[Plan.free]},
    }


def iter_features() -> Iterable[Feature]:
    return FEATURES.values()
