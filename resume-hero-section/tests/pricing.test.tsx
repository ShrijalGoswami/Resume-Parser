// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The pricing experience.
 *
 * The failure this file exists to prevent: the page promising something the
 * product does not enforce. A pricing page is the one surface where being
 * wrong costs trust rather than time — the customer finds out after paying,
 * which is the worst possible moment.
 *
 * So the assertions are mostly about DERIVATION, not appearance: the
 * comparison table must come from the entitlement catalog, prices must come
 * from `lib/pricing`, and neither may be typed by hand into a component.
 */

vi.mock('@/components/hirelens/lib/api/use-session', () => ({
  useSession: () => ({ session: sessionState.current, loading: false, configured: true }),
}))

const sessionState = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/pricing',
  useRouter: () => ({ push: () => {}, replace: () => {}, prefetch: () => {}, back: () => {} }),
}))

import {
  FEATURES,
  FEATURE_KEYS,
  LIMITS,
  PLAN_KEYS,
  PLAN_LABELS,
} from '../components/hirelens/lib/entitlements/catalog'
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  PRICING,
  YEARLY_BILLING_ENABLED,
  availableBillingPeriods,
  availableCurrencies,
  checkoutUnavailableReason,
  formatPrice,
  isCheckoutSupported,
  isQuoted,
  priceOf,
  priceSuffix,
} from '../lib/pricing'
import { ComparisonTable } from '../components/marketing/pricing/comparison-table'
import { PlanCards } from '../components/marketing/pricing/plan-cards'
import { PricingFaq } from '../components/marketing/pricing/pricing-faq'
import { CurrencyToggle } from '../components/marketing/pricing/currency-toggle'
import { PlanCta } from '../components/marketing/pricing/plan-cta'
import { UpgradeDialogProvider } from '../components/hirelens/entitlements'
import {
  useCurrencyPreference,
  __resetCurrencyPreference,
} from '../components/marketing/pricing/use-currency-preference'

beforeEach(() => {
  cleanup()
  sessionState.current = null
})

describe('price configuration', () => {
  it('quotes the agreed INR figures', () => {
    expect(formatPrice('free', 'INR')).toBe('Free')
    expect(formatPrice('plus', 'INR')).toBe('₹999')
    expect(formatPrice('pro', 'INR')).toBe('₹2,499')
    expect(formatPrice('enterprise', 'INR')).toBe('Custom')
  })

  it('says /month only where something recurs', () => {
    // "Free /month" is noise and "Custom /month" is a guess about a contract
    // nobody has written yet.
    expect(priceSuffix('plus', 'INR')).toBe('/month')
    expect(priceSuffix('free', 'INR')).toBe('')
    expect(priceSuffix('enterprise', 'INR')).toBe('')
  })

  it('quotes the agreed USD figures — set for that market, not converted', () => {
    // $19 is not ₹999 at any exchange rate, and that is the point: each column
    // is an independent decision about what a market will pay. An FX-derived
    // price moves when the rupee moves, which is a reason to change a price
    // that has nothing to do with the product or the customer.
    expect(formatPrice('free', 'USD')).toBe('Free')
    expect(formatPrice('plus', 'USD')).toBe('$19')
    expect(formatPrice('pro', 'USD')).toBe('$49')
    expect(formatPrice('enterprise', 'USD')).toBe('Custom')
  })

  it('does not compute one market from another', () => {
    // No conversion arithmetic anywhere in the module — an FX constant here
    // would be the first step back toward exchange-rate pricing.
    //
    // Comments are stripped first: the module's own prose explains WHY it does
    // not convert, and that explanation is the thing most likely to stop
    // someone reintroducing it.
    const source = readFileSync(resolve(process.cwd(), 'lib/pricing.ts'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(source).not.toMatch(/rate|convert|exchange|\*\s*\d{2,}/i)
  })

  it('exposes both markets, and never an unconfirmed one', () => {
    expect(availableCurrencies().map((c) => c.code).sort()).toEqual(['INR', 'USD'])
    for (const currency of Object.values(CURRENCIES)) {
      expect(typeof currency.confirmed).toBe('boolean')
    }
  })

  it('cannot confirm a market that still has placeholder prices', () => {
    // The exact footgun: flipping `confirmed` before the numbers are decided
    // would quote "Free" on every paid tier.
    for (const currency of availableCurrencies()) {
      for (const plan of PLAN_KEYS) {
        if (isQuoted(plan) || plan === 'free') continue
        expect(
          PRICING[currency.code][plan].monthly,
          `${currency.market} has no real price for ${plan}`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('names the market each price list belongs to', () => {
    expect(CURRENCIES.INR.market).toBe('India')
    expect(CURRENCIES.USD.market).toBe('United States')
  })

  it('has a price for every plan in the catalog, and no others', () => {
    // A new tier must not silently render blank.
    expect(Object.keys(PRICING[DEFAULT_CURRENCY]).sort()).toEqual([...PLAN_KEYS].sort())
  })

  it('prices ascend with the tiers, in every market', () => {
    for (const currency of availableCurrencies()) {
      const listed = PLAN_KEYS.filter((p) => !isQuoted(p)).map(
        (p) => PRICING[currency.code][p].monthly as number,
      )
      expect(listed, `${currency.market} prices are out of order`).toEqual(
        [...listed].sort((a, b) => a - b),
      )
    }
  })

  it('keeps money out of the entitlement catalog', () => {
    // The catalog decides access and is mirrored from the server. A commercial
    // number inside it would mean a pricing change touching the module that
    // gates the product.
    const catalog = readFileSync(
      resolve(process.cwd(), 'components/hirelens/lib/entitlements/catalog.ts'),
      'utf-8',
    )
    expect(catalog).not.toMatch(/₹|\$\d|price|USD|INR/i)
  })
})

describe('comparison table is derived from the catalog', () => {
  it('renders a column for every plan', () => {
    render(<ComparisonTable featured="pro" />)
    for (const plan of PLAN_KEYS) {
      expect(screen.getByRole('columnheader', { name: PLAN_LABELS[plan] })).toBeInTheDocument()
    }
  })

  it('renders a row for every catalog feature — none missing, none invented', () => {
    render(<ComparisonTable featured="pro" />)
    for (const key of FEATURE_KEYS) {
      expect(
        screen.getByRole('rowheader', { name: new RegExp(FEATURES[key].label) }),
        `no row for ${key}`,
      ).toBeInTheDocument()
    }
  })

  it('marks a cell included exactly when the plan includes it', () => {
    render(<ComparisonTable featured="pro" />)
    // AI Copilot is Pro: absent on Free and Plus, present on Pro and Enterprise.
    const row = screen.getByRole('rowheader', { name: /AI Copilot/ }).closest('tr')!
    expect(within(row).getByText('AI Copilot on Free: not included')).toBeInTheDocument()
    expect(within(row).getByText('AI Copilot on Plus: not included')).toBeInTheDocument()
    expect(within(row).getByText('AI Copilot on Pro: included')).toBeInTheDocument()
    expect(within(row).getByText('AI Copilot on Enterprise: included')).toBeInTheDocument()
  })

  it('states limits the way the server enforces them', () => {
    render(<ComparisonTable featured="pro" />)
    const row = screen.getByRole('rowheader', { name: /résumés/ }).closest('tr')!
    // Free's credits are lifetime — "2 / month" would promise a reset that
    // never comes and the customer would discover it in week five.
    expect(within(row).getByText(`${LIMITS.free.resumes} total`)).toBeInTheDocument()
    expect(within(row).getByText(`${LIMITS.plus.resumes} / month`)).toBeInTheDocument()
    expect(within(row).getAllByText('Unlimited').length).toBeGreaterThan(0)
  })

  it('never advertises the founding ruleset — it is not for sale', () => {
    const { container } = render(<ComparisonTable featured="pro" />)
    expect(container.textContent).not.toMatch(/founding/i)
  })
})

describe('plan cards', () => {
  const renderCards = () =>
    render(
      <UpgradeDialogProvider>
        <PlanCards currency="INR" />
      </UpgradeDialogProvider>,
    )

  it('shows all four plans with their prices', () => {
    renderCards()
    for (const plan of PLAN_KEYS) {
      expect(screen.getByRole('heading', { name: PLAN_LABELS[plan] })).toBeInTheDocument()
    }
    expect(screen.getByText('₹999')).toBeInTheDocument()
    expect(screen.getByText('₹2,499')).toBeInTheDocument()
    expect(screen.getByText('Custom')).toBeInTheDocument()
  })

  it('does not promise a monthly reset on the free trial credits', () => {
    renderCards()
    expect(screen.getByText(/2 résumés to try/)).toBeInTheDocument()
  })
})

describe('upgrade CTA flow', () => {
  it('sends a signed-out visitor to sign up', () => {
    render(
      <UpgradeDialogProvider>
        <PlanCta plan="pro" />
      </UpgradeDialogProvider>,
    )
    expect(screen.getByRole('link', { name: 'Start with Pro' })).toHaveAttribute(
      'href',
      '/auth/signup',
    )
  })

  it('opens the SAME upgrade dialog the product uses when signed in', () => {
    // Not a bespoke marketing flow: one upgrade surface for the whole product,
    // so billing only ever has to be wired in one place.
    sessionState.current = { user: { id: 'u1' } }
    render(
      <UpgradeDialogProvider>
        <PlanCta plan="pro" />
      </UpgradeDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
    expect(screen.getByRole('heading', { name: 'Move to Pro' })).toBeInTheDocument()
  })

  it('speaks about a TIER, not a missing feature, when entered from a price card', () => {
    // The defect this replaces: the cards called `upgrade({ requiredPlan })`
    // with no feature and no metric, the dialog ran its denial template anyway,
    // and the result was the heading "This feature is on Pro" over the sentence
    // "Pro includes ." — a word and a full stop — at the single highest-intent
    // click in the entire funnel.
    sessionState.current = { user: { id: 'u1' } }
    render(
      <UpgradeDialogProvider>
        <PlanCta plan="pro" />
      </UpgradeDialogProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Pro' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).not.toHaveTextContent('This feature')
    // No sentence may end in a bare full stop with nothing before it.
    expect(dialog.textContent).not.toMatch(/includes \./)
    expect(dialog.textContent).not.toMatch(/\s\.\s/)
  })

  it('routes Enterprise to a conversation on any plan', () => {
    // `/contact`, not a bare `mailto:`. A `mailto:` does nothing for anyone on
    // webmail without a protocol handler, and fails silently — which on an
    // enterprise enquiry means the lead never arrives at all.
    render(
      <UpgradeDialogProvider>
        <PlanCta plan="enterprise" />
      </UpgradeDialogProvider>,
    )
    expect(screen.getByRole('link', { name: 'Talk to sales' })).toHaveAttribute(
      'href',
      '/contact',
    )
  })

  it('does not offer a signed-in visitor an upgrade to Free', () => {
    sessionState.current = { user: { id: 'u1' } }
    render(
      <UpgradeDialogProvider>
        <PlanCta plan="free" />
      </UpgradeDialogProvider>,
    )
    expect(screen.getByRole('link', { name: 'Go to HireLens' })).toBeInTheDocument()
  })
})

describe('currency selector', () => {
  it('offers both currencies and marks the current one', () => {
    render(<CurrencyToggle value="INR" onChange={() => {}} />)
    const group = screen.getByRole('radiogroup', { name: 'Currency' })
    expect(within(group).getByRole('radio', { name: 'Indian Rupee (INR)' })).toBeChecked()
    expect(within(group).getByRole('radio', { name: 'US Dollar (USD)' })).not.toBeChecked()
  })

  it('switches currency on selection', () => {
    const onChange = vi.fn()
    render(<CurrencyToggle value="INR" onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: 'US Dollar (USD)' }))
    expect(onChange).toHaveBeenCalledWith('USD')
  })

  it('names currencies, not just symbols, for assistive tech', () => {
    // "₹ INR" does not read correctly out loud.
    render(<CurrencyToggle value="USD" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Indian Rupee (INR)' })).toBeInTheDocument()
  })
})

describe('currency selection', () => {
  it('quotes the US list when USD is selected', () => {
    render(
      <UpgradeDialogProvider>
        <PlanCards currency="USD" />
      </UpgradeDialogProvider>,
    )
    expect(screen.getByText('$19')).toBeInTheDocument()
    expect(screen.getByText('$49')).toBeInTheDocument()
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument()
  })
})

describe('a market we quote but cannot charge', () => {
  /**
   * Razorpay settles INR. International payments are a deferred decision, and
   * the deferral was recorded — but only in a backlog, so the page went on
   * offering a self-serve purchase anyway: a US visitor was auto-detected into
   * USD, quoted $19, and given "Start with Plus" leading to signup and an
   * upgrade prompt for a transaction that cannot happen in dollars.
   *
   * Quoting the market is fine. Selling into it is not.
   */
  it('knows which currencies checkout can actually complete in', () => {
    expect(isCheckoutSupported('INR')).toBe(true)
    expect(isCheckoutSupported('USD')).toBe(false)
  })

  it('sends a paid plan to sales rather than into signup', () => {
    render(
      <UpgradeDialogProvider>
        <PlanCta plan="plus" currency="USD" />
      </UpgradeDialogProvider>,
    )
    expect(screen.getByRole('link', { name: 'Talk to sales' })).toHaveAttribute(
      'href',
      '/contact',
    )
    expect(screen.queryByRole('link', { name: /Start with/ })).not.toBeInTheDocument()
  })

  it('still lets an unchargeable market start on Free', () => {
    // Nothing is collected for Free, so there is no reason to block it — and
    // every reason not to, since it is how they evaluate the product at all.
    render(
      <UpgradeDialogProvider>
        <PlanCta plan="free" currency="USD" />
      </UpgradeDialogProvider>,
    )
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute(
      'href',
      '/auth/signup',
    )
  })

  it('keeps the self-serve path intact for the market we can charge', () => {
    render(
      <UpgradeDialogProvider>
        <PlanCta plan="plus" currency="INR" />
      </UpgradeDialogProvider>,
    )
    expect(screen.getByRole('link', { name: 'Start with Plus' })).toBeInTheDocument()
  })

  it('explains itself on the page rather than only in the button', () => {
    expect(checkoutUnavailableReason('USD')).toMatch(/talk to us/i)
    expect(checkoutUnavailableReason('INR')).toBeNull()
  })
})

describe('the page does not contradict how billing works', () => {
  it('states prices as GST-inclusive', () => {
    // `net + tax = total` is enforced in the billing domain and by a CHECK
    // constraint on the invoices table: the advertised figure IS the amount
    // charged. The page said "Prices exclude applicable taxes", which the first
    // invoice we ever issued would have contradicted.
    const source = readFileSync(
      resolve(process.cwd(), 'components/marketing/pricing/pricing-screen.tsx'),
      'utf-8',
    )
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    expect(source).not.toMatch(/exclude applicable taxes/i)
    expect(source).toMatch(/include GST/i)
  })

  it('does not contradict the comparison table about audit logs', () => {
    // The Enterprise notes claimed audit logs were "available to every plan to
    // read" while the catalog-derived table beside them showed "—" for Free,
    // Plus and Pro. The table is what the server enforces.
    const notes = readFileSync(
      resolve(process.cwd(), 'components/marketing/pricing/enterprise-section.tsx'),
      'utf-8',
    )
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(notes).not.toMatch(/available to every plan/i)
  })
})

describe('FAQ', () => {
  it('answers from the catalog rather than hardcoded numbers', () => {
    render(<PricingFaq />)
    expect(
      screen.getByRole('button', { name: new RegExp(`${LIMITS.free.resumes} free résumés`) }),
    ).toBeInTheDocument()
  })

  it('is operable and announces its state', () => {
    render(<PricingFaq />)
    const first = screen.getAllByRole('button')[0]
    expect(first).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'false')
  })

  it('keeps the grandfathering promise on the page', () => {
    // Existing customers reading a new pricing page need this answered before
    // they have to ask.
    render(<PricingFaq />)
    expect(screen.getByRole('button', { name: /already use HireLens/ })).toBeInTheDocument()
  })
})

describe('no stale prices survive anywhere in marketing', () => {
  /**
   * Comments are stripped before matching. A component's prose may describe
   * the tiers it replaced — that history is worth keeping and is exactly what
   * stops someone reinstating them — but no such string may survive in code
   * where it could reach a customer.
   */
  const code = (file: string) =>
    readFileSync(resolve(process.cwd(), 'components/marketing', file), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

  it('the retired Team / Business tiers are gone', () => {
    expect(code('frame-05-conclusion.tsx')).not.toMatch(/\$499|\$999|'Team'|'Business'/)
  })

  it('no marketing component hardcodes a price', () => {
    // Every figure must come from `lib/pricing`, or the homepage and /pricing
    // will drift the moment one is edited.
    for (const file of ['frame-05-conclusion.tsx', 'pricing/plan-cards.tsx']) {
      expect(code(file), `${file} hardcodes a currency amount`).not.toMatch(/[₹$]\s?\d/)
    }
  })

  it('both surfaces read their prices from the same module', () => {
    for (const file of ['frame-05-conclusion.tsx', 'pricing/plan-cards.tsx']) {
      expect(code(file), `${file} does not import lib/pricing`).toMatch(/from '@\/lib\/pricing'/)
    }
  })
})

describe('currency preference', () => {
  function Probe() {
    const [currency, choose] = useCurrencyPreference()
    return (
      <div>
        <span data-testid="currency">{currency}</span>
        <button type="button" onClick={() => choose('USD')}>
          pick US
        </button>
      </div>
    )
  }

  const setTimezone = (timeZone: string) => {
    const real = Intl.DateTimeFormat
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      () => ({ resolvedOptions: () => ({ timeZone }) }) as unknown as Intl.DateTimeFormat,
    )
    return () => {
      Intl.DateTimeFormat = real
    }
  }

  beforeEach(() => {
    window.localStorage.clear()
    __resetCurrencyPreference()
    vi.restoreAllMocks()
  })

  it('guesses INR from an Indian timezone', () => {
    const restore = setTimezone('Asia/Kolkata')
    render(<Probe />)
    expect(screen.getByTestId('currency')).toHaveTextContent('INR')
    restore()
  })

  it('guesses USD from a US timezone', () => {
    const restore = setTimezone('America/New_York')
    render(<Probe />)
    expect(screen.getByTestId('currency')).toHaveTextContent('USD')
    restore()
  })

  it('lets an explicit choice beat the guess, and remembers it', () => {
    // A US buyer working from Bangalore must be able to reach the price they
    // will actually be charged — and not have to re-pick it every visit.
    const restore = setTimezone('Asia/Kolkata')
    render(<Probe />)
    fireEvent.click(screen.getByRole('button', { name: 'pick US' }))
    expect(screen.getByTestId('currency')).toHaveTextContent('USD')
    expect(window.localStorage.getItem('hl-pricing-currency')).toBe('USD')

    cleanup()
    __resetCurrencyPreference()
    render(<Probe />)
    expect(screen.getByTestId('currency')).toHaveTextContent('USD')
    restore()
  })

  it('ignores a stored currency we no longer quote', () => {
    window.localStorage.setItem('hl-pricing-currency', 'GBP')
    const restore = setTimezone('Asia/Kolkata')
    render(<Probe />)
    expect(screen.getByTestId('currency')).toHaveTextContent('INR')
    restore()
  })

  it('uses language when the timezone is not one we recognise', () => {
    // Berlin is neither market, but an en-US browser still tells us something.
    const restore = setTimezone('Europe/Berlin')
    render(<Probe />)
    expect(screen.getByTestId('currency')).toHaveTextContent('USD')
    restore()
  })

  it('falls back to the default when the browser says nothing useful', () => {
    const restore = setTimezone('Europe/Berlin')
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE')
    render(<Probe />)
    expect(screen.getByTestId('currency')).toHaveTextContent(DEFAULT_CURRENCY)
    restore()
  })
})

describe('billing period schema', () => {
  it('carries both cadences for every plan in every currency', () => {
    // Schema only — adding yearly later must be a data change, not a refactor.
    for (const currency of availableCurrencies()) {
      for (const plan of PLAN_KEYS) {
        const entry = PRICING[currency.code][plan]
        expect(Object.keys(entry).sort(), `${currency.code}/${plan}`).toEqual([
          'monthly',
          'yearly',
        ])
      }
    }
  })

  it('does not expose yearly billing yet', () => {
    expect(YEARLY_BILLING_ENABLED).toBe(false)
    expect(availableBillingPeriods()).toEqual(['monthly'])
  })

  it('leaves yearly unpriced rather than inventing a multiple', () => {
    // "monthly × 12" is not an annual plan — the discount IS the product
    // decision, and a number nobody agreed to must not reach a customer.
    for (const currency of availableCurrencies()) {
      for (const plan of ['plus', 'pro'] as const) {
        expect(
          PRICING[currency.code][plan].yearly,
          `${currency.code}/${plan} yearly was filled in without a decision`,
        ).toBeNull()
      }
    }
  })

  it('formats an unpriced cadence as Custom, never as a number', () => {
    expect(formatPrice('pro', 'INR', 'yearly')).toBe('Custom')
    expect(priceSuffix('pro', 'INR', 'yearly')).toBe('')
  })

  it('defaults every reader to the cadence the backend actually bills', () => {
    expect(priceOf('pro', 'INR')).toBe(PRICING.INR.pro.monthly)
    expect(priceSuffix('pro', 'INR')).toBe('/month')
  })

  it('no UI surface offers a yearly option', () => {
    for (const file of [
      'components/marketing/pricing/pricing-screen.tsx',
      'components/marketing/pricing/plan-cards.tsx',
      'components/marketing/frame-05-conclusion.tsx',
    ]) {
      // Comments stripped, matching the "no stale prices" block above and for
      // the same reason: this asserts what a CUSTOMER can be offered, and the
      // prose in these files deliberately records what was removed and why.
      // Without stripping, a comment noting that a bias audit is required
      // annually reads as a yearly billing option.
      const source = readFileSync(resolve(process.cwd(), file), 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      expect(source, `${file} references yearly billing`).not.toMatch(/yearly|annual/i)
    }
  })
})
