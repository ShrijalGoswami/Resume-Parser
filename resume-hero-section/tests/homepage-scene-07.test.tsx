// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { SceneRecord } from '../components/homepage/scenes/scene-07-record'

afterEach(cleanup)

/**
 * Scene 07 — The record. Frozen: DDL-MKT-006. Gate 2 applies.
 *
 * The central obligation here is structural rather than cosmetic. The
 * exploration's first render emitted the register as two independent columns;
 * a wrapped value desynchronised label from value, and `Not known at the time`
 * displayed the value belonging to `Known at the time` — a §8.15 statement
 * rendered as its own opposite.
 *
 * Every row is therefore asserted as a PAIR. These tests would have caught
 * that defect, which is the standard they are written to.
 */
describe('Scene 07 — The record', () => {
  const RECORD: ReadonlyArray<[string, string]> = [
    ['Decision', 'Proceed to offer'],
    ['Role', 'Staff engineer, infrastructure'],
    ['Candidate', 'E. Vance'],
    ['Recorded', '13 October 2026'],
    ['Recorded by', 'Hiring manager, with the panel'],
    ['Bar applied', 'Staff level, infrastructure. Set by the hiring manager on 28 September.'],
    ['Reasoning 1', 'Met the bar on systems design. Three passages across two documents.'],
    [
      'Reasoning 2',
      'Met the bar on written communication. Four passages across three documents.',
    ],
    ['Reasoning 3', 'The panel diverged on system design. Reviewed in the debrief and resolved.'],
    ['Evidence references', 'Take-home, interview transcript, screening notes, resume.'],
    ['Known at the time', 'Systems design, written communication, mentoring.'],
    [
      'Not known at the time',
      'Incident response. No sources on file. The panel accepted this and recorded it.',
    ],
    ['Record status', 'Closed. Not editable.'],
  ]

  describe('label/value pairing — the recorded failure mode', () => {
    it.each(RECORD)('pairs "%s" with its own value in one row', (label, value) => {
      render(<SceneRecord />)
      const header = screen.getByRole('rowheader', { name: label })
      const row = header.closest('tr')
      expect(row).not.toBeNull()
      expect(within(row as HTMLElement).getByText(value)).toBeInTheDocument()
    })

    it('renders exactly thirteen rows, each with exactly one label and one value', () => {
      const { container } = render(<SceneRecord />)
      const rows = container.querySelectorAll('tbody tr')
      expect(rows).toHaveLength(13)
      rows.forEach((row) => {
        expect(row.querySelectorAll('th')).toHaveLength(1)
        expect(row.querySelectorAll('td')).toHaveLength(1)
      })
    })

    it('leaves no value cell empty', () => {
      // An empty cell is the visible symptom of a desynchronised register.
      const { container } = render(<SceneRecord />)
      container.querySelectorAll('tbody td').forEach((cell) => {
        expect(cell.textContent?.trim()).toBeTruthy()
      })
    })

    it('leaves no value without a label', () => {
      const { container } = render(<SceneRecord />)
      container.querySelectorAll('tbody th').forEach((cell) => {
        expect(cell.textContent?.trim()).toBeTruthy()
      })
    })
  })

  describe('reverted copy — DDL-MKT-006 condition 2', () => {
    it('restores the full "Bar applied" wording', () => {
      // Shortened to "Set on 28 September." only to stop wrapping. The wrapping
      // constraint does not exist in a real table, so the approved wording is
      // restored rather than the artifact being confirmed.
      render(<SceneRecord />)
      expect(screen.getByText(/Set by the hiring manager on 28 September\./)).toBeInTheDocument()
    })

    it('restores "across two documents" / "across three documents"', () => {
      render(<SceneRecord />)
      expect(screen.getByText(/Three passages across two documents\./)).toBeInTheDocument()
      expect(screen.getByText(/Four passages across three documents\./)).toBeInTheDocument()
    })

    it('restores the full "Not known at the time" wording', () => {
      render(<SceneRecord />)
      expect(
        screen.getByText(/The panel accepted this and recorded it\./)
      ).toBeInTheDocument()
    })
  })

  describe('governance — Gate 2 surface', () => {
    it('renders the absent-evidence row as an ordinary row', () => {
      // §8.15 / A-07: absence is ordinary information, never an error state.
      render(<SceneRecord />)
      const absent = screen
        .getByRole('rowheader', { name: 'Not known at the time' })
        .closest('tr') as HTMLElement
      const present = screen
        .getByRole('rowheader', { name: 'Known at the time' })
        .closest('tr') as HTMLElement

      const classesOf = (row: HTMLElement) =>
        Array.from(row.querySelectorAll('th,td')).map((c) => c.className)
      expect(classesOf(absent)).toEqual(classesOf(present))
      expect(absent.className).not.toMatch(/italic|opacity|dashed|line-through|muted/)
    })

    it('carries record permanence as a field, not as prose', () => {
      render(<SceneRecord />)
      const row = screen
        .getByRole('rowheader', { name: 'Record status' })
        .closest('tr') as HTMLElement
      expect(within(row).getByText('Closed. Not editable.')).toBeInTheDocument()
    })

    it('states the reasoning, not merely a score', () => {
      // The scene's claim is that the output is a defensible decision rather
      // than a number. Three reasoning rows carry that; a score would not.
      render(<SceneRecord />)
      for (const n of ['Reasoning 1', 'Reasoning 2', 'Reasoning 3']) {
        expect(screen.getByRole('rowheader', { name: n })).toBeInTheDocument()
      }
    })

    it('shows no numeric score, percentage or rating', () => {
      // Checklist §8.10 — never a percentage unless calibrated. Nothing here
      // presents an assessment as a number.
      const { container } = render(<SceneRecord />)
      const text = container.textContent ?? ''
      expect(text).not.toMatch(/\d+\s?%/)
      expect(text).not.toMatch(/\b\d\/5\b|\bout of 10\b|★/)
    })

    it('renders the retrieval question in the recruiter’s voice', () => {
      render(<SceneRecord />)
      expect(
        screen.getByText('April. Someone asks: why did we choose Vance over the other three?')
      ).toBeInTheDocument()
    })

    it('renders the closing statement', () => {
      render(<SceneRecord />)
      expect(
        screen.getByText('Nothing was reconstructed. The record was already written.')
      ).toBeInTheDocument()
    })

    it('does not duplicate the register', () => {
      // The rejected direction showed October and April registers side by side.
      // One register, one retrieval, one conclusion.
      const { container } = render(<SceneRecord />)
      expect(container.querySelectorAll('table')).toHaveLength(1)
    })
  })

  describe('actions', () => {
    it('offers exactly one secondary link and no primary action', () => {
      render(<SceneRecord />)
      const links = screen.getAllByRole('link')
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveTextContent('Read a full decision record')
      // The page's single primary action lives in Scene 09.
      expect(links[0].getAttribute('data-action')).not.toBe('primary')
    })
  })

  describe('deliberate absences', () => {
    it('renders no icons or images', () => {
      const { container } = render(<SceneRecord />)
      expect(container.querySelector('svg')).toBeNull()
      expect(container.querySelector('img')).toBeNull()
    })

    it('uses no monospace', () => {
      // Dates and identifiers here are prose values in a record, not machine
      // identifiers being transcribed (DDL-VIS-003).
      const { container } = render(<SceneRecord />)
      expect(container.innerHTML).not.toContain('font-hp-mono')
    })
  })

  describe('accessibility', () => {
    it('exposes the scene heading in the outline', () => {
      render(<SceneRecord />)
      expect(screen.getByRole('heading', { name: 'The record', level: 2 })).toBeInTheDocument()
    })

    it('associates the section with its heading', () => {
      const { container } = render(<SceneRecord />)
      expect(container.querySelector('section[data-scene="07"]')).toHaveAttribute(
        'aria-labelledby',
        'scene-07-heading'
      )
    })

    it('gives the register real table semantics with row headers and a caption', () => {
      render(<SceneRecord />)
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('rowheader')).toHaveLength(13)
      expect(
        screen.getByText('Decision record for E. Vance, recorded 13 October 2026')
      ).toBeInTheDocument()
    })
  })

  describe('governance — register and container', () => {
    it('declares the working density register', () => {
      const { container } = render(<SceneRecord />)
      expect(container.querySelector('section[data-scene="07"]')).toHaveAttribute(
        'data-density',
        'working'
      )
    })

    it('uses the narrow container', () => {
      const { container } = render(<SceneRecord />)
      expect(container.querySelector('[data-container="narrow"]')).not.toBeNull()
    })
  })
})
