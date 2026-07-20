'use client'

import * as React from 'react'

/**
 * SSR-safe media query hook. Starts `false` on the server and first client
 * render, then syncs on mount to avoid hydration mismatches.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    const list = window.matchMedia(query)
    setMatches(list.matches)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Breakpoints from Design Bible §3.6 (primary target ≥1024). */
export const useIsTablet = () => useMediaQuery('(min-width: 768px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
/** ≥1440 is where the Copilot rail switches from overlay to push (§4.1). */
export const useIsWide = () => useMediaQuery('(min-width: 1440px)')
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)')
