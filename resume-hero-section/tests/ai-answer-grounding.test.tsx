// @vitest-environment jsdom
/**
 * AIAnswer grounding disclosure.
 *
 * The Ask surface used to infer grounding from `sources_used.length`, which
 * collapsed two different states into one rendering: "grounded in your data but
 * the citations were dropped" and "answered from general knowledge, nothing to
 * cite" both showed no sources at all. A reader could not tell how much to
 * trust the answer.
 *
 * The server now computes `grounded` from the same attribution it returns, so
 * the UI reads that instead. These lock the three states apart.
 */
import { afterEach, describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { AIAnswer } from '@/components/hirelens/domain/ai-answer'

const NOTE = /wasn’t generated from your organization’s data/i

describe('AIAnswer grounding disclosure', () => {
  // Renders share one document; without this the previous case's note leaks
  // into the next and 'no disclaimer' passes or fails for the wrong reason.
  afterEach(cleanup)

  it('shows sources and no disclaimer when grounded', () => {
    render(
      <AIAnswer grounded sources={[{ label: 'Senior Backend Engineer' }]}>
        answer
      </AIAnswer>,
    )
    expect(screen.getByText('Senior Backend Engineer')).toBeInTheDocument()
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })

  it('states plainly that an ungrounded answer is not from your data', () => {
    render(<AIAnswer grounded={false}>answer</AIAnswer>)
    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })

  it('claims nothing when grounding is unknown', () => {
    // Conversations persisted before the field existed reload without it.
    // Silence is honest; a wrong badge is not.
    render(<AIAnswer>answer</AIAnswer>)
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument()
  })

  it('does not infer grounding from the presence of sources', () => {
    // The regression that matters: sources present, but the server said the
    // answer was not grounded. The server is the authority.
    render(<AIAnswer grounded={false} sources={[{ label: 'Organizational Memory' }]}>
      answer
    </AIAnswer>)
    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })
})
