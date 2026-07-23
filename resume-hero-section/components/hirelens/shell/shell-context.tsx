'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { usePersistedState } from '../lib/use-persisted-state'
import { primaryNav } from './nav-config'

function isBit(value: string | null): value is '0' | '1' {
  return value === '0' || value === '1'
}

/** Second key of each nav go-to chord (`g` then key) → destination href. */
const GOTO_MAP: Record<string, string> = Object.fromEntries(
  primaryNav
    .filter((item) => item.shortcut)
    .map((item) => [item.shortcut!.split(' ')[1]!.toLowerCase(), item.href]),
)

/** True when the event target is a text field, so global chords stay dormant. */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable === true
  )
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
  const router = useRouter()
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

  // Go-to chords (`g` then a nav key) power the rail's hover key-hints. Dormant
  // in text fields, while the palette is open, or when a modifier is held.
  React.useEffect(() => {
    let armed = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const disarm = () => {
      armed = false
      if (timer) clearTimeout(timer)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return disarm()
      if (commandOpen || isEditableTarget(event.target)) return disarm()
      const key = event.key.toLowerCase()
      if (!armed) {
        if (key === 'g') {
          armed = true
          timer = setTimeout(disarm, 1200)
        }
        return
      }
      // Second keystroke of the chord.
      disarm()
      const href = GOTO_MAP[key]
      if (href) {
        event.preventDefault()
        router.push(href)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (timer) clearTimeout(timer)
    }
  }, [commandOpen, router])

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
