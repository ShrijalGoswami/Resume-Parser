// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

/**
 * The upgrade flow: quota value copy, the dialog, and 402 routing.
 *
 * The governing principle, and what these tests exist to hold: EVERY UPGRADE
 * PROMPT ANSWERS THREE QUESTIONS.
 *
 *   1. What is locked?
 *   2. Why would I want it?
 *   3. What happens if I upgrade?
 *
 * A surface answering only (1) is an obstacle. (1)+(2) is an explanation. Only
 * (3) makes it a decision — and (3) is the one that gets dropped, because it is
 * the only one that cannot be written without consulting the catalog.
 */

const ctx = vi.hoisted(() => ({
  state: 'ready' as 'ready' | 'loading' | 'error',
  data: undefined as unknown,
}))

vi.mock('../components/hirelens/lib/api/org-context', () => ({
  orgContextKey: ['hl', 'settings', 'org-context'],
  useOrgContext: () => {
    if (ctx.state === 'loading') {
      return { data: undefined, isLoading: true, isError: false, refetch: () => {} }
    }
    if (ctx.state === 'error') {
      return { data: undefined, isLoading: false, isError: true, refetch: () => {} }
    }
    return { data: ctx.data, isLoading: false, isError: false, refetch: () => {} }
  },
}))

import { ApiError } from '@/lib/api-error'
import { FeatureLock } from '../components/hirelens/entitlements/feature-lock'
import { QuotaLock } from '../components/hirelens/entitlements/quota-lock'
import { QuotaMeter } from '../components/hirelens/entitlements/quota-meter'
import { UpgradeDialog, UpgradeDialogProvider } from '../components/hirelens/entitlements/upgrade-dialog'
import { usePlanDenialHandler, quotaDenialOf } from '../components/hirelens/entitlements/use-plan-denial'
import { LockedButton } from '../components/hirelens/entitlements/locked-button'
import { TooltipProvider } from '../components/hirelens/ui/tooltip'
import {
  planAllowanceOf,
  upgradeValueLine,
} from '../components/hirelens/lib/entitlements/catalog'

type Usage = Record<
  string,
  { used: number; limit: number; remaining: number | null; label: string; window?: string }
>

function ready(plan: string, limits_usage: Usage, ruleset = 'v1') {
  ctx.state = 'ready'
  ctx.data = {
    organization: { id: 'org', name: 'Org', plan, settings: {} },
    role: 'owner',
    plan,
    permissions: [],
    features: {},
    plan_state: { key: plan, label: plan, status: 'active', ruleset, version: 1 },
    entitlements: {},
    limits_usage,
  }
}

const usage = (used: number, limit: number, window = 'lifetime'): Usage => ({
  resumes: {
    used,
    limit,
    remaining: limit === -1 ? null : Math.max(0, limit - used),
    label: 'résumés',
    window,
  },
})

beforeEach(() => {
  cleanup()
  ctx.state = 'ready'
  ctx.data = undefined
})

describe('value copy is derived from the catalog', () => {
  it('states what the customer receives, not just what they lack', () => {
    expect(upgradeValueLine('resumes', 'pro')).toBe('Upgrade to Pro for 700 résumés a month.')
    expect(upgradeValueLine('resumes', 'plus')).toBe('Upgrade to Plus for 200 résumés a month.')
    expect(upgradeValueLine('members', 'plus')).toBe('Upgrade to Plus for 3 team members.')
  })

  it('does not describe a seat count as a monthly allowance', () => {
    // "3 team members a month" describes a subscription nobody sells.
    expect(planAllowanceOf('members', 'plus')).toBe('3 team members')
    expect(planAllowanceOf('resumes', 'plus')).toBe('200 résumés a month')
  })

  it('never promises a trial’s credits will renew — they are lifetime', () => {
    expect(planAllowanceOf('resumes', 'trial')).toBe('10 résumés')
    expect(planAllowanceOf('resumes', 'trial_interview')).toBe('10 résumés')
    // Free's credits are lifetime too, and must not read as an allowance.
    expect(planAllowanceOf('resumes', 'free')).toBe('2 résumés')
  })

  it('offers nothing when there is no higher tier', () => {
    expect(upgradeValueLine('resumes', null)).toBeNull()
    expect(upgradeValueLine('not_a_metric', 'pro')).toBeNull()
  })
})

describe('small allowances still get a warning', () => {
  it('warns a Free user at 1 of 2, where 80% never fires', () => {
    // 1 of 2 is 50% and 2 of 2 is already the wall, so a ratio alone would take
    // a trial user from silence straight to a hard stop.
    ready('free', usage(1, 2))
    render(<QuotaMeter metric="resumes" />)
    expect(screen.getByText('1 of 2 résumés used')).toBeInTheDocument()
    expect(screen.getByText('Upgrade to Plus for 200 résumés a month.')).toBeInTheDocument()
  })

  it('stays silent when there is genuinely room', () => {
    ready('plus', usage(4, 25, 'month'))
    expect(render(<QuotaMeter metric="resumes" />).container).toBeEmptyDOMElement()
  })

  it('shows an unlimited plan a confirmation, never a 0/∞ meter', () => {
    ready('pro', usage(900, -1, 'month'))
    render(<QuotaMeter metric="resumes" variant="always" />)
    expect(screen.getByText('Unlimited')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/Upgrade/)).not.toBeInTheDocument()
  })
})

describe('the upgrade dialog answers all three questions', () => {
  const openWith = (request: Parameters<typeof UpgradeDialog>[0]['request']) =>
    render(<UpgradeDialog request={request} onOpenChange={() => {}} />)

  it('for a locked feature: what · why · what changes', () => {
    openWith({ feature: 'ai_copilot', requiredPlan: 'pro' })
    // 1. what is locked
    expect(screen.getByText('AI Copilot is on Pro')).toBeInTheDocument()
    // 2. why you would want it — the catalog blurb, not marketing
    expect(
      screen.getByText('Ask questions about your pipeline in plain language.'),
    ).toBeInTheDocument()
    // 3. what changes — the tier's other capabilities, concretely
    expect(screen.getByText('Pro also includes')).toBeInTheDocument()
    expect(screen.getByText('Semantic Search')).toBeInTheDocument()
  })

  it('for an exhausted quota: what ran out · and what you would get', () => {
    openWith({ metric: 'resumes', requiredPlan: 'plus' })
    // A quota asks for MORE — "résumés is on Plus" is not a sentence.
    expect(screen.getByText('More résumés are on Plus')).toBeInTheDocument()
    expect(screen.getByText("You’ve reached your résumés limit.")).toBeInTheDocument()
    expect(screen.getByText('Upgrade to Plus for 200 résumés a month.')).toBeInTheDocument()
    expect(screen.getByText('Plus gives you 200 résumés a month.')).toBeInTheDocument()
  })

  it('names no tier when the denial carried none', () => {
    openWith({})
    expect(screen.getByText("This feature isn’t in your plan")).toBeInTheDocument()
    expect(screen.queryByText(/Upgrade to (Plus|Pro|Enterprise)/)).not.toBeInTheDocument()
  })

  it('offers a route that works rather than a button that does nothing', () => {
    // There is no self-service checkout yet. A dead primary button is how a
    // customer concludes the product is broken rather than unfinished.
    //
    // `/contact`, NOT a `mailto:`. This is the terminus of the entire upgrade
    // funnel — every lock, quota wall and 402 in the product arrives here — and
    // a `mailto:` does nothing at all for anyone on webmail without a
    // registered protocol handler, which is most recruiters. When it fails it
    // fails silently, so the customer concludes they were ignored rather than
    // that their browser dropped the click.
    openWith({ feature: 'ai_copilot', requiredPlan: 'pro' })
    const cta = screen.getByRole('link', { name: 'Contact us to upgrade' })
    expect(cta).toHaveAttribute('href', '/contact')
  })

  it('says what happens after you write, so the CTA is not a brush-off', () => {
    openWith({ feature: 'ai_copilot', requiredPlan: 'pro' })
    expect(screen.getByText(/same working day/i)).toBeInTheDocument()
  })

  it('uses checkout once it exists, with no other change', () => {
    const onCheckout = vi.fn()
    render(
      <UpgradeDialog
        request={{ feature: 'ai_copilot', requiredPlan: 'pro' }}
        onOpenChange={() => {}}
        onCheckout={onCheckout}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
    expect(onCheckout).toHaveBeenCalledWith({ feature: 'ai_copilot', requiredPlan: 'pro' })
  })
})

describe('402 routing', () => {
  function Harness({ error }: { error: unknown }) {
    const handle = usePlanDenialHandler()
    return (
      <button type="button" onClick={() => handle(error)}>
        fire
      </button>
    )
  }

  const denial = (over: Record<string, unknown> = {}) =>
    new ApiError(402, 'AI Copilot is available on the Pro plan.', {
      code: 'feature_not_in_plan',
      detail: 'AI Copilot is available on the Pro plan.',
      feature: 'ai_copilot',
      metric: null,
      current_plan: 'free',
      required_plan: 'pro',
      upgrade_target: 'pro',
      limit: null,
      used: null,
      remaining: null,
      plan_version: 1,
      ...over,
    })

  it('turns a 402 into the dialog instead of a dead-end toast', () => {
    render(
      <UpgradeDialogProvider>
        <Harness error={denial()} />
      </UpgradeDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'fire' }))
    expect(screen.getByText('AI Copilot is on Pro')).toBeInTheDocument()
  })

  it('raises the tier when the first gate named a nearer one', () => {
    render(
      <UpgradeDialogProvider>
        <Harness error={denial({ feature: 'webhooks', required_plan: 'pro' })} />
      </UpgradeDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'fire' }))
    expect(screen.getByText('Webhooks is on Custom')).toBeInTheDocument()
  })

  it('leaves a 500 alone — an outage is not an upgrade prompt', () => {
    render(
      <UpgradeDialogProvider>
        <Harness error={new ApiError(500, 'Internal error')} />
      </UpgradeDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'fire' }))
    expect(screen.queryByText(/is on Pro/)).not.toBeInTheDocument()
  })

  it('extracts the server\'s own figures from a limit denial', () => {
    const err = new ApiError(402, 'limit', {
      code: 'limit_exceeded',
      detail: 'limit',
      feature: null,
      metric: 'resumes',
      current_plan: 'free',
      required_plan: 'plus',
      upgrade_target: 'plus',
      limit: 2,
      used: 2,
      remaining: 0,
      plan_version: 1,
    })
    expect(quotaDenialOf(err)).toEqual({
      metric: 'resumes',
      used: 2,
      limit: 2,
      requiredPlan: 'plus',
    })
    expect(quotaDenialOf(new ApiError(500, 'boom'))).toBeNull()
  })

  it('opens the same dialog from a locked control', () => {
    ready('free', {})
    ctx.data = {
      ...(ctx.data as Record<string, unknown>),
      entitlements: { export_pdf: { enabled: false, required_plan: 'plus', label: 'PDF Export' } },
    }
    render(
      <TooltipProvider>
        <UpgradeDialogProvider>
          <LockedButton feature="export_pdf">Export</LockedButton>
        </UpgradeDialogProvider>
      </TooltipProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Export/ }))
    expect(screen.getByText('PDF Export is on Plus')).toBeInTheDocument()
  })
})

/**
 * The principle, enforced. Each shared upgrade surface must render all three
 * answers — not merely be capable of it.
 */
describe('every upgrade surface answers the three questions', () => {
  it('FeatureLock', () => {
    render(<FeatureLock feature="semantic_search" requiredPlan="pro" />)
    expect(screen.getByText('Semantic Search is available on the Pro plan.')).toBeInTheDocument() // what
    expect(screen.getByText('Search your talent pool by meaning, not keywords.')).toBeInTheDocument() // why
    expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeInTheDocument() // what changes
  })

  it('QuotaLock', () => {
    render(<QuotaLock metric="resumes" used={2} limit={2} window="lifetime" requiredPlan="plus" />)
    expect(screen.getByText("You’ve used all 2 of your résumés.")).toBeInTheDocument() // what
    expect(screen.getByText('2 of 2 résumés used')).toBeInTheDocument() // why / how much
    expect(screen.getByText('Upgrade to Plus for 200 résumés a month.')).toBeInTheDocument() // what changes
  })

  it('QuotaMeter, once it is warning', () => {
    ready('free', usage(2, 2))
    render(<QuotaMeter metric="resumes" />)
    expect(screen.getByText('2 of 2 résumés used')).toBeInTheDocument()
    expect(screen.getByText('No credits left')).toBeInTheDocument()
    expect(screen.getByText('Upgrade to Plus for 200 résumés a month.')).toBeInTheDocument()
  })
})
