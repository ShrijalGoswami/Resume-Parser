// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Entitlement UI surfaces.
 *
 * Three properties are worth regression-testing here, because each one has a
 * specific customer harmed when it breaks:
 *
 *   1. A failed context request never renders an upgrade prompt. The victim is
 *      a customer who already pays for the thing being sold back to them.
 *   2. A founding organization sees no lock and no meter. The victims are all
 *      68 pre-monetization orgs, who were promised nothing would be taken away.
 *   3. No plan name is ever typed into a component. The victim is whoever reads
 *      stale copy after a feature moves tier — the "Growth plan" that lived in
 *      `gate-state.tsx` for months is the existing proof this happens.
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

import { FeatureLock } from '../components/hirelens/entitlements/feature-lock'
import { LockedButton } from '../components/hirelens/entitlements/locked-button'
import { PlanBadge } from '../components/hirelens/entitlements/plan-badge'
import { PlanGate } from '../components/hirelens/entitlements/plan-gate'
import { QuotaLock } from '../components/hirelens/entitlements/quota-lock'
import { QuotaMeter } from '../components/hirelens/entitlements/quota-meter'
import { UpgradeButton } from '../components/hirelens/entitlements/upgrade-button'
import { UpgradeActionProvider } from '../components/hirelens/entitlements/upgrade-action'
import { TooltipProvider } from '../components/hirelens/ui/tooltip'

type Ent = Record<string, { enabled: boolean; required_plan: string; label: string }>
type Usage = Record<
  string,
  { used: number; limit: number; remaining: number | null; label: string; window?: string }
>

function ready(opts: {
  plan?: string
  ruleset?: string
  status?: string
  entitlements?: Ent
  limits_usage?: Usage
}) {
  const { plan = 'free', ruleset = 'v1', status = 'active' } = opts
  ctx.state = 'ready'
  ctx.data = {
    organization: { id: 'org', name: 'Org', plan, settings: {} },
    role: 'owner',
    plan,
    permissions: [],
    features: {},
    plan_state: { key: plan, label: plan, status, ruleset, version: 1 },
    entitlements: opts.entitlements ?? {},
    limits_usage: opts.limits_usage ?? {},
  }
}

const locked = (key: string, required: string, label: string): Ent => ({
  [key]: { enabled: false, required_plan: required, label },
})

beforeEach(() => {
  cleanup()
  ctx.state = 'ready'
  ctx.data = undefined
  ctx.refetched = 0
})

describe('FeatureLock', () => {
  it('derives the headline, the blurb and the CTA from the catalog', () => {
    render(<FeatureLock feature="ai_copilot" requiredPlan="pro" />)
    expect(screen.getByText('AI Copilot is available on the Pro plan.')).toBeInTheDocument()
    expect(
      screen.getByText('Ask questions about your pipeline in plain language.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
  })

  it('says something true when no tier would help', () => {
    render(<FeatureLock feature="ai_copilot" requiredPlan={null} />)
    expect(screen.getByText('AI Copilot is not included in your plan.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade' })).toBeInTheDocument()
  })
})

describe('PlanGate — four states', () => {
  const child = <p>copilot content</p>

  it('renders children when the server allows', () => {
    ready({ plan: 'pro', entitlements: { ai_copilot: { enabled: true, required_plan: 'pro', label: 'AI Copilot' } } })
    render(<PlanGate feature="ai_copilot">{child}</PlanGate>)
    expect(screen.getByText('copilot content')).toBeInTheDocument()
  })

  it('renders a lock when the server denies', () => {
    ready({ entitlements: locked('ai_copilot', 'pro', 'AI Copilot') })
    render(<PlanGate feature="ai_copilot">{child}</PlanGate>)
    expect(screen.queryByText('copilot content')).not.toBeInTheDocument()
    expect(screen.getByText('AI Copilot is available on the Pro plan.')).toBeInTheDocument()
  })

  it('shows RETRY, not an upgrade, when the context request failed', () => {
    // The whole point. A 503 must never be rendered as "you need to pay".
    ctx.state = 'error'
    render(<PlanGate feature="ai_copilot">{child}</PlanGate>)
    expect(screen.queryByText(/Upgrade/)).not.toBeInTheDocument()
    expect(screen.queryByText(/available on the/)).not.toBeInTheDocument()
    const retry = screen.getByRole('button', { name: 'Try again' })
    fireEvent.click(retry)
    expect(ctx.refetched).toBe(1)
  })

  it('shows neither content nor a lock while loading', () => {
    ctx.state = 'loading'
    render(<PlanGate feature="ai_copilot">{child}</PlanGate>)
    expect(screen.queryByText('copilot content')).not.toBeInTheDocument()
    expect(screen.queryByText(/Upgrade/)).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('does not lock a founding organization', () => {
    ready({
      plan: 'free',
      ruleset: 'founding',
      entitlements: { ai_copilot: { enabled: true, required_plan: 'pro', label: 'AI Copilot' } },
    })
    render(<PlanGate feature="ai_copilot">{child}</PlanGate>)
    expect(screen.getByText('copilot content')).toBeInTheDocument()
  })

  it('names the tier the feature actually needs, not the first gate hit', () => {
    // The Integrations router refuses a Free user before the webhooks endpoint
    // does, so the server says "pro". Pro would not unlock webhooks.
    ready({ entitlements: locked('webhooks', 'pro', 'Webhooks') })
    render(<PlanGate feature="webhooks">{child}</PlanGate>)
    expect(screen.getByText('Webhooks is available on the Enterprise plan.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade to Enterprise' })).toBeInTheDocument()
  })
})

describe('LockedButton', () => {
  const renderLocked = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>)

  it('stays clickable when locked and routes the click to the upgrade path', () => {
    // A disabled button explains nothing and reads as a bug. The lock is the
    // sales surface, so it has to be reachable.
    ready({ entitlements: locked('export_pdf', 'plus', 'PDF Export') })
    const onUpgrade = vi.fn()
    renderLocked(
      <UpgradeActionProvider onUpgrade={onUpgrade}>
        <LockedButton feature="export_pdf">Export</LockedButton>
      </UpgradeActionProvider>,
    )
    const button = screen.getByRole('button', { name: /Export/ })
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onUpgrade).toHaveBeenCalledWith({ feature: 'export_pdf', requiredPlan: 'plus' })
  })

  it('runs the real handler when entitled', () => {
    ready({ plan: 'plus', entitlements: { export_pdf: { enabled: true, required_plan: 'plus', label: 'PDF Export' } } })
    const onClick = vi.fn()
    renderLocked(
      <LockedButton feature="export_pdf" onClick={onClick}>
        Export
      </LockedButton>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(onClick).toHaveBeenCalled()
  })

  it('is quiet and disabled while loading — no lock flash', () => {
    ctx.state = 'loading'
    renderLocked(<LockedButton feature="export_pdf">Export</LockedButton>)
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
  })

  it('stays usable on error rather than withholding', () => {
    // We failed to find out; the server still enforces and a 402 will surface
    // the proper surface. Withholding on a failed request is the mistake.
    ctx.state = 'error'
    const onClick = vi.fn()
    renderLocked(
      <LockedButton feature="export_pdf" onClick={onClick}>
        Export
      </LockedButton>,
    )
    const button = screen.getByRole('button', { name: 'Export' })
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalled()
  })
})

describe('QuotaMeter', () => {
  const usage = (used: number, limit: number, window = 'lifetime'): Usage => ({
    resumes: {
      used,
      limit,
      remaining: limit === -1 ? null : Math.max(0, limit - used),
      label: 'résumés',
      window,
    },
  })

  it('is silent well below the limit', () => {
    ready({ plan: 'plus', limits_usage: usage(5, 25, 'month') })
    const { container } = render(<QuotaMeter metric="resumes" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('appears at 80% with the figure and an upgrade path', () => {
    ready({ plan: 'plus', limits_usage: usage(20, 25, 'month') })
    render(<QuotaMeter metric="resumes" />)
    expect(screen.getByText('20 of 25 résumés used')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument()
  })

  it('marks exhaustion, and only promises renewal when something renews', () => {
    ready({ plan: 'plus', limits_usage: usage(25, 25, 'month') })
    render(<QuotaMeter metric="resumes" />)
    expect(screen.getByText('Renews next month')).toBeInTheDocument()
    cleanup()

    // Free credits are for the lifetime of the org. Telling a Free user their
    // credits renew is a promise the product breaks four weeks later.
    ready({ plan: 'free', limits_usage: usage(2, 2, 'lifetime') })
    render(<QuotaMeter metric="resumes" />)
    expect(screen.queryByText('Renews next month')).not.toBeInTheDocument()
    expect(screen.getByText('No credits left')).toBeInTheDocument()
  })

  it('never interrupts an unlimited plan or a founding organization', () => {
    // The warning-only variant is the one that appears unprompted, so it must
    // stay completely silent where there is no allowance to run out of.
    ready({ plan: 'pro', limits_usage: usage(4000, -1, 'month') })
    expect(render(<QuotaMeter metric="resumes" />).container).toBeEmptyDOMElement()
    cleanup()
    ready({ plan: 'free', ruleset: 'founding', limits_usage: usage(120, -1) })
    expect(render(<QuotaMeter metric="resumes" />).container).toBeEmptyDOMElement()
  })

  it('states "Unlimited" where the figure is the content (Settings)', () => {
    // On a surface the customer opened deliberately, an absent row is worse
    // than an answer — they cannot tell unlimited from failed-to-load.
    ready({ plan: 'pro', limits_usage: usage(4000, -1, 'month') })
    render(<QuotaMeter metric="resumes" variant="always" />)
    expect(screen.getByText('Unlimited')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('renders nothing while loading or on error — never a confident zero', () => {
    ctx.state = 'loading'
    expect(render(<QuotaMeter metric="resumes" variant="always" />).container).toBeEmptyDOMElement()
    cleanup()
    ctx.state = 'error'
    expect(render(<QuotaMeter metric="resumes" variant="always" />).container).toBeEmptyDOMElement()
  })

  it('exposes the figure to assistive tech', () => {
    ready({ plan: 'free', limits_usage: usage(2, 2) })
    render(<QuotaMeter metric="resumes" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '2')
    expect(bar).toHaveAttribute('aria-valuemax', '2')
  })
})

describe('QuotaLock', () => {
  it('reads as volume, not capability', () => {
    render(<QuotaLock metric="resumes" used={2} limit={2} window="lifetime" requiredPlan="plus" />)
    expect(screen.getByText("You’ve used all 2 of your résumés.")).toBeInTheDocument()
    expect(screen.getByText('2 of 2 résumés used')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upgrade to Plus' })).toBeInTheDocument()
  })

  it('offers renewal only on a renewing window', () => {
    render(<QuotaLock metric="resumes" used={25} limit={25} window="month" requiredPlan="pro" />)
    expect(screen.getByText(/renews at the start of next month/)).toBeInTheDocument()
    cleanup()
    render(<QuotaLock metric="resumes" used={2} limit={2} window="lifetime" requiredPlan="plus" />)
    expect(screen.queryByText(/renews at the start of next month/)).not.toBeInTheDocument()
  })
})

describe('PlanBadge', () => {
  it('names a founding organization for what it is', () => {
    ready({ plan: 'free', ruleset: 'founding' })
    render(<PlanBadge />)
    expect(screen.getByText('Founding')).toBeInTheDocument()
  })

  it('normalizes a legacy slug instead of showing it raw', () => {
    ready({ plan: 'business' })
    render(<PlanBadge />)
    expect(screen.getByText('Pro')).toBeInTheDocument()
  })

  it('surfaces a billing problem without threatening access', () => {
    ready({ plan: 'pro', status: 'past_due' })
    render(<PlanBadge />)
    expect(screen.getByText('Pro · Payment due')).toBeInTheDocument()
  })

  it('renders nothing while loading or on error — never a wrong plan', () => {
    ctx.state = 'loading'
    expect(render(<PlanBadge />).container).toBeEmptyDOMElement()
    cleanup()
    ctx.state = 'error'
    expect(render(<PlanBadge />).container).toBeEmptyDOMElement()
  })
})

describe('UpgradeButton', () => {
  it('derives its label from the tier', () => {
    render(<UpgradeButton requiredPlan="enterprise" />)
    expect(screen.getByRole('button', { name: 'Upgrade to Enterprise' })).toBeInTheDocument()
  })

  it('is inert rather than broken with no provider mounted', () => {
    // There is no self-service plan change yet. A CTA that 404s is worse than
    // one that does nothing while we are still building the destination.
    render(<UpgradeButton requiredPlan="pro" />)
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow()
  })
})

describe('GateState stays generic', () => {
  // Read from the project root: `import.meta.url` is not a file URL under the
  // jsdom environment this suite runs in.
  const source = readFileSync(
    resolve(process.cwd(), 'components/hirelens/states/gate-state.tsx'),
    'utf-8',
  )

  it('imports nothing from the entitlement layer', () => {
    // A presentation primitive that reaches into the catalog is how
    // product-specific copy starts leaking into shared components.
    expect(source).not.toMatch(/from\s+['"].*entitlements/)
    expect(source).not.toMatch(/lib\/entitlements/)
  })

  it('names no plan, price, metric or billing concept', () => {
    // The phantom "Growth plan" lived in this file's own documentation for
    // months because nothing checked it. Now something does.
    const code = source.replace(/^\s*\/\/.*$/gm, '')
    for (const forbidden of ['Growth', 'Plus', 'Enterprise', 'résumé', 'resume', 'Stripe', 'billing', 'price']) {
      expect(
        new RegExp(`\\b${forbidden}\\b`).test(code.replace(/\/\*[\s\S]*?\*\//g, '')),
        `gate-state.tsx must not mention "${forbidden}"`,
      ).toBe(false)
    }
  })
})
