'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * Command registry (UX Spec §4.2). Surfaces register context-aware commands and
 * navigation targets; the palette reads them. Infrastructure only — no product
 * commands live here.
 */
export type CommandGroup = 'navigate' | 'action' | 'ask'

export interface CommandItem {
  id: string
  group: CommandGroup
  label: string
  icon?: LucideIcon
  keywords?: string[]
  shortcut?: string
  perform: () => void
}

interface CommandRegistryValue {
  items: CommandItem[]
  register: (items: CommandItem[]) => () => void
}

const CommandRegistryContext = React.createContext<CommandRegistryValue | null>(null)

export function CommandRegistryProvider({ children }: { children: React.ReactNode }) {
  const [registrations, setRegistrations] = React.useState<Map<number, CommandItem[]>>(
    () => new Map(),
  )
  const idRef = React.useRef(0)

  const register = React.useCallback((items: CommandItem[]) => {
    const id = (idRef.current += 1)
    setRegistrations((prev) => {
      const next = new Map(prev)
      next.set(id, items)
      return next
    })
    return () => {
      setRegistrations((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  const items = React.useMemo(
    () => Array.from(registrations.values()).flat(),
    [registrations],
  )

  const value = React.useMemo<CommandRegistryValue>(() => ({ items, register }), [items, register])

  return (
    <CommandRegistryContext.Provider value={value}>{children}</CommandRegistryContext.Provider>
  )
}

export function useCommandRegistry(): CommandRegistryValue {
  const context = React.useContext(CommandRegistryContext)
  if (!context) {
    throw new Error('useCommandRegistry must be used within a CommandRegistryProvider')
  }
  return context
}

/** Register a surface's commands for the lifetime of the calling component. */
export function useRegisterCommands(items: CommandItem[]): void {
  const { register } = useCommandRegistry()
  const itemsRef = React.useRef(items)
  itemsRef.current = items
  React.useEffect(() => register(itemsRef.current), [register])
}
