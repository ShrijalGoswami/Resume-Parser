/**
 * `next/font/google` stub for Vitest.
 *
 * The real module is a build-time construct: the Next compiler rewrites these
 * calls and downloads the font files. Under plain Vitest there is no compiler,
 * so importing it yields a module whose exports are not callable and every
 * suite that reaches it dies at import time with
 * `TypeError: Inter is not a function`.
 *
 * Nothing reached it until the Radix portal primitives began importing
 * `theme/fonts.ts` (commit 64661ae) to fix fonts inside portals. That made nine
 * suites fail on an import they never make deliberately — they render a dialog,
 * a drawer, a dropdown or a tooltip.
 *
 * The stub returns the same SHAPE the real loader returns — `className`,
 * `variable`, `style` — so `fontVariables` still composes a string and any
 * assertion about class names still sees a string. It is wired in
 * `vitest.config.ts` and is INVISIBLE TO THE PRODUCT: no application code
 * imports it, and the real loader is untouched in every build.
 */
type FontResult = {
  className: string
  variable: string
  style: { fontFamily: string; fontStyle?: string; fontWeight?: number }
}

function loader(family: string) {
  return (options?: { variable?: string }): FontResult => ({
    className: `__stub_${family}`,
    variable: options?.variable ?? `--font-${family.toLowerCase()}`,
    style: { fontFamily: family },
  })
}

export const Inter = loader('Inter')
export const JetBrains_Mono = loader('JetBrains_Mono')
export const Newsreader = loader('Newsreader')
export const Public_Sans = loader('Public_Sans')
export const Geist = loader('Geist')
export const Geist_Mono = loader('Geist_Mono')
export const Fraunces = loader('Fraunces')
