import { Inter, JetBrains_Mono, Newsreader } from 'next/font/google'

/**
 * HireLens product type system (Design Bible §3.8).
 *
 * Two voices, exposed as CSS variables and consumed by the `.hl` scope in
 * globals.css:
 *   --font-inter     → everything: body, UI chrome, and page titles
 *   --font-jetbrains → data / scores / IDs, tabular (font-hl-mono)
 *
 * FRAUNCES WAS REMOVED, 29 Jul 2026. It backed `--font-hl-display` and so set
 * every page title in the authenticated product, which is what made a
 * dashboard read as an editorial site. Titles are now Inter at weight 680 —
 * emphasis from weight rather than from a second typeface, which is how
 * Stripe, Linear, GitHub, Vercel and Notion all do it.
 *
 * This is a payload win as well as a design one: Fraunces was loaded with its
 * optical-size axis on every authenticated page, and nothing referenced it
 * after the switch. It was never the marketing font — the public site has its
 * own scope, its own layout, and its own serif (Newsreader, loaded in
 * `app/(marketing)/layout.tsx`). Nothing here affects it.
 *
 * `display: 'swap'` keeps text visible during load; fallbacks are declared in
 * the `@theme` font stacks so an unstyled flash never blocks reading.
 */
export const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

/**
 * Newsreader — MAJOR display headings only (Design System V2 §4, decided).
 *
 * This partially supersedes the 29 Jul note above: V2 keeps Inter for every
 * page title, control and label (the July reasoning stands — no serif on
 * furniture), but reserves a serif for the handful of true display moments,
 * and the approved V2 direction names Newsreader as that serif — the same
 * voice the marketing site already speaks. First consumer: the Dashboard
 * greeting. Anything below `hl-display` size must not use it.
 */
export const fontSerif = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader-hl',
  display: 'swap',
})

/** Space-separated font-variable class names for the product shell root. */
export const fontVariables = `${fontSans.variable} ${fontMono.variable} ${fontSerif.variable}`
