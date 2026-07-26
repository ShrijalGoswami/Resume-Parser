// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { SceneLimits } from '../components/homepage/scenes/scene-06-limits'

afterEach(cleanup)

/**
 * Scene 06 — What we don't know. Frozen: DDL-MKT-004.
 *
 * The heaviest test obligations on the page so far. Three of these assertions
 * guard claim boundaries (Gate 3) and four guard the neutrality of absence
 * (§8.15) — the property most likely to be "improved" into a warning during
 * future work, and the one whose loss would invert the scene's meaning.
 */
describe('Scene 06 — What we don’t know', () => {
  describe('exhibit — the named gap', () => {
    it('renders all four dimensions', () => {
      render(<SceneLimits />)
      for (const dimension of [
        'Systems design',
        'Written communication',
        'Mentoring',
        'Incident response',
      ]) {
        expect(screen.getByRole('rowheader', { name: dimension })).toBeInTheDocument()
      }
    })

    it('pairs each dimension with its own evidence and source count', () => {
      render(<SceneLimits />)
      const row = screen.getByRole('rowheader', { name: 'Incident response' }).closest('tr')
      expect(row).not.toBeNull()
      expect(within(row as HTMLElement).getByText('Nothing on file')).toBeInTheDocument()
      expect(within(row as HTMLElement).getByText('No sources')).toBeInTheDocument()
    })

    it('renders the absent row at identical weight and colour to the others', () => {
      // §8.15 / A-07: absence is ordinary information. The row must not be
      // dimmed, italicised, greyed further, or given a warning treatment.
      render(<SceneLimits />)
      const absent = screen
        .getByRole('rowheader', { name: 'Incident response' })
        .closest('tr') as HTMLElement
      const present = screen
        .getByRole('rowheader', { name: 'Systems design' })
        .closest('tr') as HTMLElement

      const classesOf = (row: HTMLElement) =>
        Array.from(row.querySelectorAll('th,td')).map((c) => c.className)

      expect(classesOf(absent)).toEqual(classesOf(present))
    })

    it('gives the absent row no special styling of any kind', () => {
      render(<SceneLimits />)
      const row = screen
        .getByRole('rowheader', { name: 'Incident response' })
        .closest('tr') as HTMLElement
      expect(row.className).not.toMatch(/italic|opacity|dashed|line-through|muted/)
      expect(row.querySelector('svg')).toBeNull()
    })

    it('never uses monospace for status words', () => {
      // DDL-VIS-003 — mono means "machine identifier". "Inferred" and
      // "No sources" are status words, not identifiers. The exploration render
      // had this defect; it was recorded for correction here.
      const { container } = render(<SceneLimits />)
      expect(container.querySelector('.font-hp-mono')).toBeNull()
      expect(container.innerHTML).not.toContain('font-hp-mono')
    })
  })

  describe('commitments — Gate 3 claim boundaries', () => {
    it('states that we do not decide who to hire', () => {
      render(<SceneLimits />)
      expect(screen.getByText('We do not decide who to hire.')).toBeInTheDocument()
    })

    it('states that we do not predict job performance', () => {
      render(<SceneLimits />)
      expect(
        screen.getByText('We do not predict how someone will perform in the job.')
      ).toBeInTheDocument()
    })

    it('states that we do not assess protected characteristics', () => {
      render(<SceneLimits />)
      expect(
        screen.getByText(
          'We do not assess age, gender, ethnicity or any protected characteristic.'
        )
      ).toBeInTheDocument()
    })

    it('ties the protected-characteristic boundary to the photography decision', () => {
      // DDL-VIS-007 — the boundary is stated with its operational consequence.
      render(<SceneLimits />)
      expect(screen.getByText(/photograph never appears beside one/)).toBeInTheDocument()
    })

    it('pairs every limit with a consequence — eight rows, sixteen cells', () => {
      // The pairing is what converts caveats into commitments. A limit without
      // its consequence is an apology.
      const { container } = render(<SceneLimits />)
      const bodies = container.querySelectorAll('tbody')
      // 1 exhibit tbody + 2 commitment tbodies
      expect(bodies).toHaveLength(3)

      const commitmentRows = Array.from(container.querySelectorAll('tbody')).slice(1)
      const dataRows = commitmentRows.flatMap((b) =>
        Array.from(b.querySelectorAll('tr')).filter((r) => r.querySelectorAll('td').length === 2)
      )
      expect(dataRows).toHaveLength(8)
    })
  })

  describe('the two groups are peers, not a hierarchy', () => {
    it('renders both group labels', () => {
      render(<SceneLimits />)
      expect(screen.getByText('What we refuse to do')).toBeInTheDocument()
      expect(screen.getByText('What we cannot know')).toBeInTheDocument()
    })

    it('styles both group labels identically', () => {
      // A choice and a ceiling are different in kind, not in rank. Rendering
      // one as subordinate collapses the distinction the scene exists to make.
      render(<SceneLimits />)
      const refuse = screen.getByText('What we refuse to do')
      const cannot = screen.getByText('What we cannot know')
      expect(refuse.className).toBe(cannot.className)
      expect(refuse.tagName).toBe(cannot.tagName)
    })

    it('groups rows semantically for assistive technology', () => {
      render(<SceneLimits />)
      const groupHeaders = screen
        .getAllByRole('rowheader')
        .filter((h) => h.getAttribute('scope') === 'rowgroup')
      expect(groupHeaders).toHaveLength(2)
    })

    it('has exactly three refusals and five limitations', () => {
      const { container } = render(<SceneLimits />)
      const [, refuseBody, cannotBody] = Array.from(container.querySelectorAll('tbody'))
      const dataRows = (b: Element) =>
        Array.from(b.querySelectorAll('tr')).filter((r) => r.querySelectorAll('td').length === 2)
      expect(dataRows(refuseBody)).toHaveLength(3)
      expect(dataRows(cannotBody)).toHaveLength(5)
    })
  })

  describe('closing statement', () => {
    it('renders the frozen closing line', () => {
      render(<SceneLimits />)
      expect(
        screen.getByText(
          'None of these are things we intend to fix. They are the shape of honest work.'
        )
      ).toBeInTheDocument()
    })
  })

  describe('deliberate absences', () => {
    it('renders no icons, images or decorative marks', () => {
      const { container } = render(<SceneLimits />)
      expect(container.querySelector('svg')).toBeNull()
      expect(container.querySelector('img')).toBeNull()
    })

    it('is entirely static — no interactive elements', () => {
      const { container } = render(<SceneLimits />)
      expect(container.querySelector('a')).toBeNull()
      expect(container.querySelector('button')).toBeNull()
      expect(container.querySelector('input')).toBeNull()
    })
  })

  describe('accessibility', () => {
    it('exposes the scene heading in the outline', () => {
      render(<SceneLimits />)
      expect(
        screen.getByRole('heading', { name: 'What we don’t know', level: 2 })
      ).toBeInTheDocument()
    })

    it('associates the section with its heading', () => {
      const { container } = render(<SceneLimits />)
      expect(container.querySelector('section[data-scene="06"]')).toHaveAttribute(
        'aria-labelledby',
        'scene-06-heading'
      )
    })

    it('gives both tables real semantics and captions', () => {
      render(<SceneLimits />)
      const tables = screen.getAllByRole('table')
      expect(tables).toHaveLength(2)
      expect(
        screen.getByText('Evidence held against four assessed dimensions')
      ).toBeInTheDocument()
      expect(screen.getByText('Every limit, and what we do about it', { selector: 'caption' })).toBeInTheDocument()
    })

    it('labels the commitment columns', () => {
      render(<SceneLimits />)
      expect(screen.getByRole('columnheader', { name: 'The limit' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'What we do' })).toBeInTheDocument()
    })
  })

  describe('governance — register and container', () => {
    it('declares the working density register', () => {
      const { container } = render(<SceneLimits />)
      expect(container.querySelector('section[data-scene="06"]')).toHaveAttribute(
        'data-density',
        'working'
      )
    })

    it('uses the narrow container', () => {
      const { container } = render(<SceneLimits />)
      expect(container.querySelector('[data-container="narrow"]')).not.toBeNull()
    })

    it('attaches the closing line to the commitments, not as a fourth part', () => {
      // Register law: the gap before the closing statement is Inter, not
      // Section. A section-sized gap left it reading as an appendix — the
      // defect recorded against the exploration render.
      const { container } = render(<SceneLimits />)
      const closing = screen
        .getByText('None of these are things we intend to fix. They are the shape of honest work.')
        .closest('div') as HTMLElement
      expect(closing.className).toContain('mt-hp-inter-5')
      expect(closing.className).not.toMatch(/mt-hp-section/)
    })
  })
})
