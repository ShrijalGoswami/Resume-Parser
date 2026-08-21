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
    trial = "trial"
    trial_interview = "trial_interview"
    plus = "plus"
    pro = "pro"
    enterprise = "enterprise"


#: Ascending order. Everything comparative (`is_at_least`, monotonicity checks,
#: "which plan do I need") derives from this list, so adding a tier is one edit.
PLAN_ORDER: list[Plan] = [
    Plan.free, Plan.trial, Plan.trial_interview, Plan.plus, Plan.pro, Plan.enterprise,
]
PLAN_KEYS: list[str] = [p.value for p in PLAN_ORDER]

#: The upgrade LADDER — the tiers a customer moves along, and the only sequence
#: monotonicity holds over. Trials are one-time purchases that sit off the
#: ladder: `trial_interview` includes a metered slice of Interview Intelligence
#: that Plus does not, and both trials allow fewer résumés than Free. They are
#: sold once, never renewed, and never a scheduled-change target.
CORE_PLAN_ORDER: list[Plan] = [Plan.free, Plan.plus, Plan.pro, Plan.enterprise]
CORE_PLAN_KEYS: list[str] = [p.value for p in CORE_PLAN_ORDER]

#: One-time paid trials. Their metered windows are LIFETIME (bought once,
#: consumed once) and they are excluded from scheduled plan changes.
TRIAL_PLANS: frozenset[Plan] = frozenset({Plan.trial, Plan.trial_interview})

PLAN_LABELS: dict[Plan, str] = {
    Plan.free: "Free",
    Plan.trial: "Trial",
    Plan.trial_interview: "Interview Trial",
    Plan.plus: "Plus",
    Plan.pro: "Pro",
    # Sold as "Custom": no fixed public limits, quoted and contracted offline.
    # The slug stays `enterprise` — it is on live rows and in the DB CHECKs.
    Plan.enterprise: "Custom",
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

#: Capabilities a plan includes ON TOP of the `min_plan` ladder.
#:
#: The ladder (`is_at_least`) cannot describe the paid trials: the ₹149 trial
#: includes a metered slice of Interview Intelligence and the Copilot — both
#: `min_plan=pro` — while ranking below Plus. These extras ADD capability for a
#: specific plan without moving the feature's `min_plan` (which still drives the
#: "available on the Pro plan" upsell copy for everyone else). The VOLUME of the
#: trial capabilities is enforced separately, by the metered limits below
#: (1 interview pack, 1 copilot question — lifetime).
PLAN_FEATURE_EXTRAS: dict[Plan, frozenset[str]] = {
    Plan.trial: frozenset({"full_resume_analysis"}),
    Plan.trial_interview: frozenset({
        "full_resume_analysis", "interview_intelligence", "ai_copilot",
    }),
}


# ── Limits ──────────────────────────────────────────────────────────────────
#: Metric keys. `resumes`, `interview_packs` and `copilot_questions` are metered
#: (counters in `org_usage_counters`); the rest are point-in-time counts of
#: existing rows. `campaign_candidates` is scoped PER CAMPAIGN, not per
#: organization — it lives in its own table below, never in `LIMITS`.
METRIC_RESUMES = "resumes"
METRIC_MEMBERS = "members"
METRIC_CAMPAIGNS = "campaigns"
METRIC_ORGANIZATIONS = "organizations"
METRIC_INTERVIEW_PACKS = "interview_packs"
METRIC_COPILOT_QUESTIONS = "copilot_questions"
METRIC_CAMPAIGN_CANDIDATES = "campaign_candidates"

METERED_METRICS: tuple[str, ...] = (
    METRIC_RESUMES, METRIC_INTERVIEW_PACKS, METRIC_COPILOT_QUESTIONS,
)

#: Counting window for the résumé credit, per plan. The paid trials' credits are
#: for the LIFETIME of the organization (bought once, consumed once); every
#: other plan — Free included — renews on the UTC calendar month.
WINDOW_LIFETIME = "lifetime"
WINDOW_MONTH = "month"

RESUME_WINDOW: dict[Plan, str] = {
    Plan.free: WINDOW_MONTH,
    Plan.trial: WINDOW_LIFETIME,
    Plan.trial_interview: WINDOW_LIFETIME,
    Plan.plus: WINDOW_MONTH,
    Plan.pro: WINDOW_MONTH,
    Plan.enterprise: WINDOW_MONTH,
}

#: `-1` is unlimited. ENTERPRISE V1 is deliberately capped at ONE organization:
#: multi-org membership needs an org switcher and a change to context resolution,
#: and is a later phase (decision 7).
#:
#: `interview_packs` counts EVERY generation call — full pack or scoped
#: regeneration — because each is a full orchestrator round-trip and costs the
#: same order of tokens. `copilot_questions` counts one per question answered.
#: A `0` here is belt-and-braces: the capability gate (`ai_copilot`,
#: `interview_intelligence`) already closes those plans, and a zero quota means
#: even a future grant cannot create unmetered volume.
LIMITS: dict[Plan, dict[str, int]] = {
    Plan.free: {
        METRIC_RESUMES: 100,
        METRIC_MEMBERS: 1,
        METRIC_CAMPAIGNS: 2,
        METRIC_ORGANIZATIONS: 1,
        METRIC_INTERVIEW_PACKS: 0,
        METRIC_COPILOT_QUESTIONS: 0,
    },
    Plan.trial: {
        METRIC_RESUMES: 10,
        METRIC_MEMBERS: 1,
        METRIC_CAMPAIGNS: 1,
        METRIC_ORGANIZATIONS: 1,
        METRIC_INTERVIEW_PACKS: 0,
        METRIC_COPILOT_QUESTIONS: 0,
    },
    Plan.trial_interview: {
        METRIC_RESUMES: 10,
        METRIC_MEMBERS: 1,
        METRIC_CAMPAIGNS: 1,
        METRIC_ORGANIZATIONS: 1,
        METRIC_INTERVIEW_PACKS: 1,
        METRIC_COPILOT_QUESTIONS: 1,
    },
    Plan.plus: {
        METRIC_RESUMES: 200,
        METRIC_MEMBERS: 3,
        METRIC_CAMPAIGNS: UNLIMITED,
        METRIC_ORGANIZATIONS: 1,
        METRIC_INTERVIEW_PACKS: 0,
        METRIC_COPILOT_QUESTIONS: 0,
    },
    Plan.pro: {
        METRIC_RESUMES: 700,
        METRIC_MEMBERS: 25,
        METRIC_CAMPAIGNS: UNLIMITED,
        METRIC_ORGANIZATIONS: 1,
        METRIC_INTERVIEW_PACKS: UNLIMITED,
        # NOT unlimited, deliberately. Copilot is the one operation whose volume
        # the customer alone controls (a question is a click), and a worst-case
        # turn can fan out into 2–3 interview generations. 300/month keeps the
        # worst-case Copilot spend around 4–9% of the Pro price at current
        # provider rates while being ~10–15 questions per working day.
        METRIC_COPILOT_QUESTIONS: 300,
    },
    Plan.enterprise: {
        METRIC_RESUMES: UNLIMITED,
        METRIC_MEMBERS: UNLIMITED,
        METRIC_CAMPAIGNS: UNLIMITED,
        METRIC_ORGANIZATIONS: 1,
        METRIC_INTERVIEW_PACKS: UNLIMITED,
        METRIC_COPILOT_QUESTIONS: UNLIMITED,
    },
}

#: Maximum candidates a single campaign may hold, per plan. Scoped PER CAMPAIGN
#: — enforced where candidates are persisted, against a live count of that
#: campaign's candidates, never against the org counters. `UNLIMITED` where the
#: pricing sheet names no cap (trials are bounded by their 10 résumé credits).
CAMPAIGN_CANDIDATE_LIMITS: dict[Plan, int] = {
    Plan.free: UNLIMITED,
    Plan.trial: UNLIMITED,
    Plan.trial_interview: UNLIMITED,
    Plan.plus: 100,
    Plan.pro: 200,
    Plan.enterprise: UNLIMITED,
}

#: Human-readable metric names for limit messages ("2 of 2 résumés used").
METRIC_LABELS: dict[str, str] = {
    METRIC_RESUMES: "résumés",
    METRIC_MEMBERS: "team members",
    METRIC_CAMPAIGNS: "roles",
    METRIC_ORGANIZATIONS: "organizations",
    METRIC_INTERVIEW_PACKS: "interview packs",
    METRIC_COPILOT_QUESTIONS: "copilot questions",
    METRIC_CAMPAIGN_CANDIDATES: "candidates in this role",
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
    ladder = {key for key, f in FEATURES.items() if is_at_least(plan, f.min_plan)}
    return ladder | set(PLAN_FEATURE_EXTRAS.get(plan, ()))


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


def metric_window(metric: str, plan: Plan) -> str:
    """Counting window for a METERED metric on a plan.

    Résumés keep their per-plan table. Every other metered credit follows one
    rule: a paid trial's credits are for the lifetime of the organization
    (bought once, consumed once); everything else renews on the calendar month.
    """
    if metric == METRIC_RESUMES:
        return resume_window(plan)
    return WINDOW_LIFETIME if plan in TRIAL_PLANS else WINDOW_MONTH


def campaign_candidate_limit(plan: Plan, *, ruleset: str = RULESET_V1,
                             overrides: Optional[dict] = None) -> int:
    """Maximum candidates one campaign may hold on this plan.

    Per-campaign scope, so it deliberately does NOT live in `LIMITS` (whose
    metrics are all per-organization). Founding organizations have no limits;
    `limit_overrides` may carry a negotiated `campaign_candidates` value.
    """
    if normalize_ruleset(ruleset) == RULESET_FOUNDING:
        return UNLIMITED
    limit = CAMPAIGN_CANDIDATE_LIMITS.get(plan, UNLIMITED)
    value = (overrides or {}).get(METRIC_CAMPAIGN_CANDIDATES)
    if value is not None:
        try:
            limit = int(value)
        except (TypeError, ValueError):
            pass
    return limit


def minimum_plan_for_campaign_candidates(required: int,
                                         above: Optional[Plan] = None) -> Optional[Plan]:
    """The cheapest CORE-ladder plan whose per-campaign cap covers `required`.

    Scanned over the ladder, not over every plan: a trial is not an answer to
    "which plan do I need for a bigger role". `above` restricts the scan to
    tiers ranked strictly higher — without it, Free's uncapped campaigns would
    be "the cheapest plan that covers 105", which is an upgrade target that
    reads as an insult to a Plus customer.
    """
    floor = plan_rank(above) if above is not None else -1
    for plan in CORE_PLAN_ORDER:
        if plan_rank(plan) <= floor:
            continue
        limit = CAMPAIGN_CANDIDATE_LIMITS.get(plan, UNLIMITED)
        if is_unlimited(limit) or limit >= required:
            return plan
    return None


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
                "metric_windows": {m: metric_window(m, p) for m in METERED_METRICS},
                "campaign_candidates": campaign_candidate_limit(p, ruleset=ruleset),
                "features": sorted(features_for_plan(p, ruleset=ruleset)),
            }
            for p in PLAN_ORDER
        ],
        "core_plans": CORE_PLAN_KEYS,
        "trial_plans": sorted(p.value for p in TRIAL_PLANS),
        "features": [
            {"key": f.key, "label": f.label, "min_plan": f.min_plan.value, "blurb": f.blurb}
            for f in FEATURES.values()
        ],
        "metrics": {
            m: METRIC_LABELS.get(m, m)
            for m in [*LIMITS[Plan.free], METRIC_CAMPAIGN_CANDIDATES]
        },
    }


def iter_features() -> Iterable[Feature]:
    return FEATURES.values()
