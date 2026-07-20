'use client'

import * as React from 'react'

/**
 * JSON-backed localStorage state via useSyncExternalStore — SSR-safe (server
 * renders the fallback) and synced across tabs. The persisted value is real,
 * per-device state; swapping to a backend later keeps the same hook signature.
 */
const CHANGE_EVENT = 'hl-local-store-change'

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function useLocalStore<T>(
  key: string,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    window.addEventListener('storage', onStoreChange)
    window.addEventListener(CHANGE_EVENT, onStoreChange)
    return () => {
      window.removeEventListener('storage', onStoreChange)
      window.removeEventListener(CHANGE_EVENT, onStoreChange)
    }
  }, [])

  const getSnapshot = React.useCallback(() => window.localStorage.getItem(key), [key])
  const raw = React.useSyncExternalStore(subscribe, getSnapshot, () => null)
  const value = React.useMemo(() => (raw ? safeParse(raw, fallback) : fallback), [raw, fallback])

  const setValue = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      const currentRaw = window.localStorage.getItem(key)
      const current = currentRaw ? safeParse(currentRaw, fallback) : fallback
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current) : next
      window.localStorage.setItem(key, JSON.stringify(resolved))
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
    [key, fallback],
  )

  return [value, setValue]
}
