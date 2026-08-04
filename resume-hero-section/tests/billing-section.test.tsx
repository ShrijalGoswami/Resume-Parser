// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * Settings ▸ Billing.
 *
 * This is the screen a customer opens when they have decided to spend money,
 * and it had no way to. It showed the plan name, a status badge and four
 * meters, and stopped: no upgrade control, no link to the comparison, and
 * `showUpgrade` switched off on every meter — so an exhausted Free organization
 * could read exactly how exhausted it was and be offered no remedy at all.
 *
 * The dangerous part of fixing that is WHO GETS OFFERED THE UPGRADE, which is
 * the second block below.
 */

const state = vi.hoisted(() => ({
  permissions: ['org.manage'] as string[],
  plan: 'free' as string,
  ruleset: 'v1' as string,
  subscription: { plan: 'free' } as unknown,
  subscriptionState: 'ready' as 'ready' | 'loading' | 'error',
}))

vi.mock('../components/hirelens/lib/api/org-context', () => ({
  orgContextKey: ['hl', 'settings', 'org-context'],
  useOrgContext: () => ({
    data: {
      permissions: state.permissions,
      plan: state.plan,
      plan_state: { key: state.plan, ruleset: state.ruleset, status: 'active', version: 1 },
      entitlements: {},
      limits_usage: {},
    },
    isLoading: false,
    isError: false,
    refetch: () => {},
  }),
}))

vi.mock('../components/hirelens/lib/api/settings', () => ({
  useOrgContext: () => ({ data: { permissions: state.permissions }, isLoading: false, isError: false }),
  useSubscription: () => ({
    data: state.subscriptionState === 'ready' ? state.subscription : undefined,
    isLoading: state.subscriptionState === 'loading',
    isError: state.subscriptionState === 'error',
    refetch: () => {},
  }),
}))

import { BillingSection } from '../components/hirelens/settings/sections/billing-section'
import { UpgradeActionProvider } from '../components/hirelens/entitlements/upgrade-action'

const upgrades: unknown[] = []

function renderBilling() {
  upgrades.length = 0
  return render(
    <UpgradeActionProvider onUpgrade={(request) => upgrades.push(request)}>
      <BillingSection />
    </UpgradeActionProvider>,
  )
}

beforeEach(() => {
  cleanup()
  state.permissions = ['org.manage']
  state.plan = 'free'
  state.ruleset = 'v1'
  state.subscription = { plan: 'free' }
  state.subscriptionState = 'ready'
})

describe('there is a way to spend money', () => {
  it('offers the next tier up', () => {
    renderBilling()
    expect(screen.getByRole('button', { name: 'Upgrade to Plus' })).toBeInTheDocument()
  })

  it('derives the tier rather than hardcoding one', () => {
    state.plan = 'plus'
    state.subscription = { plan: 'plus' }
    renderBilling()
    // Not "Upgrade to Plus" again, which is what a hardcoded string would give
    // a Plus customer.
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
  })

  it('links the full comparison, since the plan matrix does not live here', () => {
    renderBilling()
    expect(screen.getByRole('link', { name: 'Compare plans' })).toHaveAttribute(
      'href',
      '/pricing',
    )
  })

  it('opens the shared upgrade dialog as a plan-level request', () => {
    // The same surface every lock and quota wall opens, so checkout lands in
    // one place. `origin: 'plan'` because nothing refused anyone — they came to
    // Settings to change tier, and the denial template has no subject to name.
    renderBilling()
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Plus' }))
    expect(upgrades).toEqual([{ requiredPlan: 'plus', origin: 'plan' }])
  })

  it('offers nothing at the top of the matrix', () => {
    state.plan = 'enterprise'
    state.subscription = { plan: 'enterprise' }
    renderBilling()
    expect(screen.queryByRole('button', { name: /Upgrade/ })).not.toBeInTheDocument()
  })
})

describe('who must never be offered an upgrade', () => {
  it('never sells to a founding organization', () => {
    // THE CASE THAT MATTERS. Founding is a RULESET, not a plan: it grants every
    // capability with no limits, while the plan slug underneath may be anything
    // and normalizes to `free`. Keying the CTA off the slug would put "Upgrade
    // to Plus" in front of the grandfathered customers — offering to sell them
    // strictly less than they already have, on the one screen where they check
    // what they were promised would never be taken away.
    state.ruleset = 'founding'
    state.plan = 'free'
    state.subscription = { plan: 'free' }
    renderBilling()
    expect(screen.queryByRole('button', { name: /Upgrade/ })).not.toBeInTheDocument()
  })

  it('does not offer a plan change to someone who cannot make one', () => {
    // A viewer or recruiter without `org.manage` cannot change the plan, so a
    // CTA is an invitation to a refusal.
    state.permissions = ['campaign.view']
    renderBilling()
    expect(screen.queryByRole('button', { name: /Upgrade/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Only an owner can change/)).toBeInTheDocument()
  })
})

describe('copy that had gone stale', () => {
  it('no longer says self-serve upgrade arrives with the pricing release', () => {
    // The pricing release shipped. A customer who watched /pricing go live was
    // being told the thing they were waiting for had already arrived.
    renderBilling()
    expect(screen.queryByText(/pricing release/i)).not.toBeInTheDocument()
    expect(screen.getByText(/no self-serve checkout yet/i)).toBeInTheDocument()
  })
})
