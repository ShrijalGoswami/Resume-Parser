'use client'

import * as React from 'react'

/**
 * SSR-safe media query hook via useSyncExternalStore — server renders `false`,
 * the client subscribes to the query without setState-in-effect.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onStoreChange)
      return () => list.removeEventListener('change', onStoreChange)
    },
    [query],
  )
  const getSnapshot = React.useCallback(() => window.matchMedia(query).matches, [query])
  return React.useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** Breakpoints from Design Bible §3.6 (primary target ≥1024). */
export const useIsTablet = () => useMediaQuery('(min-width: 768px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
/** ≥1440 is where the Copilot rail switches from overlay to push (§4.1). */
export const useIsWide = () => useMediaQuery('(min-width: 1440px)')
export const usePrefersReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)')
