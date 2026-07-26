// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import {
  SceneClose,
  SCENE_01_OPENING_SENTENCE,
} from '../components/homepage/scenes/scene-09-close'

afterEach(cleanup)

/**
 * Scene 09 — The close. Frozen structure and copy: DDL-MKT-007.
 *
 * These tests guard the things most likely to be "improved" during future work.
 * Copy here is Gate 3 (Checklist §10.7): it carries claim boundaries, so a
 * failing assertion means governance was breached, not that a string drifted.
 */
describe('Scene 09 — The close', () => {
  const renderScene = () => render(<SceneClose actionHref="/somewhere" />)

  describe('frozen copy — Gate 3', () => {
    it('renders the three closing paragraphs verbatim', () => {
      renderScene()
      expect(
        screen.getByText(
          'You will still have four finalists, two conflicting interview reports, and a hiring manager who wants an answer today.'
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'That does not change. Hiring is a judgement made under pressure with incomplete information, and no software will make it otherwise.'
        )
      ).toBeInTheDocument()
      expect(
        screen.getByText('What changes is that you will be able to say why.')
      ).toBeInTheDocument()
    })

    it('keeps the voluntary constraint intact', () => {
      // "no software will make it otherwise" is the costliest sentence on the
      // page and the most likely to be softened as underselling. It is the one
      // carrying the most trust (Bible Ch. 14).
      renderScene()
      expect(screen.getByText(/no software will make it otherwise/)).toBeInTheDocument()
    })

    it('labels the action by what happens, not by what we want', () => {
      renderScene()
      // Never "Get started" / "Book a demo" as the primary (Bible Ch. 4, Mvt V).
      expect(screen.getByRole('link', { name: 'See it on your own roles' })).toBeInTheDocument()
    })
  })

  describe('cross-scene dependency', () => {
    it('paragraph one is the exported Scene 01 opening sentence', () => {
      // Scene 01 is still in design. When its copy is approved this constant
      // must be updated in lockstep, or the loop closure breaks silently.
      renderScene()
      expect(screen.getByText(SCENE_01_OPENING_SENTENCE)).toBeInTheDocument()
    })
  })

  describe('structure — one action, nothing else', () => {
    it('renders exactly one link and no secondary action', () => {
      renderScene()
      expect(screen.getAllByRole('link')).toHaveLength(1)
    })

    it('has no form controls — no newsletter field, no urgency capture', () => {
      const { container } = renderScene()
      expect(container.querySelector('input')).toBeNull()
      expect(container.querySelector('form')).toBeNull()
      expect(container.querySelector('button')).toBeNull()
    })

    it('passes the destination through to the action', () => {
      renderScene()
      expect(screen.getByRole('link', { name: 'See it on your own roles' })).toHaveAttribute(
        'href',
        '/somewhere'
      )
    })

    it('carries no urgency, scarcity or countdown language', () => {
      const { container } = renderScene()
      const text = container.textContent ?? ''
      for (const banned of [
        'limited',
        'hurry',
        'today only',
        'expires',
        'spots left',
        'don’t miss',
      ]) {
        expect(text.toLowerCase()).not.toContain(banned)
      }
    })
  })

  describe('accessibility', () => {
    it('exposes an accessible scene heading in the outline', () => {
      renderScene()
      expect(screen.getByRole('heading', { name: 'The close' })).toBeInTheDocument()
    })

    it('associates the section with its heading', () => {
      const { container } = renderScene()
      const section = container.querySelector('section[data-scene="09"]')
      expect(section).toHaveAttribute('aria-labelledby', 'scene-09-heading')
    })

    it('the action is a real link, reachable by keyboard', () => {
      renderScene()
      const action = screen.getByRole('link', { name: 'See it on your own roles' })
      expect(action.tagName).toBe('A')
      expect(action).not.toHaveAttribute('tabindex', '-1')
    })
  })

  describe('governance — density and register', () => {
    it('declares the sparse density register', () => {
      const { container } = renderScene()
      // Movement V is an exhale; the closing band must not be dense.
      expect(container.querySelector('section[data-scene="09"]')).toHaveAttribute(
        'data-density',
        'sparse'
      )
    })

    it('renders closing paragraphs at reading size, not display type', () => {
      const { container } = renderScene()
      const paragraphs = container.querySelectorAll('p')
      expect(paragraphs).toHaveLength(3)
      paragraphs.forEach((p) => {
        expect(p.className).toContain('text-hp-read-sm')
        expect(p.className).not.toMatch(/text-hp-display/)
      })
    })
  })
})
