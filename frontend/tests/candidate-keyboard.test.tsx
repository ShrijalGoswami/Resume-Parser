// @vitest-environment jsdom
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import {
  useCandidateShortcuts,
  type CandidateShortcutHandlers,
} from '../components/hirelens/candidate-object/use-candidate-object'

afterEach(cleanup)

function Host({ handlers }: { handlers: CandidateShortcutHandlers }) {
  useCandidateShortcuts(handlers)
  return <input data-testid="field" />
}

function press(key: string, target: EventTarget = window, extra: KeyboardEventInit = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...extra }))
}

describe('useCandidateShortcuts — the Candidate Object keyboard contract', () => {
  it('routes A/S/R/E/F/Esc to the correct handlers', () => {
    const h = {
      advance: vi.fn(),
      hold: vi.fn(),
      reject: vi.fn(),
      openResume: vi.fn(),
      full: vi.fn(),
      close: vi.fn(),
    }
    render(<Host handlers={h} />)
    press('a')
    press('s')
    press('r')
    press('e')
    press('f')
    press('Escape')
    expect(h.advance).toHaveBeenCalledTimes(1)
    expect(h.hold).toHaveBeenCalledTimes(1)
    expect(h.reject).toHaveBeenCalledTimes(1)
    expect(h.openResume).toHaveBeenCalledTimes(1)
    expect(h.full).toHaveBeenCalledTimes(1)
    expect(h.close).toHaveBeenCalledTimes(1)
  })

  it('is dormant while typing in a field (never hijacks text input)', () => {
    const h = { advance: vi.fn() }
    const { getByTestId } = render(<Host handlers={h} />)
    press('a', getByTestId('field'))
    expect(h.advance).not.toHaveBeenCalled()
  })

  it('ignores modified chords (⌘/Ctrl/Alt + key)', () => {
    const h = { advance: vi.fn() }
    render(<Host handlers={h} />)
    press('a', window, { metaKey: true })
    press('a', window, { ctrlKey: true })
    press('a', window, { altKey: true })
    expect(h.advance).not.toHaveBeenCalled()
  })

  it('detaches its listener on unmount (no leak)', () => {
    const h = { advance: vi.fn() }
    const { unmount } = render(<Host handlers={h} />)
    unmount()
    press('a')
    expect(h.advance).not.toHaveBeenCalled()
  })
})
