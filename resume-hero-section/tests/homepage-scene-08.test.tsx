// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { SceneRoom } from '../components/homepage/scenes/scene-08-room'

afterEach(cleanup)

/**
 * Scene 08 — The room. Frozen structure and copy: DDL-MKT-007.
 *
 * This is the only organisational-trust content on the homepage. Its test
 * obligations are unusual: most of them assert the ABSENCE of things, because
 * the decisions here are refusals. A badge added in six months would look like
 * an improvement and would be a governance breach.
 */
describe('Scene 08 — The room', () => {
  describe('frozen copy — Gate 3', () => {
    it('renders the lead line', () => {
      render(<SceneRoom />)
      expect(screen.getByText('Before you bring it in.')).toBeInTheDocument()
    })

    it('renders all four commitment headings', () => {
      render(<SceneRoom />)
      for (const heading of [
        'Your data',
        'What the system may decide',
        'What is auditable',
        'Where a person is required',
      ]) {
        expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
      }
    })

    it('states that the system decides nothing', () => {
      // Bible Ch. 2 differentiator 4 — the human decides. This is a claim
      // boundary, not a feature description.
      render(<SceneRoom />)
      expect(screen.getByText(/^Nothing\. It reads, it assesses against the bar you set/)).toBeInTheDocument()
    })

    it('states that documents are never used to train a model', () => {
      render(<SceneRoom />)
      expect(screen.getByText(/never used to train a model/)).toBeInTheDocument()
    })

    it('states where a person is required', () => {
      render(<SceneRoom />)
      expect(screen.getByText(/The system will not proceed on its own\./)).toBeInTheDocument()
    })
  })

  describe('specifics — concrete values, no adjectives (§9.3)', () => {
    const rows: ReadonlyArray<[string, string]> = [
      ['Data residency', 'Your selected region. Not moved.'],
      ['Retention', 'Set per workspace. Default 24 months.'],
      ['Model training', 'Your documents are never used to train models.'],
      ['Access', 'Role based. Every read is logged.'],
      ['Export', 'Full decision records, machine readable, any time.'],
    ]

    it.each(rows)('pairs "%s" with its own value in one row', (label, value) => {
      // Paired table rows, never two independent columns. A wrapped value
      // desynchronising label from value inverted a governance statement in
      // Scene 07's first render — recorded failure mode, cheap to prevent.
      render(<SceneRoom />)
      const header = screen.getByRole('rowheader', { name: label })
      const row = header.closest('tr')
      expect(row).not.toBeNull()
      expect(within(row as HTMLElement).getByText(value)).toBeInTheDocument()
    })

    it('renders exactly five specifics', () => {
      const { container } = render(<SceneRoom />)
      expect(container.querySelectorAll('tbody tr')).toHaveLength(5)
    })

    it('uses no vague trust adjectives', () => {
      const { container } = render(<SceneRoom />)
      const text = (container.textContent ?? '').toLowerCase()
      for (const banned of [
        'enterprise-grade',
        'bank-level',
        'military-grade',
        'world-class',
        'best-in-class',
        'industry-leading',
        'robust',
        'seamless',
      ]) {
        expect(text).not.toContain(banned)
      }
    })
  })

  describe('deliberate absences — the decisions are refusals', () => {
    it('renders no images, logos, badges or seals', () => {
      const { container } = render(<SceneRoom />)
      expect(container.querySelector('img')).toBeNull()
      expect(container.querySelector('svg')).toBeNull()
      expect(container.querySelector('picture')).toBeNull()
    })

    it('renders no customer wordmarks or social proof', () => {
      const { container } = render(<SceneRoom />)
      const text = (container.textContent ?? '').toLowerCase()
      for (const banned of ['trusted by', 'used by', 'customers', 'soc 2', 'iso 27001', 'gdpr-compliant']) {
        expect(text).not.toContain(banned)
      }
    })

    it('is entirely static — no interactive elements', () => {
      const { container } = render(<SceneRoom />)
      expect(container.querySelector('a')).toBeNull()
      expect(container.querySelector('button')).toBeNull()
      expect(container.querySelector('input')).toBeNull()
    })
  })

  describe('accessibility', () => {
    it('exposes the scene heading in the outline', () => {
      render(<SceneRoom />)
      expect(screen.getByRole('heading', { name: 'The room', level: 2 })).toBeInTheDocument()
    })

    it('nests commitment headings one level below the scene heading', () => {
      render(<SceneRoom />)
      expect(screen.getByRole('heading', { name: 'Your data', level: 3 })).toBeInTheDocument()
    })

    it('associates the section with its heading', () => {
      const { container } = render(<SceneRoom />)
      expect(container.querySelector('section[data-scene="08"]')).toHaveAttribute(
        'aria-labelledby',
        'scene-08-heading'
      )
    })

    it('gives the specifics table real semantics and a caption', () => {
      render(<SceneRoom />)
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      expect(
        within(table).getByText('How HireLens handles your data, access and export')
      ).toBeInTheDocument()
      // Row headers, not plain cells — so a screen reader announces the label
      // with each value rather than reading a wall of ungrouped text.
      expect(screen.getAllByRole('rowheader')).toHaveLength(5)
    })
  })

  describe('governance — register and containers', () => {
    it('declares the working density register', () => {
      const { container } = render(<SceneRoom />)
      expect(container.querySelector('section[data-scene="08"]')).toHaveAttribute(
        'data-density',
        'working'
      )
    })

    it('uses the narrow container', () => {
      const { container } = render(<SceneRoom />)
      expect(container.querySelector('[data-container="narrow"]')).not.toBeNull()
    })
  })
})
