// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { TalentResultRow } from '../components/hirelens/talent/talent-result-row'
import type { SearchResultItem } from '../types/search'

/**
 * Quick review is the drawer. Full evaluation is a page.
 *
 * The audit found the second half of that sentence undiscoverable. The
 * canonical route — /jobs/[roleId]/candidates/[candidateId] — already existed
 * and already rendered the complete dossier, but every path a recruiter could
 * actually take ended in a drawer:
 *
 *   * the pipeline table's only candidate affordance opened the peek;
 *   * inside the peek, "Full review" was `variant="ghost"` — the quietest
 *     control in the system — so the drawer read as the whole review;
 *   * the comparison report named candidates and linked to none of them, and
 *     was never even given a roleId to build a link from;
 *   * a Talent result's only action was "Open", which is the drawer.
 *
 * So these tests guard the NAVIGATION CONTRACT, not the evaluation content:
 * every candidate surface offers a visible route to the one canonical page, and
 * no second evaluation route is ever introduced alongside it.
 */

const root = resolve(__dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

const CANONICAL_ROUTE = 'app/(hirelens)/jobs/[roleId]/candidates/[candidateId]/page.tsx'
/** The href every surface must build. */
const CANONICAL_HREF = /\/jobs\/\$\{[^}]+\}\/candidates\/\$\{[^}]+\}/

afterEach(cleanup)

// ── the canonical route ─────────────────────────────────────────────────────

describe('the canonical full-evaluation route', () => {
  it('exists and renders the full dossier', () => {
    expect(existsSync(resolve(root, CANONICAL_ROUTE))).toBe(true)
    const page = read(CANONICAL_ROUTE)
    expect(page).toContain('CandidateFullDossier')
  })

  it('resolves both ids from the route params, so deep links and refresh work', () => {
    const page = read(CANONICAL_ROUTE)
    // A server component awaiting `params` resolves identically on a fresh
    // navigation, a hard refresh and a pasted URL — there is no client state to
    // miss. Pinned because switching to a client-only param source would break
    // refresh silently.
    expect(page).toMatch(/params:\s*Promise<\{\s*roleId:\s*string;\s*candidateId:\s*string\s*\}>/)
    expect(page).toMatch(/await params/)
    expect(page).toMatch(/roleId=\{roleId\}/)
    expect(page).toMatch(/candidateId=\{candidateId\}/)
  })

  it('is the ONLY candidate evaluation route', () => {
    // A second evaluation page is the failure this whole task exists to avoid:
    // two surfaces claiming to be the complete review, drifting apart.
    const routes = [
      'app/(hirelens)/jobs/[roleId]/candidates/[candidateId]/page.tsx',
      'app/(hirelens)/candidates/[candidateId]/page.tsx',
      'app/(hirelens)/candidate/[candidateId]/page.tsx',
      'app/(hirelens)/jobs/[roleId]/candidates/[candidateId]/review/page.tsx',
      'app/(hirelens)/jobs/[roleId]/candidates/[candidateId]/full/page.tsx',
    ]
    const present = routes.filter((route) => existsSync(resolve(root, route)))
    expect(present).toEqual([CANONICAL_ROUTE])
  })

  it('offers a way back to the originating role', () => {
    const dossier = read('components/hirelens/candidate-object/candidate-full-dossier.tsx')
    expect(dossier).toMatch(/href:\s*`\/jobs\/\$\{roleId\}`/)
    expect(dossier).toContain('router.back()')
  })
})

// ── drawer → full review ────────────────────────────────────────────────────

describe('the candidate peek promotes to the full evaluation', () => {
  const peek = read('components/hirelens/candidate-object/candidate-peek.tsx')

  it('still exists as the quick-review surface', () => {
    // The drawer is not being replaced. Guarded so a future edit cannot read
    // this task as "delete the peek".
    expect(peek).toContain('<Drawer')
    expect(peek).toContain('CandidateDecisionBar')
  })

  it('keeps the Full review action and the F shortcut', () => {
    expect(peek).toContain('Full review')
    expect(peek).toMatch(/<Kbd[^>]*>F<\/Kbd>/)
    expect(peek).toMatch(/full:\s*goFull/)
  })

  it('navigates to the canonical route with the current role and candidate', () => {
    expect(peek).toMatch(CANONICAL_HREF)
    expect(peek).toMatch(/router\.push\(`\/jobs\/\$\{roleId\}\/candidates\/\$\{candidateId\}`\)/)
  })

  it('does not render the promotion as the quietest control on screen', () => {
    // The specific regression: `variant="ghost"` on the one control that leaves
    // the drawer. It must carry more weight than a hover-only affordance.
    const button = peek.slice(peek.indexOf('onClick={goFull}') - 400, peek.indexOf('onClick={goFull}'))
    expect(button).not.toMatch(/variant="ghost"/)
    expect(button).toMatch(/variant="(secondary|primary)"/)
  })

  it('is not reachable by keyboard alone', () => {
    // F may stay, but it must never be the only door.
    const shortcutOnly = peek.includes('Full review') === false
    expect(shortcutOnly).toBe(false)
  })
})

// ── pipeline table → full review ────────────────────────────────────────────

describe('the pipeline table offers both levels', () => {
  const table = read('components/hirelens/workspace/pipeline-table.tsx')

  it('keeps the name click as quick drawer access', () => {
    expect(table).toMatch(/onClick=\{\(\) => onOpenCandidate\(row\.id\)\}/)
  })

  it('adds an explicit link to the full evaluation', () => {
    expect(table).toMatch(/href=\{`\/jobs\/\$\{roleId\}\/candidates\/\$\{row\.id\}`\}/)
    expect(table).toContain('Full review')
  })

  it('keeps the padding colSpan in step with the added column', () => {
    // The virtualizer's spacer rows span every column; a stale COLUMN_COUNT
    // silently misaligns the whole table.
    const headerCount = (table.match(/<th\b/g) ?? []).length
    const declared = Number(/const COLUMN_COUNT = (\d+)/.exec(table)?.[1])
    expect(declared).toBe(headerCount)
  })

  it('receives the roleId it links with', () => {
    const lens = read('components/hirelens/workspace/pipeline-lens.tsx')
    expect(lens).toMatch(/<PipelineTable[\s\S]{0,200}roleId=\{roleId\}/)
  })
})

// ── compare → full evaluation ───────────────────────────────────────────────

describe('compare offers a path to each candidate’s full evaluation', () => {
  const report = read('components/hirelens/workspace/comparison-report.tsx')

  it('links every ranked candidate to the canonical route', () => {
    expect(report).toMatch(/href=\{`\/jobs\/\$\{roleId\}\/candidates\/\$\{candidateId\}`\}/)
    expect(report).toContain('Full evaluation')
    expect(report).toMatch(/candidateId=\{row\.candidate_id\}/)
  })

  it('omits the link rather than guessing when the role is unknown', () => {
    // Talent can compare across roles; a wrong candidate URL is worse than none.
    expect(report).toMatch(/if \(!roleId\) return null/)
  })

  it('is threaded a roleId from the role workspace', () => {
    const panel = read('components/hirelens/workspace/compare-panel.tsx')
    expect(panel).toMatch(/roleId=\{roleId\}/)
    const workspace = read('components/hirelens/workspace/role-workspace.tsx')
    expect(workspace).toMatch(/<ComparePanel[\s\S]{0,300}roleId=\{roleId\}/)
  })

  it('is threaded the shared campaign from talent, when there is one', () => {
    const talent = read('components/hirelens/talent/talent-screen.tsx')
    expect(talent).toMatch(/<ComparePanel[\s\S]{0,500}roleId=\{sharedCampaignId \?\? undefined\}/)
  })

  it('preserves the existing comparison sections', () => {
    // Navigation only — the report's content must be untouched.
    for (const section of [
      'Rankings',
      'Recommendation & rationale',
      'sources_used',
      'TIE_THRESHOLD',
    ]) {
      expect(report).toContain(section)
    }
  })
})

// ── talent → both levels (rendered) ─────────────────────────────────────────

const searchResult = (over: Partial<SearchResultItem> = {}): SearchResultItem => ({
  candidate_id: 'c1',
  name: 'Ada Lovelace',
  campaign_id: 'r1',
  campaign_title: 'Backend Engineer',
  similarity: 0.82,
  overall_score: 78,
  ats_score: 71,
  years_experience: 8,
  stage: 'sourced',
  matched_concepts: ['Kafka'],
  ...over,
})

describe('a talent result offers quick review and full evaluation', () => {
  const noop = () => {}

  it('renders both actions, with the full review pointing at the canonical route', () => {
    render(
      <TalentResultRow
        result={searchResult()}
        selected={false}
        onToggleSelect={noop}
        onOpen={noop}
        onFindSimilar={noop}
        onAddToCollection={noop}
      />,
    )
    expect(screen.getByRole('button', { name: 'Quick review' })).toBeInTheDocument()
    const full = screen.getByRole('link', { name: 'Full review of Ada Lovelace' })
    expect(full).toHaveAttribute('href', '/jobs/r1/candidates/c1')
  })

  it('keeps quick review available when the result carries no campaign', () => {
    render(
      <TalentResultRow
        result={searchResult({ campaign_id: null })}
        selected={false}
        onToggleSelect={noop}
        onOpen={noop}
        onFindSimilar={noop}
        onAddToCollection={noop}
      />,
    )
    expect(screen.getByRole('button', { name: 'Quick review' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Full review/ })).not.toBeInTheDocument()
  })

  it('keeps the existing per-result actions', () => {
    render(
      <TalentResultRow
        result={searchResult()}
        selected={false}
        onToggleSelect={noop}
        onOpen={noop}
        onFindSimilar={noop}
        onAddToCollection={noop}
      />,
    )
    expect(screen.getByRole('button', { name: /Find similar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save/ })).toBeInTheDocument()
  })
})
