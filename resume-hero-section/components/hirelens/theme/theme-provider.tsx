'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ComponentProps } from 'react'

/**
 * HireLens V3 theme provider.
 *
 * Wraps next-themes with the V3 contract:
 *   - writes `data-hl-theme="light|dark"` on <html> (NOT the `.dark` class),
 *     so the frozen v1.0 app — whose only dark styling is keyed on `.dark` —
 *     is never affected by a V3 theme choice.
 *   - `enableSystem` honors `prefers-color-scheme`; an explicit choice is
 *     persisted under the `hl-theme` storage key and syncs across tabs.
 *   - `disableTransitionOnChange` prevents a color sweep when toggling.
 *
 * The V3 shell mounts this and renders its subtree inside a `.hl` element that
 * carries the font variables; token values resolve from the html attribute.
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="data-hl-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="hl-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
