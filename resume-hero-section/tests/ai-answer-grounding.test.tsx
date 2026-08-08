// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { AIAnswer } from '../components/hirelens/domain/ai-answer'

afterEach(cleanup)

/**
 * Grounding is the one thing the copilot must never get wrong, and the
 * ungrounded branch is the hardest to reach by hand: with a populated
 * workspace the server attaches campaign sources to almost every question, so
 * `grounded === false` did not occur once during browser verification. That is
 * exactly why it is pinned here rather than left to a screenshot — the
 * treatment has to be correct on the day it finally fires.
 *
 * The three states are deliberately distinct: grounded (attribution shown),
 * ungrounded (said out loud), and unknown (no claim either way — conversations
 * persisted before the field existed reload without it).
 */
const NOTE = /wasn’t generated from your organization’s data/

describe('AIAnswer grounding states', () => {
  it('states plainly when an answer was NOT generated from org data', () => {
    render(<AIAnswer grounded={false}>An answer from general knowledge.</AIAnswer>)
    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })

  it('makes no grounding claim when the server did not say (undefined)', () => {
    render(<AIAnswer>An answer with unknown grounding.</AIAnswer>)
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })

  it('shows the server attribution when grounded, and never the ungrounded note', () => {
    render(
      <AIAnswer grounded sources={[{ label: 'Current Campaign', title: 'The active role' }]}>
        A grounded answer.
      </AIAnswer>,
    )
    expect(screen.getByText('Sources')).toBeInTheDocument()
    expect(screen.getByText('Current Campaign')).toBeInTheDocument()
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })

  it('keeps a long source detail out of the chip label, as its title', () => {
    render(
      <AIAnswer
        sources={[{ label: 'Candidate Roster', title: 'Four candidates in the active role' }]}
      >
        A grounded answer.
      </AIAnswer>,
    )
    const chip = screen.getByText('Candidate Roster')
    expect(chip).toHaveAttribute('title', 'Four candidates in the active role')
  })
})
