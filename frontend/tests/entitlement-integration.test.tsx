// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Entitlements wired into real surfaces.
 *
 * Phase 2.1 and 2.2 proved the layer works in isolation. What can still go
 * wrong is the wiring: a rail that hides what it should lock, a screen that
 * writes its own upgrade sentence, a meter that shows up for an organization
 * with no limits. Each of those is invisible in a unit test of the primitive
 * and obvious to the customer.
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

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {}, back: () => {} }),
}))

import { LeftNav } from '../components/hirelens/shell/left-nav'
import { navGroups } from '../components/hirelens/shell/nav-config'
import { ShellProvider } from '../components/hirelens/shell/shell-context'
import { TooltipProvider } from '../components/hirelens/ui/tooltip'
import { QuotaMeter } from '../components/hirelens/entitlements'

type Ent = Record<string, { enabled: boolean; required_plan: string; label: string }>

function ready(opts: {
  plan?: string
  ruleset?: string
  permissions?: string[]
  entitlements?: Ent
  limits_usage?: Record<
    string,
    { used: number; limit: number; remaining: number | null; label: string; window?: string }
  >
}) {
  const { plan = 'free', ruleset = 'v1' } = opts
  ctx.state = 'ready'
  ctx.data = {
    organization: { id: 'org', name: 'Org', plan, settings: {} },
    role: 'owner',
    plan,
    // Every permission the rail filters on, so these tests isolate the
    // ENTITLEMENT behaviour rather than accidentally testing RBAC.
    permissions: opts.permissions ?? ['ai.use', 'usage.view'],
    features: {},
    plan_state: { key: plan, label: plan, status: 'active', ruleset, version: 1 },
    entitlements: opts.entitlements ?? {},
    limits_usage: opts.limits_usage ?? {},
  }
}

// The rail's account menu calls `useLogout`, which needs a query client. The
// org context itself is mocked above, so nothing here actually fetches.
const renderNav = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TooltipProvider>
        <ShellProvider>
          <LeftNav />
        </ShellProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )

// jsdom ships no `matchMedia`; the rail uses it to auto-collapse below 1280.
// Reporting "no match" keeps the rail expanded, which is where the labels and
// the lock affordance live.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
})

beforeEach(() => {
  cleanup()
  ctx.state = 'ready'
  ctx.data = undefined
})

describe('navigation: permission hides, entitlement locks', () => {
  const lockedCopilot: Ent = {
    ai_copilot: { enabled: false, required_plan: 'pro', label: 'AI Copilot' },
    advanced_analytics: { enabled: false, required_plan: 'pro', label: 'Advanced Analytics' },
  }

  it('keeps a locked destination visible and navigable', () => {
    // A hidden feature sells nothing. The customer must be able to see that
    // Ask exists, and reach the surface that explains what it costs.
    ready({ entitlements: lockedCopilot })
    renderNav()
    const ask = screen.getByRole('link', { name: /Ask/ })
    expect(ask).toBeInTheDocument()
    expect(ask).toHaveAttribute('href', '/ask')
    expect(ask).toHaveAttribute('data-locked', 'true')
  })

  it('announces the lock rather than relying on a glyph', () => {
    ready({ entitlements: lockedCopilot })
    renderNav()
    expect(screen.getAllByText('Not included in your plan').length).toBeGreaterThan(0)
  })

  it('still HIDES a destination the role cannot use', () => {
    // The opposite rule, unchanged: no amount of money gets a viewer into Ask.
    ready({ permissions: [], entitlements: lockedCopilot })
    renderNav()
    expect(screen.queryByRole('link', { name: /Ask/ })).not.toBeInTheDocument()
  })

  it('does not lock anything for an entitled organization', () => {
    ready({
      plan: 'pro',
      entitlements: {
        ai_copilot: { enabled: true, required_plan: 'pro', label: 'AI Copilot' },
        advanced_analytics: { enabled: true, required_plan: 'pro', label: 'Advanced Analytics' },
      },
    })
    renderNav()
    expect(screen.getByRole('link', { name: /Ask/ })).not.toHaveAttribute('data-locked')
  })

  it('does not lock a founding organization', () => {
    ready({
      ruleset: 'founding',
      entitlements: {
        ai_copilot: { enabled: true, required_plan: 'pro', label: 'AI Copilot' },
      },
    })
    renderNav()
    expect(screen.getByRole('link', { name: /Ask/ })).not.toHaveAttribute('data-locked')
  })

  it('locks nothing while the context is loading or failed', () => {
    // A rail that marks a paying customer's features unavailable because a
    // request failed makes the same false accusation the gate hooks refuse to.
    for (const state of ['loading', 'error'] as const) {
      cleanup()
      ctx.state = state
      renderNav()
      expect(screen.getByRole('link', { name: /Ask/ })).not.toHaveAttribute('data-locked')
    }
  })

  it('every nav entitlement key exists in the catalog', async () => {
    const { FEATURE_KEYS } = await import('../components/hirelens/lib/entitlements/catalog')
    const keys = navGroups.flatMap((g) => g.items.map((i) => i.entitlement)).filter(Boolean)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(FEATURE_KEYS, `nav references unknown feature "${key}"`).toContain(key)
    }
  })
})

describe('Settings usage widgets', () => {
  it('reads as content, not a warning, when there is room', () => {
    ready({
      plan: 'plus',
      limits_usage: {
        resumes: { used: 3, limit: 25, remaining: 22, label: 'résumés', window: 'month' },
      },
    })
    render(<QuotaMeter metric="resumes" variant="always" />)
    expect(screen.getByText('3 of 25 résumés used')).toBeInTheDocument()
  })

  it('says "Unlimited" rather than going missing', () => {
    // A Pro customer reading their plan should see the answer, not an absence
    // they have to interpret as either unlimited or broken.
    ready({
      plan: 'pro',
      limits_usage: {
        resumes: { used: 900, limit: -1, remaining: null, label: 'résumés', window: 'month' },
      },
    })
    render(<QuotaMeter metric="resumes" variant="always" />)
    expect(screen.getByText('Unlimited')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows a founding organization Unlimited too, and never a bar', () => {
    ready({
      ruleset: 'founding',
      limits_usage: {
        members: { used: 12, limit: -1, remaining: null, label: 'team members' },
      },
    })
    render(<QuotaMeter metric="members" variant="always" />)
    expect(screen.getByText('Unlimited')).toBeInTheDocument()
  })
})

/**
 * The architectural rule, enforced mechanically.
 *
 * "Never let individual pages manually compose lock UI." By the end of Phase 2
 * there must be exactly one visual language for locked features, exhausted
 * quotas, upgrade actions, plan badges and usage meters — and the only reliable
 * way to keep that true across future work is to make the alternative fail.
 */
describe('one visual language', () => {
  const root = resolve(process.cwd(), 'components/hirelens')
  // The primitives themselves, plus the catalog layer they derive copy FROM.
  // `lib/entitlements` is where "Upgrade to …" is generated and documented; the
  // rule is about screens not composing it, not about it never existing.
  const ALLOWED = ['entitlements/', 'states/', 'lib/entitlements/']

  function walk(dir: string, acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) walk(full, acc)
      else if (/\.tsx?$/.test(entry) && !/\.stories\.tsx$/.test(entry)) acc.push(full)
    }
    return acc
  }

  const files = walk(root).filter((f) => {
    const rel = f.slice(root.length + 1).replace(/\\/g, '/')
    return !ALLOWED.some((dir) => rel.startsWith(dir))
  })

  /** Source with comments removed — see the note on the hand-written-copy test. */
  const rendered = (file: string) =>
    readFileSync(file, 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  it('no screen renders a plan gate directly', () => {
    // `GateState reason="plan"` is the raw primitive. Screens must reach for
    // FeatureLock or QuotaLock so the sentence, glyph and CTA stay identical
    // everywhere. `reason="permission"` is deliberately still allowed: those
    // messages are role-specific prose with no catalog to derive from.
    const offenders = files.filter((f) =>
      /<GateState[\s\S]{0,200}?reason=["']plan["']/.test(readFileSync(f, 'utf-8')),
    )
    expect(offenders.map((f) => f.slice(root.length + 1))).toEqual([])
  })

  it('no screen hand-writes upgrade copy', () => {
    // "Upgrade to Pro" typed into a component is the same defect as
    // `if (plan === 'PRO')`, and it goes stale silently when a feature moves.
    //
    // Comments stripped, matching the file-scanning tests in pricing.test.tsx
    // and for the same reason: a component's prose may quote the hardcoded
    // string it is explaining why NOT to use, and that explanation is the thing
    // most likely to stop the next person reinstating it. Only rendered code is
    // the subject here — a JSX comment reaches no customer.
    const offenders = files.filter((f) =>
      /Upgrade to (Free|Plus|Pro|Enterprise|Growth)/.test(rendered(f)),
    )
    expect(offenders.map((f) => f.slice(root.length + 1))).toEqual([])
  })

  it('no screen invents its own "available on the … plan" sentence', () => {
    const offenders = files.filter((f) =>
      /available on the .{0,20}plan/i.test(readFileSync(f, 'utf-8')),
    )
    expect(offenders.map((f) => f.slice(root.length + 1))).toEqual([])
  })
})
