// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { MarketingNav } from '../components/marketing/marketing-nav'

/**
 * The public navigation, on a phone.
 *
 * Below 768px this bar used to render exactly one control: an "Access" button
 * routing to /auth/signup. The links and the Sign in action were both
 * `hidden md:flex`, on the reasoning that the Stitch frames never specced an
 * open mobile menu.
 *
 * The frames were desktop comps. Their silence was not a decision to have no
 * mobile navigation, and the effect was that Pricing, Customers and Security
 * were unreachable — and an EXISTING CUSTOMER had no way to sign in at all,
 * because the only affordance on screen sent them to signup. Recruiters work
 * from phones between interviews; this is not an edge case.
 *
 * jsdom has no viewport, so the responsive classes cannot be exercised here.
 * What is asserted instead is that the mobile panel EXISTS, opens, and contains
 * the destinations the desktop bar has — which is the part that was missing.
 */

beforeEach(cleanup)

const toggle = () => screen.getByRole('button', { name: /open menu|close menu/i })

describe('mobile menu', () => {
  it('has a disclosure control', () => {
    render(<MarketingNav />)
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('is closed until asked for', () => {
    // Asserted on the PANEL, not on a link. The desktop bar's own links stay in
    // the document at every width and are hidden with `hidden md:flex`, so
    // querying for "Sign in" globally finds the desktop one and proves nothing
    // about the mobile panel either way.
    render(<MarketingNav />)
    expect(
      screen.getByRole('navigation').querySelector('#mkt-mobile-menu'),
    ).not.toBeInTheDocument()
  })

  it('opens and closes', () => {
    render(<MarketingNav />)
    fireEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle())
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('lets an existing customer sign in', () => {
    // The specific regression: the old bar offered signup and nothing else, so
    // a customer with an account had no route into the product from a phone.
    render(<MarketingNav />)
    fireEvent.click(toggle())
    const panel = screen.getByRole('navigation').querySelector('#mkt-mobile-menu')!
    expect(within(panel as HTMLElement).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/auth/login',
    )
  })

  it('carries every destination the desktop bar has', () => {
    render(<MarketingNav />)
    fireEvent.click(toggle())
    const panel = screen.getByRole('navigation').querySelector('#mkt-mobile-menu') as HTMLElement
    for (const [label, href] of [
      ['Product', '/#product'],
      ['Pricing', '/pricing'],
      ['Customers', '/#customers'],
      ['Security', '/#security'],
    ] as const) {
      expect(within(panel).getByRole('link', { name: label }), label).toHaveAttribute('href', href)
    }
  })

  it('closes when a destination is chosen', () => {
    // Otherwise the panel stays over the page it just navigated to.
    render(<MarketingNav />)
    fireEvent.click(toggle())
    const panel = screen.getByRole('navigation').querySelector('#mkt-mobile-menu') as HTMLElement
    fireEvent.click(within(panel).getByRole('link', { name: 'Pricing' }))
    expect(toggle()).toHaveAttribute('aria-expanded', 'false')
  })

  it('associates the control with the panel it controls', () => {
    render(<MarketingNav />)
    expect(toggle()).toHaveAttribute('aria-controls', 'mkt-mobile-menu')
  })
})
