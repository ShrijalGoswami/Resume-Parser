'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Theme control (Design Bible §5.6) — a 3-segment light / dark / system control. */
const options: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// True on the client, false during SSR — avoids a hydration mismatch on the
// active segment without a setState-in-effect mount flag.
const emptySubscribe = () => () => {}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const current = isClient ? theme ?? 'system' : 'system'

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-1 rounded-hl-md bg-hl-muted p-1"
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = current === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              'inline-flex size-7 items-center justify-center rounded-hl-sm outline-none transition-colors',
              active
                ? 'bg-hl-canvas text-hl-accent-fg shadow-[var(--hl-shadow-xs)]'
                : 'text-hl-fg-tertiary hover:text-hl-fg',
            )}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
}
