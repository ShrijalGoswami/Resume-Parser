'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Switch (Design Bible §4.7) — an accessible on/off toggle (`role="switch"`).
 * The focus ring is inherited from the global `.hl :focus-visible` rule.
 */
export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full outline-none transition-colors duration-[var(--hl-dur-fast)] disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-hl-accent' : 'bg-hl-border-strong',
        className,
      )}
    >
      <span
        className={cn(
          'inline-block size-4 rounded-full bg-white transition-transform duration-[var(--hl-dur-fast)]',
          checked ? 'translate-x-5' : 'translate-x-1',
        )}
      />
    </button>
  )
}
