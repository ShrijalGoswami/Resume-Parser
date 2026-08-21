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

/**
 * Every tier a customer can buy, not the next one up.
 *
 * This surface offered a single CTA derived from `nextPlan()`, which turned a
 * price list into a ladder: a Free organization was shown Plus and only Plus,
 * so Pro was reachable only by buying Plus first. Nobody decided that — it fell
 * out of a helper named "next" — and the backend never agreed with it:
 * `start_checkout` accepts `plan='pro'` from a Free organization, verified
 * directly against the service.
 */
describe('no forced upgrade ladder', () => {
  it('offers a Free organization BOTH paid tiers', () => {
    state.plan = 'free'
    state.subscription = { plan: 'free' }
    renderBilling()
    expect(screen.getByRole('button', { name: 'Upgrade to Plus' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
  })

  it('sends the plan the customer actually chose', () => {
    // THE REGRESSION. Free → Pro must send `pro`, not walk through `plus`.
    state.plan = 'free'
    state.subscription = { plan: 'free' }
    renderBilling()

    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
    expect(upgrades).toEqual([{ requiredPlan: 'pro', origin: 'plan' }])

    upgrades.length = 0
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Plus' }))
    expect(upgrades).toEqual([{ requiredPlan: 'plus', origin: 'plan' }])
  })

  it('offers a Plus organization Pro, and never Plus again', () => {
    state.plan = 'plus'
    state.subscription = { plan: 'plus' }
    renderBilling()
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upgrade to Plus' })).not.toBeInTheDocument()
  })

  it('never introduces a downgrade', () => {
    // A Pro customer must not be offered Plus. Rank, not adjacency, is what
    // decides — and a "change plan" control that quietly means "pay us less"
    // is not something to arrive at by accident.
    state.plan = 'pro'
    state.subscription = { plan: 'pro' }
    renderBilling()
    expect(screen.queryByRole('button', { name: /Upgrade/ })).not.toBeInTheDocument()
  })

  it('never offers Enterprise as a purchase', () => {
    // It has no list price. `isQuoted` keeps it a conversation here for the
    // same reason it does on the pricing page.
    state.plan = 'free'
    state.subscription = { plan: 'free' }
    renderBilling()
    expect(screen.queryByRole('button', { name: /Upgrade to Custom/ })).not.toBeInTheDocument()
  })
})

/**
 * A scheduled upgrade, persisted (migration 0029).
 *
 * The state lived only in the tab that requested it, so a refresh forgot it and
 * this screen offered "Upgrade to Pro" to a customer who had already booked
 * exactly that — telling them, in effect, that it had not worked.
 */
describe('a scheduled upgrade', () => {
  beforeEach(() => {
    state.permissions = ['org.manage']
    state.plan = 'plus'
  })

  it('states the scheduled tier, the date, the price and that nothing is charged', () => {
    state.subscription = {
      plan: 'plus',
      scheduled_plan: 'pro',
      scheduled_plan_effective_at: '2026-09-11T00:00:00Z',
    }
    renderBilling()
    expect(screen.getByText('Pro upgrade scheduled')).toBeInTheDocument()
    expect(screen.getByText('₹2,499/month')).toBeInTheDocument()
    expect(screen.getByText(/Effective 11 September 2026/)).toBeInTheDocument()
    expect(screen.getByText(/No charge today/)).toBeInTheDocument()
    expect(
      screen.getByText(/Plus plan remains active until your current billing period ends/),
    ).toBeInTheDocument()
  })

  it('does not offer the upgrade that is already booked', () => {
    state.subscription = {
      plan: 'plus',
      scheduled_plan: 'pro',
      scheduled_plan_effective_at: '2026-09-11T00:00:00Z',
    }
    renderBilling()
    expect(screen.queryByRole('button', { name: 'Upgrade to Pro' })).not.toBeInTheDocument()
  })

  it('still offers Pro when nothing is scheduled', () => {
    // The control case — the suppression must be caused by the schedule, not
    // by being on Plus.
    state.subscription = { plan: 'plus' }
    renderBilling()
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
    expect(screen.queryByText(/upgrade scheduled/)).not.toBeInTheDocument()
  })

  it('survives a reload, because it comes from the API not from memory', () => {
    // What a refresh actually does: mount fresh, read the subscription again.
    state.subscription = {
      plan: 'plus',
      scheduled_plan: 'pro',
      scheduled_plan_effective_at: '2026-09-11T00:00:00Z',
    }
    renderBilling()
    expect(screen.getByText('Pro upgrade scheduled')).toBeInTheDocument()

    cleanup()
    renderBilling() // a second, independent mount
    expect(screen.getByText('Pro upgrade scheduled')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upgrade to Pro' })).not.toBeInTheDocument()
  })

  it('shows the real plan once the upgrade has landed', () => {
    // The webhook cleared the promise and moved the plan.
    state.plan = 'pro'
    state.subscription = { plan: 'pro', scheduled_plan: null }
    renderBilling()
    expect(screen.queryByText(/upgrade scheduled/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Upgrade/ })).not.toBeInTheDocument()
  })

  it('never renders a scheduled upgrade as a cancellation', () => {
    // THE CANCELLATION BUG, from the UI side. `has_scheduled_changes` used to
    // feed `cancel_at_period_end`, and this surface renders "Access until" off
    // that field — so a customer who had just upgraded was told their access
    // was ending.
    state.subscription = {
      plan: 'plus',
      current_period_end: '2026-09-11T00:00:00Z',
      cancel_at_period_end: false,
      scheduled_plan: 'pro',
      scheduled_plan_effective_at: '2026-09-11T00:00:00Z',
    }
    renderBilling()
    expect(screen.queryByText('Access until')).not.toBeInTheDocument()
    expect(screen.getByText('Renews')).toBeInTheDocument()
  })

  it('still shows a real cancellation correctly', () => {
    state.subscription = {
      plan: 'plus',
      current_period_end: '2026-09-11T00:00:00Z',
      cancel_at_period_end: true,
    }
    renderBilling()
    expect(screen.getByText('Access until')).toBeInTheDocument()
    expect(screen.queryByText('Renews')).not.toBeInTheDocument()
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
  })

  it('no longer denies that checkout exists, now that it does', () => {
    // This assertion used to require the words "no self-serve checkout yet",
    // and it was right to until Razorpay checkout landed. Keeping it would
    // have pinned the interface to a sentence that became false the moment the
    // CTA started working — the stalest copy in the product being held in
    // place by a test written to prevent stale copy.
    renderBilling()
    expect(screen.queryByText(/no self-serve checkout yet/i)).not.toBeInTheDocument()
  })

  it('is honest that a change BETWEEN paid plans is still not self-serve', () => {
    // The backend refuses it (BILL-13) rather than pretending, so the surface
    // says so. Without this line a 409 reads as a bug rather than a policy.
    renderBilling()
    expect(screen.getByText(/Moving between paid plans/i)).toBeInTheDocument()
  })
})
