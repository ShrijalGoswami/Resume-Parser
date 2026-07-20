import * as React from 'react'
import { cn } from '@/lib/utils'

/** Consistent shortcut-hint rendering (Design Bible §4.8 `KBD`). */
export function Kbd({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'hl-mono inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-hl-sm border border-hl-border bg-hl-subtle px-1.5 text-[11px] leading-none text-hl-fg-secondary',
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  )
}
