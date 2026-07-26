// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { SceneTrail } from '../components/homepage/scenes/scene-05-trail'
import {
  CONCLUSIONS,
  SOURCE_DOCUMENT,
  INSPECTOR,
  SOURCES,
  FIXTURE_VERSION,
} from '../components/homepage/scenes/scene-05-fixtures'

afterEach(cleanup)

const renderScene = () =>
  render(<SceneTrail openDocumentHref="/doc" reportHref="/report" />)

/**
 * Scene 05 — The trail. Frozen: DDL-MKT-003. Gate 2 applies in full.
 * Content: FIXTURES_SCENE_05.md v1.0.0 (DDL-MKT-008).
 *
 * Two obligations shape this suite.
 *
 * First, Gate 2: sixteen blocking checkpoints with no marketing exemption.
 * The tests that matter most assert traceability (§8.1), the distinction
 * between extraction and inference (§8.13), and the neutrality of absence
 * (§8.15).
 *
 * Second, the Fixture Stability Contract (§12.2). The counts below are
 * invariants shared with Scenes 06 and 07. Asserting them here means a fixture
 * edit that breaks cross-scene reconciliation fails the build rather than
 * shipping silently — which is the mitigation DDL-MKT-008 relies on.
 */
describe('Scene 05 — The trail', () => {
  describe('fixture contract — cross-scene invariants', () => {
    it('is built against fixture v1.0.0', () => {
      expect(FIXTURE_VERSION).toBe('1.0.0')
    })

    it('has five sources: four read, one not received', () => {
      expect(SOURCES).toHaveLength(5)
      expect(SOURCES.filter((s) => s.received)).toHaveLength(4)
      const missing = SOURCES.filter((s) => !s.received)
      expect(missing).toHaveLength(1)
      expect(missing[0].name).toContain('Reference check')
    })

    it('has five conclusions: one inferred, one conflicting, one unsupported', () => {
      expect(CONCLUSIONS).toHaveLength(5)
      expect(CONCLUSIONS.filter((c) => c.evidenceType === 'inferred')).toHaveLength(1)
      expect(CONCLUSIONS.filter((c) => c.evidenceType === 'conflicting')).toHaveLength(1)
      expect(CONCLUSIONS.filter((c) => c.evidenceType === 'none')).toHaveLength(1)
    })

    it('has exactly two citable passages, in different dimensions', () => {
      // Invariants 6–7. Collapsing them into one dimension destroys the
      // demonstration that citation is passage-level, not document-level.
      const citable = SOURCE_DOCUMENT.paragraphs.filter((p) => p.passageRef !== null)
      expect(citable).toHaveLength(2)
      expect(citable.map((p) => p.index)).toEqual([3, 5])

      const dims = CONCLUSIONS.filter((c) => c.passageRef !== null).map((c) => c.dimension)
      expect(new Set(dims).size).toBe(2)
    })

    it('keeps the surrounding paragraphs — they are not optional padding', () => {
      // Invariant 9. Removing them reintroduces the floating-quotation defect.
      const surrounding = SOURCE_DOCUMENT.paragraphs.filter((p) => p.passageRef === null)
      expect(surrounding).toHaveLength(4)
      expect(surrounding.map((p) => p.index)).toEqual([1, 2, 4, 6])
    })

    it('preserves the deliberate near-miss between hypothetical and actual throughput', () => {
      // Invariant 20. A fixture where every figure aligned would read as
      // fabricated, and this scene's argument is that the evidence is checkable.
      expect(SOURCE_DOCUMENT.paragraphs[0].text).toContain('40,000 events per second')
    })
  })

  describe('traceability — §8.1', () => {
    it('renders the whole document, not a floating quotation', () => {
      renderScene()
      SOURCE_DOCUMENT.paragraphs.forEach((p) => {
        expect(screen.getByText(new RegExp(escapeRe(p.text.slice(0, 40))))).toBeInTheDocument()
      })
    })

    it('names the source file and page', () => {
      renderScene()
      expect(
        screen.getByText(`${SOURCE_DOCUMENT.filename} · page ${SOURCE_DOCUMENT.page}`)
      ).toBeInTheDocument()
    })

    it('highlights the phrase carrying the claim, not the whole paragraph', () => {
      const { container } = renderScene()
      const marks = container.querySelectorAll('mark')
      expect(marks.length).toBeGreaterThan(0)
      const highlighted = marks[0].textContent ?? ''
      const paragraph = SOURCE_DOCUMENT.paragraphs[2].text
      expect(highlighted.length).toBeLessThan(paragraph.length)
      expect(paragraph).toContain(highlighted)
    })

    it('resolves the selected conclusion to a named page and paragraph', () => {
      renderScene()
      expect(screen.getByText('Page 3, paragraph 3')).toBeInTheDocument()
    })

    it('every inspector record carries all six fields', () => {
      INSPECTOR.forEach((record) => {
        expect(record.fields).toHaveLength(6)
        expect(record.fields.map((f) => f.label)).toEqual([
          'Passage reference',
          'Source',
          'Location',
          'Evidence type',
          'Verification state',
          'Dimension',
        ])
      })
    })
  })

  describe('extraction versus inference — §8.13', () => {
    it('labels each conclusion by evidence type', () => {
      renderScene()
      // Exact strings, not substrings: "Read from document · 2 sources" is a
      // prefix of the conflicting label, and a loose match would pass while
      // proving nothing about which row carries which type.
      expect(screen.getByText('Read from document · 2 sources')).toBeInTheDocument()
      expect(screen.getByText('Read from document · 4 sources')).toBeInTheDocument()
      expect(
        screen.getByText('Inferred · 3 references, never stated directly')
      ).toBeInTheDocument()
      expect(screen.getByText('Read from document · 2 sources, conflicting')).toBeInTheDocument()
      expect(screen.getByText('No sources')).toBeInTheDocument()
    })

    it('styles inferred and unsupported rows identically to read rows', () => {
      // §8.15 / A-07 and Fixture invariant 14. "Inferred" is not worse than
      // "read"; "no sources" is not worse than either.
      renderScene()
      const buttons = screen.getAllByRole('button')
      const classesOf = (i: number) => buttons[i].className
      // Rows 2..5 are all unselected; their classes must be identical
      // regardless of evidence type.
      expect(classesOf(1)).toBe(classesOf(2))
      expect(classesOf(2)).toBe(classesOf(3))
      expect(classesOf(3)).toBe(classesOf(4))
    })

    it('manufactures no passage reference for the inferred conclusion', () => {
      // §14 F4 — a citation that resolves to a document rather than a claim is
      // provenance theatre. The inferred record carries an em dash, not a number.
      const inferred = INSPECTOR.find((r) => r.conclusionId === 3)!
      expect(inferred.fields[0]).toEqual({ label: 'Passage reference', value: '—' })
      expect(inferred.fields[3].value).toBe('Inferred')
      expect(inferred.provenanceNote).toContain('Never asserted by the candidate')
    })
  })

  describe('absence — §8.15', () => {
    it('states what would resolve the unsupported conclusion', () => {
      // §8.3 — a limitation without a route to resolving it is a worse claim.
      const none = INSPECTOR.find((r) => r.conclusionId === 5)!
      expect(none.provenanceNote).toContain('What would resolve it')
      expect(none.provenanceNote).toContain('reference who worked an outage')
    })

    it('distinguishes absence of evidence from evidence of absence', () => {
      const none = INSPECTOR.find((r) => r.conclusionId === 5)!
      expect(none.provenanceNote).toContain('absence of evidence, not evidence of absence')
    })

    it('renders the not-supported entry in ordinary inspector type', () => {
      const { container } = renderScene()
      const entry = screen.getByText(/Not supported by this document/)
      expect(entry.className).toContain('text-hp-text-tertiary')
      expect(entry.className).not.toMatch(/danger|warning|error|italic|opacity/)
      expect(container.querySelector('svg')).toBeNull()
    })
  })

  describe('selection — the reader follows the trail themselves', () => {
    it('selects the first conclusion by default', () => {
      renderScene()
      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toHaveAttribute('aria-current', 'true')
      expect(buttons[1]).not.toHaveAttribute('aria-current')
    })

    it('moves the inspector to the chosen conclusion', async () => {
      const user = userEvent.setup()
      renderScene()
      expect(screen.getByText('Page 3, paragraph 3')).toBeInTheDocument()

      await user.click(screen.getAllByRole('button')[1])

      expect(screen.getByText('Page 3, paragraph 5')).toBeInTheDocument()
      expect(screen.getByText('Written communication')).toBeInTheDocument()
    })

    it('reports no passage reference when the conclusion has none', async () => {
      const user = userEvent.setup()
      renderScene()
      await user.click(screen.getAllByRole('button')[4]) // "No evidence either way"
      expect(screen.getByText('Not assessed')).toBeInTheDocument()
      expect(screen.getByText('No source on file')).toBeInTheDocument()
    })

    it('preserves both readings of the disagreement', async () => {
      // Fixture invariants 17–19. Scene 06 commits to "We show you both."
      renderScene()
      expect(screen.getByText(/J\. Okonkwo, staff engineer/)).toBeInTheDocument()
      expect(screen.getByText(/S\. Adeyemi, principal engineer/)).toBeInTheDocument()
      expect(screen.getByText(/Meets the bar on systems design\./)).toBeInTheDocument()
      expect(
        screen.getByText(/Does not clearly meet the bar on systems design\./)
      ).toBeInTheDocument()
    })

    it('keeps the losing reading after resolution', () => {
      renderScene()
      expect(screen.getByText(/The divergence is recorded rather than removed\./)).toBeInTheDocument()
      // Both readings still present alongside the resolution.
      expect(screen.getByText(/I could not tell from the conversation/)).toBeInTheDocument()
    })
  })

  describe('actions — §8.13 requires a real reporting path', () => {
    const reportUrl = () =>
      new URL(
        screen.getByRole('link', { name: 'Report this as wrong' }).getAttribute('href') ?? '',
        'https://example.test'
      )

    it('renders both inspector actions with their given destinations', () => {
      renderScene()
      expect(screen.getByRole('link', { name: 'Open full document' })).toHaveAttribute(
        'href',
        '/doc'
      )
      expect(reportUrl().pathname).toBe('/report')
    })

    /**
     * A reporting path that resolves but discards the citation satisfies the
     * letter of §8.13 and none of its purpose: "this is wrong" with no
     * indication of WHAT is wrong cannot be investigated, so the signal has
     * not really reached us. These assert the report stays investigable.
     */
    it('carries the disputed conclusion, its source and the fixture version', () => {
      renderScene()
      const params = reportUrl().searchParams
      expect(params.get('c')).toBe(String(CONCLUSIONS[0].id))
      expect(params.get('t')).toBe(CONCLUSIONS[0].text)
      expect(params.get('d')).toBe(SOURCE_DOCUMENT.filename)
      expect(params.get('v')).toBe(FIXTURE_VERSION)
      expect(params.get('p')).toBeTruthy()
    })

    it('re-points at whichever conclusion the reader has selected', async () => {
      const user = userEvent.setup()
      renderScene()
      const target = CONCLUSIONS[2]
      await user.click(screen.getByRole('button', { name: new RegExp(target.text) }))
      const params = reportUrl().searchParams
      expect(params.get('c')).toBe(String(target.id))
      expect(params.get('t')).toBe(target.text)
    })

    /**
     * §8.15. The conclusion with no sources on file must still be reportable,
     * and its passage field must SAY it has no sources rather than arriving
     * blank — a blank reads as missing metadata, not as the finding.
     */
    it('states the absence of a passage rather than omitting it', async () => {
      const user = userEvent.setup()
      renderScene()
      const unsourced = CONCLUSIONS.find((c) => c.passageRef === null)
      expect(unsourced, 'fixture must retain an unsourced conclusion').toBeDefined()
      await user.click(screen.getByRole('button', { name: new RegExp(unsourced!.text) }))
      expect(reportUrl().searchParams.get('p')).toBe('No passage — no sources on file')
    })
  })

  describe('accessibility', () => {
    it('exposes the scene heading in the outline', () => {
      renderScene()
      expect(screen.getByRole('heading', { name: 'The trail', level: 2 })).toBeInTheDocument()
    })

    it('nests the three column headings below it', () => {
      renderScene()
      for (const name of ['Conclusions', 'Inspector']) {
        expect(screen.getByRole('heading', { name, level: 3 })).toBeInTheDocument()
      }
    })

    it('makes every conclusion keyboard-operable', async () => {
      const user = userEvent.setup()
      renderScene()
      await user.tab()
      // First focusable element in the scene is the first conclusion.
      expect(screen.getAllByRole('button')[0]).toHaveFocus()
      await user.tab()
      expect(screen.getAllByRole('button')[1]).toHaveFocus()
    })

    it('selects by keyboard as well as pointer', async () => {
      const user = userEvent.setup()
      renderScene()
      await user.tab()
      await user.tab()
      await user.keyboard('{Enter}')
      expect(screen.getAllByRole('button')[1]).toHaveAttribute('aria-current', 'true')
    })

    it('announces inspector changes politely', () => {
      const { container } = renderScene()
      expect(container.querySelector('[aria-live="polite"]')).not.toBeNull()
    })

    it('uses a description list for inspector fields', () => {
      const { container } = renderScene()
      expect(container.querySelector('dl')).not.toBeNull()
      expect(container.querySelectorAll('dt')).toHaveLength(6)
      expect(container.querySelectorAll('dd')).toHaveLength(6)
    })

    it('hides the decorative margin numerals from assistive technology', () => {
      // The numeral duplicates the inspector's "Passage reference" field; read
      // twice it is noise.
      const { container } = renderScene()
      const marginRefs = container.querySelectorAll('span[aria-hidden="true"]')
      expect(marginRefs.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('governance', () => {
    it('declares the dense register and field width', () => {
      const { container } = renderScene()
      const section = container.querySelector('section[data-scene="05"]')
      expect(section).toHaveAttribute('data-density', 'dense')
      expect(container.querySelector('[data-container="field"]')).not.toBeNull()
    })

    it('shows no candidate photograph or avatar', () => {
      // DDL-VIS-007.
      const { container } = renderScene()
      expect(container.querySelector('img')).toBeNull()
      expect(container.querySelector('svg')).toBeNull()
    })

    it('shows no score, percentage or rating', () => {
      // §8.10 — never a percentage unless calibrated.
      const { container } = renderScene()
      const text = container.textContent ?? ''
      expect(text).not.toMatch(/\d+\s?%/)
      expect(text).not.toMatch(/\b\d\/5\b|★/)
    })

    it('confines monospace to identifiers and passage numerals', () => {
      // DDL-VIS-003.
      const { container } = renderScene()
      const mono = Array.from(container.querySelectorAll('.font-hp-mono'))
      expect(mono.length).toBeGreaterThan(0)
      mono.forEach((el) => {
        const t = (el.textContent ?? '').trim()
        // Either a passage/ordinal numeral or a filename+page identifier.
        expect(/^\d+$/.test(t) || t.includes('.pdf')).toBe(true)
      })
    })

    it('uses no hue anywhere — highlight is a neutral field', () => {
      const { container } = renderScene()
      const html = container.innerHTML
      for (const banned of ['amber', 'yellow', 'red-', 'green-', 'blue-', 'purple-']) {
        expect(html).not.toContain(banned)
      }
    })
  })
})

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
