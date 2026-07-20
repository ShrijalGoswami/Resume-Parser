'use client'

import * as React from 'react'

/**
 * Tracks browser connectivity for the offline banner (Design Bible §4.10 /
 * UX §4.5) via useSyncExternalStore. SSR-safe: assumes online until mounted.
 */
export function useOnlineStatus(): boolean {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    window.addEventListener('online', onStoreChange)
    window.addEventListener('offline', onStoreChange)
    return () => {
      window.removeEventListener('online', onStoreChange)
      window.removeEventListener('offline', onStoreChange)
    }
  }, [])
  return React.useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
}
