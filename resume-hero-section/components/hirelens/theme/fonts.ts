import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google'

/**
 * HireLens V3 type system (Design Bible §3.8).
 *
 * Three voices, exposed as CSS variables and consumed by the `.hl` scope in
 * globals.css:
 *   --font-inter     → UI / body workhorse (font-hl-sans)
 *   --font-fraunces  → editorial display, optical-size axis (font-hl-display)
 *   --font-jetbrains → data / scores / IDs, tabular (font-hl-mono)
 *
 * `display: 'swap'` keeps text visible during load; fallbacks are declared in
 * the `@theme` font stacks so an unstyled flash never blocks reading.
 */
export const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const fontDisplay = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
})

export const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

/** Space-separated font-variable class names for the V3 shell root. */
export const fontVariables = `${fontSans.variable} ${fontDisplay.variable} ${fontMono.variable}`
