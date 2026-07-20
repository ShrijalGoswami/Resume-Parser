'use client'

import * as React from 'react'

/**
 * Tracks browser connectivity for the offline banner (Design Bible §4.10 /
 * UX §4.5). SSR-safe: assumes online until mounted.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = React.useState(true)

  React.useEffect(() => {
    setOnline(navigator.onLine)
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
