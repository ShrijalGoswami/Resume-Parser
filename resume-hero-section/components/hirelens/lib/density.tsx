'use client'

import * as React from 'react'
import { usePersistedState } from './use-persisted-state'

/**
 * Density preference (Design Bible §2.1) — a global user setting, persisted.
 * The V3 shell reflects it onto the `.hl` root as `data-hl-density`, which
 * drives the `--hl-control-h-*` / `--hl-*-pad` / `--hl-row-h` / `--hl-avatar`
 * scale in globals.css. Components read those variables, so most never need
 * this context directly.
 */
export type Density = 'comfortable' | 'compact'

function isDensity(value: string | null): value is Density {
  return value === 'comfortable' || value === 'compact'
}

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
  const [density, setDensity] = usePersistedState<Density>(
    'hl-density',
    defaultDensity,
    isDensity,
  )

  const toggleDensity = React.useCallback(() => {
    setDensity(density === 'comfortable' ? 'compact' : 'comfortable')
  }, [density, setDensity])

  const value = React.useMemo<DensityContextValue>(
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
