// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

/**
 * Entitlement hooks — the four-state discipline, and the quota boundaries.
 *
 * The assertions worth having here are not "does the hook read a field". They
 * are the two ways this layer can hurt a real customer:
 *
 *   1. Claiming a PLAN problem when the context request merely failed. That
 *      renders "Upgrade to Pro" at someone who already pays for Pro, and the
 *      only remedy it offers is to pay again. `use-can.ts` documents the same
 *      rule for permissions; this is its entitlement twin.
 *   2. Locking a FOUNDING organization. All 68 pre-monetization orgs are
 *      grandfathered with every capability and no limits. If the client ever
 *      recomputes access from the plan matrix instead of reading the server's
 *      `enabled`, every one of them loses a feature they already had.
 *
 * `useOrgContext` is mocked, so the real hook logic runs against realistic
 * context payloads.
 */

const ctx = vi.hoisted(() => ({
  state: 'ready' as 'ready' | 'loading' | 'error',
  data: undefined as unknown,
  refetched: 0,
}))

vi.mock('../components/hirelens/lib/api/org-context', () => ({
  orgContextKey: ['hl', 'settings', 'org-context'],
  useOrgContext: () => {
    if (ctx.state === 'loading') {
      return { data: undefined, isLoading: true, isError: false, refetch: () => {} }
    }
    if (ctx.state === 'error') {
      return {
        data: undefined,
        isLoading: false,
        isError: true,
        refetch: () => {
          ctx.refetched += 1
        },
      }
    }
    return { data: ctx.data, isLoading: false, isError: false, refetch: () => {} }
  },
}))

import {
  QUOTA_WARN_RATIO,
  useEntitlement,
  usePlan,
  usePlanGate,
  useQuota,
} from '../components/hirelens/lib/entitlements/use-entitlement'

type Ctx = {
  plan?: string
  ruleset?: string
  status?: string
  entitlements?: Record<string, { enabled: boolean; required_plan: string; label: string }>
  limits_usage?: Record<
    string,
    { used: number; limit: number; remaining: number | null; label: string; window?: string }
  >
}

/** A context payload shaped like `/org/context`. */
function ready({ plan = 'free', ruleset = 'v1', status = 'active', ...rest }: Ctx = {}) {
  ctx.state = 'ready'
  ctx.data = {
    organization: { id: 'org', name: 'Org', plan, settings: {} },
    role: 'owner',
    plan,
    permissions: [],
    features: {},
    plan_state: { key: plan, label: plan, status, ruleset, version: 3 },
    entitlements: rest.entitlements ?? {},
    limits_usage: rest.limits_usage ?? {},
  }
}

beforeEach(() => {
  ctx.state = 'ready'
  ctx.data = undefined
  ctx.refetched = 0
})

describe('usePlan', () => {
  it('reports the resolved plan and ruleset', () => {
    ready({ plan: 'pro' })
    const { result } = renderHook(() => usePlan())
    expect(result.current).toMatchObject({ state: 'ready', plan: 'pro', label: 'Pro' })
  })

  it('normalizes a legacy slug rather than showing it raw', () => {
    ready({ plan: 'business' })
    const { result } = renderHook(() => usePlan())
    expect(result.current).toMatchObject({ plan: 'pro', label: 'Pro' })
  })

  it('flags founding organizations', () => {
    ready({ plan: 'free', ruleset: 'founding' })
    const { result } = renderHook(() => usePlan())
    expect(result.current).toMatchObject({ isFounding: true })
  })

  it('separates loading and error from a resolved plan', () => {
    ctx.state = 'loading'
    expect(renderHook(() => usePlan()).result.current.state).toBe('loading')
    ctx.state = 'error'
    expect(renderHook(() => usePlan()).result.current.state).toBe('error')
  })
})

describe('usePlanGate — four states', () => {
  const denied = {
    entitlements: { ai_copilot: { enabled: false, required_plan: 'pro', label: 'AI Copilot' } },
  }

  it('is loading before the context resolves — never denied', () => {
    ctx.state = 'loading'
    expect(renderHook(() => usePlanGate('ai_copilot')).result.current.state).toBe('loading')
  })

  it('is an ERROR when the context request failed, not a denial', () => {
    ctx.state = 'error'
    const { result } = renderHook(() => usePlanGate('ai_copilot'))
    expect(result.current.state).toBe('error')
    // The remedy offered must be "retry", not "pay".
    if (result.current.state === 'error') {
      result.current.retry()
      expect(ctx.refetched).toBe(1)
    }
  })

  it('allows when the server says enabled', () => {
    ready({
      plan: 'pro',
      entitlements: { ai_copilot: { enabled: true, required_plan: 'pro', label: 'AI Copilot' } },
    })
    expect(renderHook(() => usePlanGate('ai_copilot')).result.current.state).toBe('allowed')
  })

  it('denies with derived copy, never a hardcoded tier', () => {
    ready({ ...denied })
    const { result } = renderHook(() => usePlanGate('ai_copilot'))
    expect(result.current).toMatchObject({
      state: 'denied',
      label: 'AI Copilot',
      requiredPlan: 'pro',
      cta: 'Upgrade to Pro',
    })
  })

  it('raises the upgrade target when the catalog knows the feature needs more', () => {
    ready({
      entitlements: { webhooks: { enabled: false, required_plan: 'pro', label: 'Webhooks' } },
    })
    const { result } = renderHook(() => usePlanGate('webhooks'))
    expect(result.current).toMatchObject({ requiredPlan: 'enterprise', cta: 'Upgrade to Enterprise' })
  })

  it('does not lock a founding organization', () => {
    // Founding orgs arrive with plan `free` and every entitlement enabled. A
    // client that recomputed access from the matrix would lock all 68 of them.
    ready({
      plan: 'free',
      ruleset: 'founding',
      entitlements: { ai_copilot: { enabled: true, required_plan: 'pro', label: 'AI Copilot' } },
    })
    expect(renderHook(() => usePlanGate('ai_copilot')).result.current.state).toBe('allowed')
  })

  it('allows a feature the server did not send — absence is not a denial', () => {
    ready({ plan: 'free', entitlements: {} })
    expect(renderHook(() => usePlanGate('ai_copilot')).result.current.state).toBe('allowed')
  })
})

describe('useEntitlement — control-level boolean', () => {
  it('is false while loading, so a control never appears and withdraws', () => {
    ctx.state = 'loading'
    expect(renderHook(() => useEntitlement('ai_copilot')).result.current).toBe(false)
  })

  it('is false on error too — do not offer an action the server may refuse', () => {
    ctx.state = 'error'
    expect(renderHook(() => useEntitlement('ai_copilot')).result.current).toBe(false)
  })

  it('follows the server decision', () => {
    ready({
      entitlements: { ai_copilot: { enabled: false, required_plan: 'pro', label: 'AI Copilot' } },
    })
    expect(renderHook(() => useEntitlement('ai_copilot')).result.current).toBe(false)
    ready({
      plan: 'pro',
      entitlements: { ai_copilot: { enabled: true, required_plan: 'pro', label: 'AI Copilot' } },
    })
    expect(renderHook(() => useEntitlement('ai_copilot')).result.current).toBe(true)
  })
})

describe('useQuota', () => {
  const usage = (used: number, limit: number, extra: Record<string, unknown> = {}) => ({
    limits_usage: {
      resumes: {
        used,
        limit,
        remaining: limit === -1 ? null : Math.max(0, limit - used),
        label: 'résumés',
        window: 'lifetime',
        ...extra,
      },
    },
  })

  it('stays silent well below the limit', () => {
    ready({ plan: 'plus', ...usage(5, 25) })
    const { result } = renderHook(() => useQuota('resumes'))
    expect(result.current).toMatchObject({ level: 'ok', shouldWarn: false, requiredPlan: null })
  })

  it(`warns at ${QUOTA_WARN_RATIO * 100}% and not a unit before`, () => {
    ready({ plan: 'plus', ...usage(19, 25) }) // 0.76
    expect(renderHook(() => useQuota('resumes')).result.current).toMatchObject({
      level: 'ok',
      shouldWarn: false,
    })
    ready({ plan: 'plus', ...usage(20, 25) }) // 0.80
    expect(renderHook(() => useQuota('resumes')).result.current).toMatchObject({
      level: 'warning',
      shouldWarn: true,
    })
  })

  it('reports exhaustion with the numbers a meter needs', () => {
    ready({ plan: 'free', ...usage(2, 2) })
    const { result } = renderHook(() => useQuota('resumes'))
    expect(result.current).toMatchObject({
      level: 'exhausted',
      isExhausted: true,
      used: 2,
      limit: 2,
      remaining: 0,
      ratio: 1,
      label: 'résumés',
      window: 'lifetime',
      requiredPlan: 'plus',
      cta: 'Upgrade to Plus',
    })
  })

  it('never upsells a plan the customer already has, or one below it', () => {
    // Plus at its résumé ceiling needs Pro — not Plus, and not Free.
    ready({ plan: 'plus', ...usage(25, 25) })
    expect(renderHook(() => useQuota('resumes')).result.current).toMatchObject({
      requiredPlan: 'pro',
    })
    // With room left there is nothing to sell at all.
    ready({ plan: 'plus', ...usage(4, 25) })
    expect(renderHook(() => useQuota('resumes')).result.current).toMatchObject({
      requiredPlan: null,
      cta: 'Upgrade',
    })
    // But the last unit DOES warn, however small the allowance: Free's 2
    // lifetime credits never reach 80% before they reach zero, so a ratio alone
    // would take a trial user from silence straight to the wall.
    ready({ plan: 'free', ...usage(1, 2) })
    expect(renderHook(() => useQuota('resumes')).result.current).toMatchObject({
      level: 'warning',
      requiredPlan: 'plus',
    })
  })

  it('treats unlimited as unlimited — no meter, no ratio, no upsell', () => {
    ready({ plan: 'pro', ...usage(4000, -1) })
    expect(renderHook(() => useQuota('resumes')).result.current).toMatchObject({
      unlimited: true,
      remaining: null,
      ratio: 0,
      level: 'ok',
      shouldWarn: false,
      requiredPlan: null,
    })
  })

  it('shows a founding organization no meter at all', () => {
    ready({ plan: 'free', ruleset: 'founding', ...usage(120, -1) })
    expect(renderHook(() => useQuota('resumes')).result.current).toMatchObject({
      unlimited: true,
      level: 'ok',
      shouldWarn: false,
    })
  })

  it('trusts the server\'s remaining over local arithmetic', () => {
    // A negotiated `limit_overrides` or a mid-period plan change can make the
    // server's figure the one enforcement will actually use.
    ready({ plan: 'plus', ...usage(20, 25, { remaining: 0 }) })
    expect(renderHook(() => useQuota('resumes')).result.current).toMatchObject({
      remaining: 0,
      isExhausted: true,
      level: 'exhausted',
    })
  })

  it('separates loading and error from a resolved quota', () => {
    ctx.state = 'loading'
    expect(renderHook(() => useQuota('resumes')).result.current.state).toBe('loading')
    ctx.state = 'error'
    expect(renderHook(() => useQuota('resumes')).result.current.state).toBe('error')
  })

  it('falls back to catalog copy when the server omits a metric', () => {
    ready({ plan: 'free', limits_usage: {} })
    const { result } = renderHook(() => useQuota('members'))
    expect(result.current).toMatchObject({ label: 'team members', unlimited: true })
  })
})
