// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import SignupPage from '../app/(marketing-v2)/signup/page'

afterEach(cleanup)

/**
 * /signup — the destination for the homepage's single primary action.
 *
 * The tests that matter here are ABSENCE tests. The failure mode for this page
 * is not that it looks wrong; it is that it quietly grows an auth form, a
 * discarded email field, or a paragraph of marketing copy nobody approved.
 * Each of those is cheap to add and expensive to notice.
 */
describe('/signup', () => {
  const renderPage = () => render(<SignupPage />)

  describe('the handoff', () => {
    it('sends the reader to the real authentication flow', () => {
      renderPage()
      expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
        'href',
        '/auth/signup'
      )
    })

    it('offers the existing-account path', () => {
      renderPage()
      expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/auth/login')
    })
  })

  describe('isolation from authentication', () => {
    /**
     * The page must own no credential capture. A marketing surface that
     * collects a password — or collects an email it cannot pass on — has taken
     * responsibility for something it cannot test and cannot honour.
     */
    it('collects nothing', () => {
      const { container } = renderPage()
      expect(container.querySelector('form')).toBeNull()
      expect(container.querySelector('input')).toBeNull()
      expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('has no submit control', () => {
      renderPage()
      expect(screen.queryByRole('button')).toBeNull()
    })
  })

  describe('copy — approved positioning only', () => {
    it('states the approved value proposition verbatim', () => {
      renderPage()
      expect(
        screen.getByText(
          'HireLens turns scattered hiring evidence into a decision you can defend.'
        )
      ).toBeInTheDocument()
    })

    /**
     * Gate 3. The claim boundaries carried by Scene 06 do not weaken as the
     * reader gets closer to converting — that is precisely where softening them
     * would be most tempting and most dishonest.
     */
    it('carries the claim boundaries through to the last surface', () => {
      renderPage()
      expect(screen.getByText(/does not decide who to hire/)).toBeInTheDocument()
      expect(screen.getByText(/does not predict how someone will perform/)).toBeInTheDocument()
      expect(screen.getByText(/does not assess age, gender, ethnicity/)).toBeInTheDocument()
    })

    it('makes no claim the product has not been approved to make', () => {
      const { container } = renderPage()
      const text = container.textContent ?? ''
      for (const forbidden of [
        'free trial',
        'no credit card',
        'trusted by',
        'AI-powered',
        'best-in-class',
        'instantly',
        'automatically screen',
      ]) {
        expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase())
      }
    })
  })

  describe('design system', () => {
    it('reuses the C-01 primary action rather than a lookalike', () => {
      renderPage()
      const action = screen.getByRole('link', { name: 'Create an account' })
      expect(action.className).toContain('bg-hp-action')
      expect(action.className).toContain('rounded-hp-control')
    })

    it('introduces no quarantined legacy tokens', () => {
      const { container } = renderPage()
      const markup = container.innerHTML
      expect(markup).not.toMatch(/\bmkt-/)
      expect(markup).not.toMatch(/\bhl-/)
      expect(markup).not.toMatch(/violet|indigo|iris/i)
    })

    it('exposes an accessible heading', () => {
      renderPage()
      expect(
        screen.getByRole('heading', { name: 'See it on your own roles', level: 2 })
      ).toBeInTheDocument()
    })
  })
})
