import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Two defects found in the authenticated QA pass of 12 Aug 2026, both invisible
 * to a mouse user and both confirmed in a real browser before being fixed.
 *
 * These are source-level guards rather than rendered assertions, deliberately.
 * The behaviour they protect is focus movement across a Radix portal unmount,
 * which jsdom models badly enough that a passing test would prove nothing; the
 * real proof was Playwright against the production build, and it is recorded in
 * the pass notes. What can regress silently here is the WIRING — someone
 * removing `onCloseAutoFocus` or the sr-only heading while refactoring — and
 * that is exactly what these catch.
 */

const root = resolve(__dirname, '..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('Ask has a page heading', () => {
  const ask = read('components/hirelens/ask/ask-screen.tsx')

  it('renders an h1', () => {
    // Every other product screen gets its h1 from PageHeader. Ask renders no
    // header — it is a conversation surface — so it had no h1 at all and its
    // outline began at level 2.
    expect(ask).toMatch(/<h1[^>]*className="sr-only"[^>]*>\s*Ask\s*<\/h1>/)
  })

  it('keeps that heading visually hidden', () => {
    // A visible title above the thread would be a layout change on a frozen
    // screen. `sr-only` supplies the semantics without touching the design.
    expect(ask).toMatch(/<h1 className="sr-only">/)
  })
})

describe('command palette restores focus on dismiss', () => {
  const palette = read('components/hirelens/command-palette/command-palette.tsx')

  it('wires onCloseAutoFocus on the dialog content', () => {
    // Radix's own restore does not land here; `onCloseAutoFocus` with
    // preventDefault is what actually puts focus back.
    expect(palette).toMatch(/onCloseAutoFocus=\{onCloseAutoFocus\}/)
    expect(palette).toMatch(/event\.preventDefault\(\)/)
  })

  it('tracks the opener from focusin, not from onOpenChange', () => {
    // THE ORIGINAL FIX FAILED HERE. Both real open paths (the global ⌘K
    // listener and the top-bar launcher) set shell state directly, so Radix's
    // onOpenChange never fires on OPEN — capturing the opener there captured
    // the palette's own input instead. If this listener goes, the bug returns
    // in a form that still looks correct in review.
    expect(palette).toMatch(/addEventListener\('focusin'/)
    expect(palette).toMatch(/removeEventListener\('focusin'/)
  })

  it('ignores focus that lands inside the dialog', () => {
    expect(palette).toMatch(/closest\('\[role="dialog"\]'\)/)
  })

  it('does not fight the destination after running a command', () => {
    // Selecting a command navigates; restoring focus to a control on the page
    // being left would take it away from the new page.
    expect(palette).toMatch(/ranItemRef/)
    expect(palette).toMatch(/if \(ranItem\) return/)
  })

  it('never focuses a detached node', () => {
    // Focusing a node that has unmounted silently leaves focus on <body> —
    // indistinguishable from the original defect.
    expect(palette).toMatch(/document\.contains\(opener\)/)
  })
})
