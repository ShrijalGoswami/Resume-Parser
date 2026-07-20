'use client'

import * as React from 'react'

const CHANGE_EVENT = 'hl-persisted-state-change'

/**
 * localStorage-backed state via useSyncExternalStore — SSR-safe (server renders
 * the fallback, no hydration mismatch) and synced across tabs. Used for
 * persisted UI preferences (density, nav collapse).
 */
export function usePersistedState<T extends string>(
  key: string,
  fallback: T,
  isValid: (value: string | null) => value is T,
): [T, (value: T) => void] {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    window.addEventListener('storage', onStoreChange)
    window.addEventListener(CHANGE_EVENT, onStoreChange)
    return () => {
      window.removeEventListener('storage', onStoreChange)
      window.removeEventListener(CHANGE_EVENT, onStoreChange)
    }
  }, [])

  const getSnapshot = React.useCallback((): T => {
    const stored = window.localStorage.getItem(key)
    return isValid(stored) ? stored : fallback
  }, [key, fallback, isValid])

  const value = React.useSyncExternalStore(subscribe, getSnapshot, () => fallback)

  const setValue = React.useCallback(
    (next: T) => {
      window.localStorage.setItem(key, next)
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
    [key],
  )

  return [value, setValue]
}
