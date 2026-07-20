'use client'

import { Rows3, Rows4 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDensity, type Density } from '../lib/density'

/** Density control (Design Bible §2.1) — comfortable / compact. */
const options: { value: Density; label: string; icon: typeof Rows3 }[] = [
  { value: 'comfortable', label: 'Comfortable', icon: Rows3 },
  { value: 'compact', label: 'Compact', icon: Rows4 },
]

export function DensityToggle() {
  const { density, setDensity } = useDensity()

  return (
    <div
      role="radiogroup"
      aria-label="Density"
      className="inline-flex items-center gap-1 rounded-hl-md bg-hl-muted p-1"
    >
      {options.map((option) => {
        const Icon = option.icon
        const active = density === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            onClick={() => setDensity(option.value)}
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
