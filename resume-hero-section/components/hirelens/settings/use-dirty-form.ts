'use client'

import * as React from 'react'

/**
 * Minimal dirty-state form (UX Spec §10). Values seed once from `initial`; dirty
 * is computed against the CURRENT `initial`, so after a save updates the source
 * data the form settles to clean without a remount. Reset restores `initial`.
 * Mount the consuming form with a `key` tied to the record id so switching
 * records starts fresh.
 */
export function useDirtyForm<T extends Record<string, string | number | boolean | null>>(
  initial: T,
) {
  const [values, setValues] = React.useState<T>(initial)

  const set = React.useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }))
  }, [])

  const reset = React.useCallback(() => setValues(initial), [initial])

  const dirty = (Object.keys(values) as Array<keyof T>).some((key) => values[key] !== initial[key])

  return { values, set, reset, dirty }
}
