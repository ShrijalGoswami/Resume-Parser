// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  AnalyzingState,
  ANALYSIS_STAGES,
  savingLabelFor,
} from '../components/hirelens/workspace/add-candidates-dialog'

/**
 * The waiting state must not claim to know what it cannot know.
 *
 * The bug these guard: the dialog rendered `Analyzing… {progress}%` where
 * `progress` came from `xhr.upload.onprogress` — bytes sent, not work done. It
 * reached 100 the instant the last byte left the browser, so the label read
 * "Analyzing… 100%" for the entire time the model was actually analysing. The
 * number was real; it measured the wrong thing and was labelled as the other.
 *
 * `/batch-analysis` is one POST and one JSON response — no stream, no job id,
 * no per-file events — so there is no honest percentage to show here. These
 * tests pin that: indeterminate, no digits, no completion claims.
 */

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('the analysis wait is indeterminate', () => {
  it('shows no percentage at all', () => {
    render(<AnalyzingState fileCount={3} />)
    // Any percentage here would be invented — most damagingly "100%".
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\d+\s*%/)
  })

  it('exposes no progressbar value, because there is no value to expose', () => {
    render(<AnalyzingState fileCount={3} />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('names the batch it is working on', () => {
    render(<AnalyzingState fileCount={3} />)
    expect(screen.getByText('3 résumés processing')).toBeInTheDocument()
    cleanup()
    render(<AnalyzingState fileCount={1} />)
    expect(screen.getByText('1 résumé processing')).toBeInTheDocument()
  })

  it('is announced to assistive tech without stealing focus', () => {
    render(<AnalyzingState fileCount={2} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })
})

describe('the processing chamber', () => {
  it('renders in place of the dropzone', () => {
    render(<AnalyzingState fileCount={4} />)
    expect(screen.getByTestId('processing-chamber')).toBeInTheDocument()
  })

  it('renders a stack of 3–5 document cards', () => {
    const { container } = render(<AnalyzingState fileCount={4} />)
    const cards = container.querySelectorAll('[style*="hl-doc-float"]')
    expect(cards.length).toBeGreaterThanOrEqual(3)
    expect(cards.length).toBeLessThanOrEqual(5)
  })

  it('drives every motion from the shared HireLens keyframes', () => {
    // Reusing the primitives in globals.css is what makes the global
    // reduced-motion rule cover this without a second implementation.
    const { container } = render(<AnalyzingState fileCount={4} />)
    const animated = [...container.querySelectorAll<HTMLElement>('[style*="animation"]')]
      .map((el) => el.style.animation)
      .join(' ')
    expect(animated).toContain('hl-doc-float')
    expect(animated).toContain('hl-doc-scan')
    expect(animated).toContain('hl-doc-glow')
  })

  it('keeps the decorative layers out of the accessibility tree', () => {
    const { container } = render(<AnalyzingState fileCount={4} />)
    for (const el of container.querySelectorAll<HTMLElement>('[style*="animation"]')) {
      // The beam, glow and paper carry no meaning a screen reader needs; the
      // status text below them does.
      expect(el.closest('[aria-hidden="true"]')).not.toBeNull()
    }
  })

  it('holds the stack in a fixed-height box so nothing shifts while it runs', () => {
    const { container } = render(<AnalyzingState fileCount={4} />)
    expect(container.querySelector('.h-\\[112px\\]')).not.toBeNull()
  })
})

describe('reduced motion', () => {
  it('is handled by the global .hl rule rather than a second code path', () => {
    // The chamber renders inside DialogContent, which carries `hl`; the
    // stylesheet neutralizes `.hl *` animations under prefers-reduced-motion.
    // A component-level media query here would be a second thing to forget.
    const css = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8')
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(reduced).toMatch(/\.hl \*/)
    expect(reduced).toMatch(/animation-duration:\s*0\.001ms\s*!important/)

    // And the keyframes it has to neutralize are declared in that same file.
    for (const name of ['hl-doc-float', 'hl-doc-scan', 'hl-doc-glow']) {
      expect(css).toContain(`@keyframes ${name}`)
    }
  })

  it('keeps the glow under a restrained opacity ceiling', () => {
    const css = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf8')
    const block = css.slice(css.indexOf('@keyframes hl-doc-glow'))
    const peak = Math.max(
      ...[...block.slice(0, 200).matchAll(/opacity:\s*([\d.]+)/g)].map((m) => Number(m[1])),
    )
    expect(peak).toBeLessThanOrEqual(0.2)
  })
})

describe('the status messages', () => {
  it('starts on the first stage', () => {
    render(<AnalyzingState fileCount={2} />)
    expect(screen.getByText(`${ANALYSIS_STAGES[0]}…`)).toBeInTheDocument()
  })

  it('advances through the pipeline in order', () => {
    vi.useFakeTimers()
    render(<AnalyzingState fileCount={2} />)
    for (let i = 1; i < ANALYSIS_STAGES.length; i++) {
      act(() => {
        vi.advanceTimersByTime(2800)
      })
      expect(screen.getByText(`${ANALYSIS_STAGES[i]}…`)).toBeInTheDocument()
    }
  })

  it('holds on the last stage instead of looping back', () => {
    // Looping would tell the reader the work had gone backwards.
    vi.useFakeTimers()
    render(<AnalyzingState fileCount={2} />)
    act(() => {
      vi.advanceTimersByTime(2800 * 20)
    })
    expect(
      screen.getByText(`${ANALYSIS_STAGES[ANALYSIS_STAGES.length - 1]}…`),
    ).toBeInTheDocument()
    expect(screen.queryByText(`${ANALYSIS_STAGES[0]}…`)).not.toBeInTheDocument()
  })

  it('never claims a stage finished', () => {
    // No ticks, no "done", no "complete" — the client cannot observe any of it.
    for (const stage of ANALYSIS_STAGES) {
      expect(stage).not.toMatch(/complete|done|finished|✓/i)
    }
  })
})

describe('the saving tail (persisting / indexing)', () => {
  it('names each phase instead of guessing at it', () => {
    // The client issued these calls itself, so it knows which is outstanding.
    expect(savingLabelFor('persisting')).toBe('Saving your candidates…')
    expect(savingLabelFor('indexing')).toBe('Finishing up…')
  })

  it('leaves the rotation on for the one phase that is genuinely opaque', () => {
    expect(savingLabelFor('analyzing')).toBeUndefined()
    expect(savingLabelFor('uploading')).toBeUndefined()
    expect(savingLabelFor('idle')).toBeUndefined()
    expect(savingLabelFor('error')).toBeUndefined()
  })

  it('keeps the same chamber and animation, only swapping the line', () => {
    const { container } = render(
      <AnalyzingState fileCount={4} savingLabel="Saving your candidates…" />,
    )
    expect(screen.getByTestId('processing-chamber')).toBeInTheDocument()
    expect(container.querySelectorAll('[style*="hl-doc-float"]').length).toBe(4)
    const animated = [...container.querySelectorAll<HTMLElement>('[style*="animation"]')]
      .map((el) => el.style.animation)
      .join(' ')
    expect(animated).toContain('hl-doc-scan')
    expect(animated).toContain('hl-doc-glow')

    expect(screen.getByText('Saving your candidates…')).toBeInTheDocument()
    expect(screen.getByText('4 résumés processing')).toBeInTheDocument()
  })

  it('stops rotating once the phase has a name', () => {
    vi.useFakeTimers()
    render(<AnalyzingState fileCount={4} savingLabel="Finishing up…" />)
    act(() => {
      vi.advanceTimersByTime(2800 * 6)
    })
    // The line must not drift back into the analysis guesses.
    expect(screen.getByText('Finishing up…')).toBeInTheDocument()
    for (const stage of ANALYSIS_STAGES) {
      expect(screen.queryByText(`${stage}…`)).not.toBeInTheDocument()
    }
  })

  it('shows no percentage and no progressbar while saving', () => {
    render(<AnalyzingState fileCount={4} savingLabel="Saving your candidates…" />)
    expect(document.body.textContent).not.toMatch(/\d+\s*%/)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows no completion mark before the API has actually finished', () => {
    render(<AnalyzingState fileCount={4} savingLabel="Finishing up…" />)
    expect(document.body.textContent).not.toMatch(/✓|✔|Done|Complete/i)
  })
})

describe('the surrounding states', () => {
  const dialog = readFileSync(
    resolve(__dirname, '../components/hirelens/workspace/add-candidates-dialog.tsx'),
    'utf8',
  )

  it('keeps the uploading state determinate, with a real number', () => {
    // Bytes sent IS knowable, so that half keeps its bar — and now says what
    // the number measures instead of calling it "Analyzing".
    expect(dialog).toMatch(/phase === 'uploading'/)
    expect(dialog).toContain('Uploading résumés')
    expect(dialog).toMatch(/role="progressbar"/)
    expect(dialog).toMatch(/aria-valuenow=\{progress\}/)
  })

  it('mounts the chamber across analyzing, persisting and indexing', () => {
    // One condition, one mount point: there is no path where the chamber can
    // outlive the request, and no gap where the dropzone flashes back.
    const mounts = dialog.match(/<AnalyzingState/g) ?? []
    expect(mounts).toHaveLength(1)
    expect(dialog).toMatch(
      /phase === 'analyzing' \|\| phase === 'persisting' \|\| phase === 'indexing' \? \(\s*<AnalyzingState/,
    )
    expect(dialog).toMatch(/savingLabel=\{savingLabelFor\(phase\)\}/)
  })

  it('removes the chamber on success, error and cancel', () => {
    // Success and cancel both call `reset()`, which returns phase to `idle`;
    // error moves it to `error`. None of the three is a chamber phase, so all
    // three unmount it — and `error` is deliberately not `busy` either.
    expect(dialog).toMatch(/setPhase\('idle'\)/)
    expect(dialog).toMatch(/setPhase\('error'\)/)
    expect(dialog).toMatch(/const busy =[\s\S]{0,200}phase === 'indexing'/)
    expect(dialog).not.toMatch(/const busy =[\s\S]{0,200}phase === 'error'/)
    // Cancel path: closing while not busy resets.
    expect(dialog).toMatch(/if \(!next && !busy\) reset\(\)/)
  })

  it('still swaps the dropzone rather than stacking a second surface', () => {
    expect(dialog).toMatch(/phase === 'analyzing'[\s\S]{0,400}\) : \(\s*<button/)
  })

  it('closes with the chamber still up, and clears state on the next open', () => {
    // Resetting before the close swapped the chamber for an empty dropzone for
    // the length of the dialog's exit animation — the flash this removes.
    expect(dialog).toMatch(/onOpenChange\(false\)\s*\}\s*catch/)
    expect(dialog).not.toMatch(/reset\(\)\s*\n\s*onOpenChange\(false\)/)
    // Cleared when the dialog OPENS. Asserted on the condition rather than the
    // mechanism, so moving between an effect and a render-time adjustment
    // (React's "adjusting state when a prop changes") does not fail this.
    expect(dialog).toMatch(/if \(open\) \{[\s\S]{0,160}setPhase\('idle'\)/)
  })

  it('leaves the success toast and pipeline refresh untouched', () => {
    expect(dialog).toMatch(/variant: 'success'/)
    expect(dialog).toMatch(/invalidateQueries\(\{ queryKey: roleKeys\.candidates\(roleId\) \}\)/)
  })

  it('no longer renders a second status line under the chamber', () => {
    // The old shimmer + "Saving…" row is what the chamber replaced.
    expect(dialog).not.toContain('phaseLabel')
    expect(dialog).not.toContain('hl-ai-shimmer')
  })
})

describe('cleanup', () => {
  it('stops its timer on unmount, so completion / error / cancel leave nothing running', () => {
    vi.useFakeTimers()
    const clearSpy = vi.spyOn(window, 'clearInterval')
    const { unmount } = render(<AnalyzingState fileCount={2} />)
    unmount()
    expect(clearSpy).toHaveBeenCalled()

    // And nothing schedules another tick afterwards.
    const before = vi.getTimerCount()
    act(() => {
      vi.advanceTimersByTime(2800 * 3)
    })
    expect(vi.getTimerCount()).toBeLessThanOrEqual(before)
  })
})
