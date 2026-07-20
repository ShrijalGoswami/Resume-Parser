'use client'

import * as React from 'react'

/**
 * Density preference (Design Bible §2.1) — a global user setting, persisted.
 * The V3 shell reflects it onto the `.hl` root as `data-hl-density`, which
 * drives the `--hl-control-h-*` / `--hl-*-pad` / `--hl-row-h` / `--hl-avatar`
 * scale in globals.css. Components read those variables, so most never need
 * this context directly.
 */
export type Density = 'comfortable' | 'compact'

const STORAGE_KEY = 'hl-density'

interface DensityContextValue {
  density: Density
  setDensity: (density: Density) => void
  toggleDensity: () => void
}

const DensityContext = React.createContext<DensityContextValue | null>(null)

export function DensityProvider({
  children,
  defaultDensity = 'comfortable',
}: {
  children: React.ReactNode
  defaultDensity?: Density
}) {
  const [density, setDensityState] = React.useState<Density>(defaultDensity)

  React.useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'comfortable' || stored === 'compact') {
      setDensityState(stored)
    }
  }, [])

  const setDensity = React.useCallback((next: Density) => {
    setDensityState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const toggleDensity = React.useCallback(() => {
    setDensityState((current) => {
      const next = current === 'comfortable' ? 'compact' : 'comfortable'
      window.localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  const value = React.useMemo(
    () => ({ density, setDensity, toggleDensity }),
    [density, setDensity, toggleDensity],
  )

  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>
}

export function useDensity(): DensityContextValue {
  const context = React.useContext(DensityContext)
  if (!context) {
    throw new Error('useDensity must be used within a DensityProvider')
  }
  return context
}
