'use client'

import { useOrgContext } from '../api/org-context'
import type { Entitlement, LimitUsage, PlanState } from '@/types/org'
import {
  METRIC_LABELS,
  PLAN_LABELS,
  type FeatureKey,
  type MetricKey,
  type PlanKey,
  featureBlurb,
  featureLabel,
  isUnlimited,
  metricLabel,
  nextPlanWithMoreOf,
  normalizePlan,
  upgradeCta,
  upgradeTargetFor,
} from './catalog'

/**
 * Entitlement hooks — "has this organization paid for X?" and "how much of its
 * allowance is left?".
 *
 * These are the entitlement half of a pair. `useCan` / `usePermissionGate`
 * answer what your ROLE may do (403, ask an admin); these answer what your
 * ORGANIZATION has bought (402, upgrade). Keeping them apart is the whole point
 * of the Phase 1 design: telling a paying owner they "lack permission" is the
 * worst sentence a monetized product can show, and the mirror-image mistake —
 * offering an upgrade to someone whose admin simply hasn't given them a role —
 * is nearly as bad. Never merge these two axes into one gate.
 *
 * SERVER IS THE AUTHORITY. Every value below comes from `/org/context`, which
 * resolved it through grants, feature flags, subscription status and the
 * founding ruleset. Nothing here recomputes access from the plan matrix. See
 * the hard rule at the top of `catalog.ts`.
 *
 * FOUR STATES, KEPT DISTINCT (the rule `use-can.ts` learned the hard way):
 * loading / error / allowed / denied. A failed context request is an ERROR, not
 * a denial. Rendering "Upgrade to Pro" because a request 503'd — at a customer
 * who already pays for Pro — is a false accusation whose only suggested remedy
 * is to hand over money they have already handed over. `/org/context` does fail
 * often enough to see in a single session, so this is not hypothetical.
 */

// ── Plan state ──────────────────────────────────────────────────────────────

export type PlanInfo =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | {
      state: 'ready'
      /** Normalized — legacy `professional`/`business` already resolved. */
      plan: PlanKey
      label: string
      /** active | trialing | past_due | canceled | incomplete */
      status: string
      /** 'founding' = grandfathered, no locks and no limits. 'v1' = plan matrix. */
      ruleset: string
      isFounding: boolean
      /** Compare against a 402's `plan_version` to spot a stale cached context. */
      version: number
    }

export function usePlan(): PlanInfo {
  const ctx = useOrgContext()
  if (ctx.data) {
    const ps: PlanState | undefined = ctx.data.plan_state
    const plan = normalizePlan(ps?.key ?? ctx.data.plan)
    return {
      state: 'ready',
      plan,
      label: PLAN_LABELS[plan],
      status: ps?.status ?? 'active',
      ruleset: ps?.ruleset ?? 'v1',
      isFounding: ps?.ruleset === 'founding',
      version: ps?.version ?? 1,
    }
  }
  if (ctx.isError) return { state: 'error', retry: () => void ctx.refetch() }
  return { state: 'loading' }
}

// ── Feature entitlement ─────────────────────────────────────────────────────

/**
 * `useEntitlement` — the control-level question, collapsed to a boolean the way
 * `useCan` is. Use it to decide whether to render an action; use `usePlanGate`
 * for a whole screen, where the difference between "denied" and "we don't know
 * yet" matters.
 *
 * While the context is loading the answer is `false`: a control that appears a
 * moment late is better than one that appears and withdraws.
 *
 * A feature the server did not send is treated as ALLOWED, which is the
 * opposite direction and deliberate — absence means the server is not gating
 * that key, not that it denied it. In practice it cannot happen without the
 * mirror drifting from the catalog, which is a failing parity test.
 */
export function useEntitlement(feature: FeatureKey | string): boolean {
  const ctx = useOrgContext()
  if (!ctx.data) return false
  const ent = ctx.data.entitlements?.[feature]
  return ent ? ent.enabled : true
}

export type PlanGate =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | { state: 'allowed' }
  | {
      state: 'denied'
      feature: string
      /** Catalog label, falling back to the server's. */
      label: string
      blurb: string
      /** The tier to show. Already reconciled with the catalog — see
       *  `upgradeTargetFor`; a Free user at webhooks is shown Enterprise, not
       *  the Pro the router gate happened to name first. */
      requiredPlan: PlanKey | null
      /** Derived copy: "Upgrade to Enterprise". Never typed into a component. */
      cta: string
    }

/**
 * `usePlanGate` — the screen-level counterpart. The four states stay distinct,
 * and a surface may claim a plan problem only when the context actually
 * resolved and actually denied it.
 */
export function usePlanGate(feature: FeatureKey | string): PlanGate {
  const ctx = useOrgContext()
  if (ctx.data) {
    const ent: Entitlement | undefined = ctx.data.entitlements?.[feature]
    if (!ent || ent.enabled) return { state: 'allowed' }
    const requiredPlan = upgradeTargetFor(ent.required_plan, feature)
    return {
      state: 'denied',
      feature,
      label: featureLabel(feature) || ent.label,
      blurb: featureBlurb(feature),
      requiredPlan,
      cta: upgradeCta(requiredPlan),
    }
  }
  if (ctx.isError) return { state: 'error', retry: () => void ctx.refetch() }
  return { state: 'loading' }
}

// ── Quota ───────────────────────────────────────────────────────────────────

/** Meters stay silent until the allowance is nearly gone (Phase 2 spec §7.5). */
export const QUOTA_WARN_RATIO = 0.8

export type QuotaLevel = 'ok' | 'warning' | 'exhausted'

export type QuotaState =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | {
      state: 'ready'
      metric: string
      label: string
      used: number
      /** `-1` when unlimited — read `unlimited` rather than comparing. */
      limit: number
      unlimited: boolean
      /** null when unlimited. */
      remaining: number | null
      /** 0–1, clamped. Always 0 when unlimited. */
      ratio: number
      level: QuotaLevel
      /** True at or past `QUOTA_WARN_RATIO` — the meter becomes visible. */
      shouldWarn: boolean
      /** True when the next unit would be refused. */
      isExhausted: boolean
      /** Résumés only: 'lifetime' on Free (nothing resets), 'month' on paid. */
      window?: string
      period?: string
      /** Cheapest tier ABOVE the current one that would clear the wall. Null
       *  while there is still room, and null when no higher tier would help
       *  (multi-org is capped at 1 on every plan in V1). */
      requiredPlan: PlanKey | null
      cta: string
    }

/**
 * `useQuota` — usage against one plan limit.
 *
 * A quota is NOT a feature lock and must not render like one. A lock is static
 * and says "this isn't in your plan"; a quota is dynamic, says "2 of 2 used",
 * warns before it bites, and is about volume rather than capability. Same
 * upgrade path, different surface.
 *
 * Founding organizations report every limit as unlimited, so their meters
 * resolve to `ok` with `ratio: 0` and never appear. That is the grandfather
 * promise arriving through the data rather than a special case here.
 */
export function useQuota(metric: MetricKey | string): QuotaState {
  const ctx = useOrgContext()
  if (ctx.data) {
    const usage: LimitUsage | undefined = ctx.data.limits_usage?.[metric]
    const used = usage?.used ?? 0
    const limit = usage?.limit ?? -1
    const unlimited = isUnlimited(limit)
    // `remaining` is trusted from the server when present; it is the same
    // arithmetic, but an override or a mid-period plan change makes the
    // server's copy the one that matches what enforcement will actually do.
    const remaining = unlimited ? null : (usage?.remaining ?? Math.max(0, limit - used))
    const ratio = unlimited || limit <= 0 ? 0 : Math.min(1, Math.max(0, used / limit))
    const isExhausted = !unlimited && (remaining ?? 0) <= 0
    // A ratio alone cannot warn a small allowance. FREE gets 2 lifetime
    // credits: 1 of 2 is 50%, and 2 of 2 is already the wall — so a trial user,
    // the one person the warning exists for, would go from silence straight to
    // a hard stop. The last-unit rule gives every allowance at least one
    // warning before it bites, however small it is.
    const isLastUnit = !unlimited && (remaining ?? 0) <= 1
    const shouldWarn = !unlimited && (isExhausted || isLastUnit || ratio >= QUOTA_WARN_RATIO)
    const level: QuotaLevel = isExhausted ? 'exhausted' : shouldWarn ? 'warning' : 'ok'
    // The tier to offer is the cheapest one that grants MORE of this metric
    // than they have now — not the cheapest that covers today's usage, which at
    // 20 of 25 on Plus is Plus itself and would render "Upgrade to Plus" to a
    // Plus customer. An upsell to a plan you already bought reads as a billing
    // fault, and it would be the client's mistake, not the server's.
    //
    // Offered only once the meter is actually warning: with room left there is
    // nothing to act on and nothing to sell.
    const currentPlan = normalizePlan(ctx.data.plan_state?.key ?? ctx.data.plan)
    const requiredPlan = shouldWarn
      ? nextPlanWithMoreOf(metric as MetricKey, currentPlan, limit)
      : null
    return {
      state: 'ready',
      metric,
      label: usage?.label ?? metricLabel(metric),
      used,
      limit,
      unlimited,
      remaining,
      ratio,
      level,
      shouldWarn,
      isExhausted,
      window: usage?.window,
      period: usage?.period,
      requiredPlan,
      cta: upgradeCta(requiredPlan),
    }
  }
  if (ctx.isError) return { state: 'error', retry: () => void ctx.refetch() }
  return { state: 'loading' }
}

export { METRIC_LABELS, PLAN_LABELS }
