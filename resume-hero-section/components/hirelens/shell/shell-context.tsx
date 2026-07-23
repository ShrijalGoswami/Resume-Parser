'use client'

import * as React from 'react'
import { usePersistedState } from '../lib/use-persisted-state'

function isBit(value: string | null): value is '0' | '1' {
  return value === '0' || value === '1'
}

/**
 * Shell state (Design Bible Part V). Owns the cross-surface UI state the shell
 * and command palette (§4.2) share, plus the global keyboard spine: ⌘K opens
 * the palette. Nav-collapse is persisted per user.
 */
interface ShellContextValue {
  navCollapsed: boolean
  setNavCollapsed: (value: boolean) => void
  toggleNav: () => void
  commandOpen: boolean
  setCommandOpen: (value: boolean) => void
}

const ShellContext = React.createContext<ShellContextValue | null>(null)

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [navBit, setNavBit] = usePersistedState<'0' | '1'>('hl-nav-collapsed', '0', isBit)
  const navCollapsed = navBit === '1'
  const [commandOpen, setCommandOpen] = React.useState(false)

  const setNavCollapsed = React.useCallback(
    (value: boolean) => setNavBit(value ? '1' : '0'),
    [setNavBit],
  )

  const toggleNav = React.useCallback(
    () => setNavBit(navBit === '1' ? '0' : '1'),
    [navBit, setNavBit],
  )

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (key === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = React.useMemo<ShellContextValue>(
    () => ({
      navCollapsed,
      setNavCollapsed,
      toggleNav,
      commandOpen,
      setCommandOpen,
    }),
    [navCollapsed, setNavCollapsed, toggleNav, commandOpen],
  )

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShell(): ShellContextValue {
  const context = React.useContext(ShellContext)
  if (!context) {
    throw new Error('useShell must be used within a ShellProvider')
  }
  return context
}
