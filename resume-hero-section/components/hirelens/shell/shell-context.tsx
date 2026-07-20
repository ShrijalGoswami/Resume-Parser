'use client'

import * as React from 'react'

/**
 * Shell state (Design Bible Part V). Owns the cross-surface UI state the shell,
 * command palette (§4.2), and Copilot rail (§4.3) share, plus the global
 * keyboard spine: ⌘K opens the palette, ⌘J toggles the rail. Nav-collapse is
 * persisted per user.
 */
interface ShellContextValue {
  navCollapsed: boolean
  setNavCollapsed: (value: boolean) => void
  toggleNav: () => void
  commandOpen: boolean
  setCommandOpen: (value: boolean) => void
  railOpen: boolean
  setRailOpen: (value: boolean) => void
  toggleRail: () => void
}

const ShellContext = React.createContext<ShellContextValue | null>(null)

const NAV_STORAGE_KEY = 'hl-nav-collapsed'

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [navCollapsed, setNavCollapsedState] = React.useState(false)
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [railOpen, setRailOpen] = React.useState(false)

  React.useEffect(() => {
    const stored = window.localStorage.getItem(NAV_STORAGE_KEY)
    if (stored === '1' || stored === '0') {
      setNavCollapsedState(stored === '1')
    }
  }, [])

  const setNavCollapsed = React.useCallback((value: boolean) => {
    setNavCollapsedState(value)
    window.localStorage.setItem(NAV_STORAGE_KEY, value ? '1' : '0')
  }, [])

  const toggleNav = React.useCallback(() => {
    setNavCollapsedState((current) => {
      const next = !current
      window.localStorage.setItem(NAV_STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }, [])

  const toggleRail = React.useCallback(() => setRailOpen((open) => !open), [])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (key === 'k') {
        event.preventDefault()
        setCommandOpen((open) => !open)
      } else if (key === 'j') {
        event.preventDefault()
        setRailOpen((open) => !open)
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
      railOpen,
      setRailOpen,
      toggleRail,
    }),
    [navCollapsed, setNavCollapsed, toggleNav, commandOpen, railOpen, toggleRail],
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
