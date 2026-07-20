import * as React from 'react'
import { cn } from '@/lib/utils'

/** Home section wrapper (UX Spec §6) — H2 header with optional count + action. */
export function Section({
  title,
  count,
  action,
  className,
  children,
}: {
  title: string
  count?: number
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('mt-8', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="hl-h2">
          {title}
          {count !== undefined ? (
            <span className="hl-body ml-1.5 text-hl-fg-tertiary">({count})</span>
          ) : null}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
