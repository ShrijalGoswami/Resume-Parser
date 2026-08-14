import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * WCAG 2.1 contrast floors for the design tokens, asserted against globals.css.
 *
 * These were measured failing in a browser sweep and then corrected:
 *
 *   light `--hl-text-tertiary`  3.43 / 3.22 / 3.00  →  5.24 / 4.92 / 4.57
 *   dark  `--hl-text-tertiary`  4.05 / 3.85 / 3.58  →  5.13 / 4.88 / 4.53
 *   dark  white on accent       3.50                →  4.56
 *
 * `--hl-text-tertiary` carries captions, timestamps and metadata, so it was the
 * most-read failing text in the product. A token is a single value shared by
 * hundreds of call sites; asserting it here is far cheaper than re-auditing
 * screens, and it stops a future palette tweak from silently reintroducing
 * unreadable text.
 */

const CSS = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8')

/** Read a token from a specific block, so light and dark can be told apart. */
function token(name: string, scope: 'light' | 'dark'): string {
  // Light values live in the `.hl {` block; dark in `[data-hl-theme='dark'] .hl {`.
  const marker = scope === 'dark' ? "[data-hl-theme='dark'] .hl {" : '.hl {'
  const start = CSS.indexOf(marker)
  expect(start, `could not find the ${scope} token block`).toBeGreaterThan(-1)
  const block = CSS.slice(start, CSS.indexOf('\n}', start))
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
  expect(match, `${name} not found in the ${scope} block`).toBeTruthy()
  return (match as RegExpMatchArray)[1]
}

function relativeLuminance(hex: string): number {
  const h = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrast(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

const AA_TEXT = 4.5
const AA_NON_TEXT = 3 // WCAG 1.4.11 — focus indicators, UI component boundaries

describe.each(['light', 'dark'] as const)('%s theme token contrast', (scope) => {
  const canvas = () => token('--hl-bg-canvas', scope)
  const subtle = () => token('--hl-bg-subtle', scope)
  const muted = () => token('--hl-bg-muted', scope)

  it('primary text clears AA on every surface', () => {
    const fg = token('--hl-text-primary', scope)
    for (const bg of [canvas(), subtle(), muted()]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  it('secondary text clears AA on every surface', () => {
    const fg = token('--hl-text-secondary', scope)
    for (const bg of [canvas(), subtle(), muted()]) {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  it('tertiary text clears AA on every surface it is used on', () => {
    // The regression that prompted this file. Captions and timestamps are normal-
    // size text, so the 3:1 large-text allowance does not apply.
    const fg = token('--hl-text-tertiary', scope)
    for (const bg of [canvas(), subtle(), muted()]) {
      expect(contrast(fg, bg), `tertiary on ${bg}`).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  it('white on a primary button clears AA', () => {
    expect(contrast('#ffffff', token('--hl-accent-solid', scope))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('accent stays distinguishable from the canvas for focus rings', () => {
    // `.hl :focus-visible` outlines in the accent; if the accent is darkened to
    // fix button text it must not sink into a dark canvas.
    expect(contrast(token('--hl-accent-solid', scope), canvas())).toBeGreaterThanOrEqual(
      AA_NON_TEXT,
    )
  })

  it('semantic status colours clear AA on their own tinted backgrounds', () => {
    for (const name of ['success', 'warning', 'danger', 'info']) {
      const fg = token(`--hl-${name}`, scope)
      const bg = token(`--hl-${name}-bg`, scope)
      expect(contrast(fg, bg), `${name} on ${name}-bg`).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })

  it('borders stay visible against their surface', () => {
    // Non-text contrast: a hairline that cannot be seen is not a boundary. The DS
    // is deliberately hairline-based, so this is load-bearing rather than cosmetic.
    expect(contrast(token('--hl-border-strong', scope), canvas())).toBeGreaterThanOrEqual(1.4)
  })

  it('disabled text is deliberately below AA', () => {
    // WCAG 1.4.3 exempts inactive controls. Pinned so nobody "fixes" it and makes
    // disabled indistinguishable from enabled.
    expect(contrast(token('--hl-text-disabled', scope), canvas())).toBeLessThan(AA_TEXT)
  })
})
