/**
 * Client entitlement layer.
 *
 * `catalog.ts` — presentation data only (labels, blurbs, ordering, tier
 * arithmetic). It never decides access; see the hard rule in its header.
 * `use-entitlement.ts` — the hooks that read the server's decision.
 *
 * Import from here. The one thing NOT re-exported is the snapshot JSON: it is a
 * test artifact, not runtime data, and importing it would ship the whole
 * catalog to the browser twice.
 */

export {
  FEATURES,
  FEATURE_KEYS,
  LIMITS,
  METRIC_KEYS,
  METRIC_LABELS,
  PLAN_KEYS,
  PLAN_LABELS,
  RESUME_WINDOW,
  UNLIMITED,
  featureBlurb,
  featureLabel,
  featuresByTier,
  featuresForPlan,
  getFeature,
  isAtLeast,
  isUnlimited,
  metricLabel,
  minimumPlanForLimit,
  nextPlan,
  nextPlanWithMoreOf,
  normalizePlan,
  planLabel,
  planRank,
  resumeWindow,
  upgradeCta,
  upgradeTargetFor,
} from './catalog'
export type { CatalogFeature, FeatureKey, MetricKey, PlanKey } from './catalog'

export { QUOTA_WARN_RATIO, useEntitlement, usePlan, usePlanGate, useQuota } from './use-entitlement'
export type { PlanGate, PlanInfo, QuotaLevel, QuotaState } from './use-entitlement'
