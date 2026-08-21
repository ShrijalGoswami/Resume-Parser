/**
 * Plan catalog — PRESENTATION MIRROR of `app/enterprise/catalog.py`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HARD ARCHITECTURAL RULE: this file never decides entitlement.
 *
 * Nothing here answers "may this organization do X?". That answer arrives from
 * the server on `/org/context` as `entitlements[key].enabled`, and on a denial
 * as the 402 body. This module supplies only what the server does not send and
 * the UI cannot invent: labels, blurbs, ordering, grouping, metric copy, and
 * the tier arithmetic behind "Upgrade to …".
 *
 * The temptation is obvious — every plan and every `min_plan` is right here, so
 * `isAtLeast(currentPlan, feature.minPlan)` looks like a free local answer. It
 * is a WRONG answer. It cannot see `entitlement_grants` (a commercial add-on
 * above plan), `org_feature_flags` (which may subtract), an inactive
 * subscription resolving to free, or the `founding` ruleset that all 68
 * pre-monetization organizations run under. A client that recomputes access
 * will lock a founding customer out of a screen the server would have served.
 * Read `enabled`. Always.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PARITY: this mirror is hand-written for the literal types, and pinned to
 * `catalog.snapshot.json`, which the backend generates from the live catalog.
 * `tests/entitlements-catalog.test.ts` fails if the two disagree. After editing
 * `app/enterprise/catalog.py`, run:
 *
 *     cd backend && .venv/Scripts/python.exe -m scripts.export_catalog_snapshot
 *
 * If the mirror and the server ever disagree in production, the server wins.
 *
 * The `founding` ruleset is deliberately absent. A grandfathered organization
 * has every capability and no limits, so it renders no locks and no meters —
 * there is nothing for a presentation layer to say about it beyond the badge.
 */

/** `-1` in any limit field. Not a sentinel to compare against by hand. */
export const UNLIMITED = -1

export function isUnlimited(limit: number | null | undefined): boolean {
  return limit === UNLIMITED
}

// ── Plans ───────────────────────────────────────────────────────────────────

/** Ascending. Everything comparative derives from this order. */
export const PLAN_KEYS = [
  'free',
  'trial',
  'trial_interview',
  'plus',
  'pro',
  'enterprise',
] as const
export type PlanKey = (typeof PLAN_KEYS)[number]

/**
 * The upgrade LADDER — the tiers a customer moves along, and the only sequence
 * that is monotonic. The paid trials sit OFF the ladder: `trial_interview`
 * carries a metered slice of Interview Intelligence that Plus does not, and
 * both trials allow fewer résumés than Free. Marketing surfaces (plan cards,
 * the comparison table) render the ladder; the trials get their own strip.
 */
export const CORE_PLAN_KEYS = ['free', 'plus', 'pro', 'enterprise'] as const satisfies
  readonly PlanKey[]

/** One-time paid trials — bought once, lifetime-windowed credits, never a
 *  scheduled-change target. */
export const TRIAL_PLAN_KEYS = ['trial', 'trial_interview'] as const satisfies
  readonly PlanKey[]

export function isTrialPlan(plan: PlanKey): boolean {
  return (TRIAL_PLAN_KEYS as readonly PlanKey[]).includes(plan)
}

export const PLAN_LABELS: Record<PlanKey, string> = {
  free: 'Free',
  trial: 'Trial',
  trial_interview: 'Interview Trial',
  plus: 'Plus',
  pro: 'Pro',
  // Sold as "Custom": no fixed public limits, quoted and contracted offline.
  // The slug stays `enterprise` — it is on live rows and in the DB CHECKs.
  enterprise: 'Custom',
}

/**
 * WHAT A TIER IS FOR, in one sentence, in the product's own voice.
 *
 * Distinct from `PLAN_POSITIONING` in `lib/pricing.ts`, which says the same
 * thing in a sales voice for the marketing pages. This set is what an upgrade
 * surface INSIDE the product says, where a sales voice would be wrong — the
 * customer is already here, already working, and has just been stopped.
 *
 * It exists because the upgrade dialog had nothing to say when the request was
 * about a tier rather than a specific locked capability. It fell through to the
 * feature template with no feature and rendered "This feature is on Plus".
 *
 * No money, deliberately: this file decides nothing commercial and a test
 * asserts it stays that way.
 */
export const PLAN_BLURBS: Record<PlanKey, string> = {
  free: 'Enough of the real analysis to judge whether it is worth anything to you.',
  trial: 'Ten résumés and one role, analysed in full, bought once.',
  trial_interview: 'The trial plus one full interview pack and one Copilot question.',
  plus: 'For one recruiter running their own roles end to end.',
  pro: 'Adds the intelligence layer — search, copilot, analytics, and shared memory across the team.',
  enterprise: 'Your own models, your own sign-on, and rules set by your organization.',
}

/**
 * Pre-catalog slugs still present on live subscription rows.
 *
 * These must never fall through to `free`. An organization that bought
 * `business` showing up as Free — being told to upgrade to something it already
 * pays for — is the worst single failure this module can produce.
 */
const PLAN_ALIASES: Record<string, PlanKey> = {
  professional: 'plus',
  business: 'pro',
}

/** Resolve any stored or server-supplied plan slug to a catalog plan. */
export function normalizePlan(plan: string | null | undefined): PlanKey {
  const key = (plan ?? '').trim().toLowerCase()
  if (!key) return 'free'
  if ((PLAN_KEYS as readonly string[]).includes(key)) return key as PlanKey
  return PLAN_ALIASES[key] ?? 'free'
}

export function planRank(plan: PlanKey): number {
  return PLAN_KEYS.indexOf(plan)
}

export function isAtLeast(plan: PlanKey, minimum: PlanKey): boolean {
  return planRank(plan) >= planRank(minimum)
}

/** Display name for any plan slug, including legacy ones. Never a raw slug. */
export function planLabel(plan: string | null | undefined): string {
  return PLAN_LABELS[normalizePlan(plan)]
}

/** The next tier up, or null at the top. */
export function nextPlan(plan: PlanKey): PlanKey | null {
  return PLAN_KEYS[planRank(plan) + 1] ?? null
}

// ── Features ────────────────────────────────────────────────────────────────

export interface CatalogFeature {
  key: FeatureKey
  label: string
  minPlan: PlanKey
  /** One short sentence for a lock surface. No marketing voice. */
  blurb: string
}

/** Declaration order is presentation order (Free → Enterprise). */
const FEATURE_TABLE = {
  // Free — the product must be genuinely usable, or the trial proves nothing.
  resume_parser: { label: 'Resume Parser', minPlan: 'free', blurb: '' },
  ats_score: { label: 'ATS Score', minPlan: 'free', blurb: '' },
  basic_ai_summary: { label: 'Basic AI Summary', minPlan: 'free', blurb: '' },

  // Plus — the solo recruiter's working set.
  full_resume_analysis: {
    label: 'Full Resume Analysis',
    minPlan: 'plus',
    blurb: 'Complete scoring, skills, and gap analysis for every candidate.',
  },
  candidate_comparison: {
    label: 'Candidate Comparison',
    minPlan: 'plus',
    blurb: 'Compare candidates side by side with AI reasoning.',
  },
  export_pdf: {
    label: 'PDF Export',
    minPlan: 'plus',
    blurb: 'Export candidate and role reports as PDF.',
  },

  // Pro — the team's intelligence layer.
  ai_copilot: {
    label: 'AI Copilot',
    minPlan: 'pro',
    blurb: 'Ask questions about your pipeline in plain language.',
  },
  semantic_search: {
    label: 'Semantic Search',
    minPlan: 'pro',
    blurb: 'Search your talent pool by meaning, not keywords.',
  },
  interview_intelligence: {
    label: 'Interview Intelligence',
    minPlan: 'pro',
    blurb: "Generated interview packs grounded in the candidate's résumé.",
  },
  advanced_analytics: {
    label: 'Advanced Analytics',
    minPlan: 'pro',
    blurb: 'Pipeline health, funnel conversion, and hiring velocity.',
  },
  executive_reports: {
    label: 'Executive Reports',
    minPlan: 'pro',
    blurb: 'Narrative hiring reports for stakeholders.',
  },
  export_excel: {
    label: 'Excel Export',
    minPlan: 'pro',
    blurb: 'Export the full pipeline as a spreadsheet.',
  },
  predictive_intelligence: {
    label: 'Predictive Intelligence',
    minPlan: 'pro',
    blurb: "Forecasts, scenario simulation, and your pipeline's digital twin.",
  },
  org_knowledge: {
    label: 'Organizational Knowledge',
    minPlan: 'pro',
    blurb: "Your team's compounding memory of decisions, skills, and preferences.",
  },
  integrations: {
    label: 'Integrations',
    minPlan: 'pro',
    blurb: 'Connect your ATS, calendar, and messaging tools.',
  },

  // Enterprise.
  autonomous_agent: {
    label: 'Autonomous Agent',
    minPlan: 'enterprise',
    blurb: 'Continuous pipeline scanning with recommended actions.',
  },
  api_access: {
    label: 'API Access',
    minPlan: 'enterprise',
    blurb: 'Programmatic access with scoped organization keys.',
  },
  webhooks: {
    label: 'Webhooks',
    minPlan: 'enterprise',
    blurb: 'Push hiring events to your own endpoints.',
  },
  sso: {
    label: 'Single Sign-On',
    minPlan: 'enterprise',
    blurb: 'SAML/OIDC sign-in for your whole organization.',
  },
  audit_logs: {
    label: 'Audit Logs',
    minPlan: 'enterprise',
    blurb: 'Exportable record of every action taken in your organization.',
  },
  dedicated_support: {
    label: 'Dedicated Support',
    minPlan: 'enterprise',
    blurb: 'A named contact and a response-time commitment.',
  },
} as const satisfies Record<string, { label: string; minPlan: PlanKey; blurb: string }>

export type FeatureKey = keyof typeof FEATURE_TABLE

export const FEATURE_KEYS = Object.keys(FEATURE_TABLE) as FeatureKey[]

export const FEATURES: Record<FeatureKey, CatalogFeature> = Object.fromEntries(
  FEATURE_KEYS.map((key) => [key, { key, ...FEATURE_TABLE[key] }]),
) as Record<FeatureKey, CatalogFeature>

export function getFeature(key: string): CatalogFeature | undefined {
  return FEATURES[key as FeatureKey]
}

/**
 * Capabilities a plan includes ON TOP of the `minPlan` ladder — the paid
 * trials' metered slice of higher-tier features. Mirror of the backend's
 * `PLAN_FEATURE_EXTRAS`. Presentation only, like everything here: the volume
 * (1 pack, 1 question) is enforced server-side by the metered limits.
 */
export const PLAN_FEATURE_EXTRAS: Partial<Record<PlanKey, readonly FeatureKey[]>> = {
  trial: ['full_resume_analysis'],
  trial_interview: ['full_resume_analysis', 'interview_intelligence', 'ai_copilot'],
}

/** Display name for a feature key. Falls back to the key so copy is never blank. */
export function featureLabel(key: string): string {
  return getFeature(key)?.label ?? key
}

export function featureBlurb(key: string): string {
  return getFeature(key)?.blurb ?? ''
}

/** Every feature a plan includes, for the pricing/comparison surfaces only. */
export function featuresForPlan(plan: PlanKey): CatalogFeature[] {
  const extras = PLAN_FEATURE_EXTRAS[plan] ?? []
  return FEATURE_KEYS.map((k) => FEATURES[k]).filter(
    (f) => isAtLeast(plan, f.minPlan) || extras.includes(f.key),
  )
}

/** Features grouped by the tier that introduces them, in presentation order. */
export function featuresByTier(): { plan: PlanKey; label: string; features: CatalogFeature[] }[] {
  return PLAN_KEYS.map((plan) => ({
    plan,
    label: PLAN_LABELS[plan],
    features: FEATURE_KEYS.map((k) => FEATURES[k]).filter((f) => f.minPlan === plan),
  }))
}

// ── Limits ──────────────────────────────────────────────────────────────────

export const METRIC_KEYS = [
  'resumes',
  'members',
  'campaigns',
  'organizations',
  'interview_packs',
  'copilot_questions',
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]

/** The metrics every plan carries a meter for. `interview_packs` and
 *  `copilot_questions` are serialized by the server only where the plan's
 *  allowance is non-zero — a plan without the capability gets a feature lock,
 *  not a "0 of 0" meter. */
export const BASE_METRIC_KEYS = [
  'resumes',
  'members',
  'campaigns',
  'organizations',
] as const satisfies readonly MetricKey[]

/** Metric copy for meters and limit messages ("2 of 2 résumés used"). */
export const METRIC_LABELS: Record<MetricKey, string> = {
  resumes: 'résumés',
  members: 'team members',
  campaigns: 'roles',
  organizations: 'organizations',
  interview_packs: 'interview packs',
  copilot_questions: 'copilot questions',
}

/** Copy for the per-campaign candidate cap, which is not an org metric and so
 *  lives outside `METRIC_LABELS`. Mirrors the backend's label. */
export const CAMPAIGN_CANDIDATE_LABEL = 'candidates in this role'

export function metricLabel(metric: string): string {
  if (metric === 'campaign_candidates') return CAMPAIGN_CANDIDATE_LABEL
  return METRIC_LABELS[metric as MetricKey] ?? metric
}

/**
 * The plan matrix, for pricing and comparison surfaces.
 *
 * NOT for deciding whether the current organization has room — that is
 * `limits_usage` from the server, which already accounts for negotiated
 * `limit_overrides` and the founding ruleset's absence of limits.
 */
export const LIMITS: Record<PlanKey, Record<MetricKey, number>> = {
  free: {
    resumes: 100,
    members: 1,
    campaigns: 2,
    organizations: 1,
    interview_packs: 0,
    copilot_questions: 0,
  },
  trial: {
    resumes: 10,
    members: 1,
    campaigns: 1,
    organizations: 1,
    interview_packs: 0,
    copilot_questions: 0,
  },
  trial_interview: {
    resumes: 10,
    members: 1,
    campaigns: 1,
    organizations: 1,
    interview_packs: 1,
    copilot_questions: 1,
  },
  plus: {
    resumes: 200,
    members: 3,
    campaigns: UNLIMITED,
    organizations: 1,
    interview_packs: 0,
    copilot_questions: 0,
  },
  pro: {
    resumes: 700,
    members: 25,
    campaigns: UNLIMITED,
    organizations: 1,
    interview_packs: UNLIMITED,
    // Deliberately finite — see the backend catalog's rationale: it bounds the
    // worst-case Copilot spend to a small fraction of what the tier brings in.
    copilot_questions: 300,
  },
  enterprise: {
    resumes: UNLIMITED,
    members: UNLIMITED,
    campaigns: UNLIMITED,
    organizations: 1,
    interview_packs: UNLIMITED,
    copilot_questions: UNLIMITED,
  },
}

/**
 * Maximum candidates a single campaign may hold, per plan. Scoped PER CAMPAIGN
 * — enforced server-side where candidates are persisted, so it deliberately
 * does not live in `LIMITS` (whose metrics are all per-organization) and never
 * gets an org-level meter. Presentation only, like everything here.
 */
export const CAMPAIGN_CANDIDATE_LIMITS: Record<PlanKey, number> = {
  free: UNLIMITED,
  trial: UNLIMITED,
  trial_interview: UNLIMITED,
  plus: 100,
  pro: 200,
  enterprise: UNLIMITED,
}

/**
 * Résumé counting window per plan. The paid trials' credits are for the
 * LIFETIME of the organization — bought once, consumed once — so a meter must
 * not promise a trial buyer that anything resets. Every other plan, Free
 * included, renews on the calendar month.
 */
export const RESUME_WINDOW: Record<PlanKey, 'lifetime' | 'month'> = {
  free: 'month',
  trial: 'lifetime',
  trial_interview: 'lifetime',
  plus: 'month',
  pro: 'month',
  enterprise: 'month',
}

export function resumeWindow(plan: string | null | undefined): 'lifetime' | 'month' {
  return RESUME_WINDOW[normalizePlan(plan)]
}

/**
 * Counting window for any METERED metric — mirror of the backend's
 * `metric_window()`. Résumés keep their per-plan table; the interview and
 * copilot credits are lifetime on the trials and monthly everywhere else.
 */
export function metricWindow(metric: MetricKey, plan: PlanKey): 'lifetime' | 'month' {
  if (metric === 'resumes') return RESUME_WINDOW[plan]
  return isTrialPlan(plan) ? 'lifetime' : 'month'
}

/** The cheapest plan whose allowance for `metric` covers `required`. */
export function minimumPlanForLimit(metric: MetricKey, required: number): PlanKey | null {
  for (const plan of PLAN_KEYS) {
    const limit = LIMITS[plan][metric]
    if (isUnlimited(limit) || limit >= required) return plan
  }
  return null
}

/**
 * The cheapest tier above `current` that actually grants MORE of `metric`.
 *
 * This is what a running-low meter should offer, and `minimumPlanForLimit` is
 * not: at 20 of 25 résumés on Plus, the cheapest plan covering 21 is Plus — the
 * plan you are already on. Answering that question gives a warning with no
 * remedy, or worse, an "Upgrade to Plus" button shown to a Plus customer.
 *
 * `currentLimit` is the organization's EFFECTIVE limit from the server rather
 * than the catalog's figure for its plan, so a negotiated `limit_overrides`
 * deal is not offered an upgrade that would give it less than it already has.
 *
 * Null when nothing higher helps — every plan caps organizations at 1 in V1, so
 * there is honestly nothing to sell there.
 */
export function nextPlanWithMoreOf(
  metric: MetricKey,
  current: PlanKey,
  currentLimit: number,
): PlanKey | null {
  if (isUnlimited(currentLimit)) return null
  // Ladder tiers only: a one-time trial is an entry offer, never the remedy
  // for a running-low meter — offering "Upgrade to Trial" to someone out of
  // credits would sell them a smaller allowance with an expiry.
  for (const plan of PLAN_KEYS.slice(planRank(current) + 1)) {
    if (isTrialPlan(plan)) continue
    const limit = LIMITS[plan][metric]
    if (isUnlimited(limit) || limit > currentLimit) return plan
  }
  return null
}

// ── Upgrade targets ─────────────────────────────────────────────────────────

/**
 * The tier a denial should send the user to.
 *
 * `serverRequiredPlan` is what the 402 said, and it is authoritative about
 * ACCESS. It is not always the most useful thing to SHOW: a Free user reaching
 * webhooks is told "Pro", because the Integrations router gate fires before the
 * per-endpoint Enterprise gate. Pro is a true next step but not the whole
 * requirement, and a customer who upgrades to Pro on that advice still cannot
 * use webhooks.
 *
 * So when the catalog knows the feature demands a higher tier than the server's
 * first gate named, the higher one is shown. This never grants access — the
 * server still decides that — it only stops the UI from promising a fix that
 * would not fix it. The server decides access; the client decides experience.
 */
export function upgradeTargetFor(
  serverRequiredPlan: string | null | undefined,
  feature?: string | null,
): PlanKey | null {
  const fromFeature = feature ? getFeature(feature)?.minPlan : undefined
  if (!serverRequiredPlan) return fromFeature ?? null
  const fromServer = normalizePlan(serverRequiredPlan)
  if (!fromFeature) return fromServer
  return isAtLeast(fromFeature, fromServer) ? fromFeature : fromServer
}

/**
 * Upgrade copy, derived. Never write "Upgrade to Pro" into a component —
 * a hardcoded tier is `if (plan === 'PRO')` wearing a nicer coat.
 */
export function upgradeCta(plan: PlanKey | null | undefined): string {
  return plan ? `Upgrade to ${PLAN_LABELS[plan]}` : 'Upgrade'
}

/**
 * What the customer actually GETS — "unlimited résumés", "25 résumés a month",
 * "3 team members".
 *
 * A meter that only counts down states a problem and stops. The sentence that
 * turns it into a decision is the one naming the outcome, and it has to be
 * derived: typed by hand it would still say "25" long after the plan changed,
 * and a promise about what someone receives for money is the worst thing in the
 * product to let go stale.
 */
export function planAllowanceOf(metric: MetricKey, plan: PlanKey): string {
  const limit = LIMITS[plan][metric]
  const label = METRIC_LABELS[metric]
  if (isUnlimited(limit)) return `unlimited ${label}`
  // Metered credits carry their window; a seat count is a standing figure, and
  // "3 team members a month" would describe a subscription nobody sells.
  const metered =
    metric === 'resumes' || metric === 'interview_packs' || metric === 'copilot_questions'
  const perMonth = metered && metricWindow(metric, plan) === 'month'
  return `${limit} ${label}${perMonth ? ' a month' : ''}`
}

/** "Upgrade to Pro for unlimited résumés." Null when there is nothing to offer. */
export function upgradeValueLine(
  metric: MetricKey | string,
  plan: PlanKey | null | undefined,
): string | null {
  if (!plan || !(METRIC_KEYS as readonly string[]).includes(metric)) return null
  return `${upgradeCta(plan)} for ${planAllowanceOf(metric as MetricKey, plan)}.`
}
