import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Empty state (Design Bible §4.10 / UX §4.5). Two kinds:
 *  - `first-run`  — no data ever: Fraunces headline + one line + a primary CTA.
 *  - `zero-results` — filters/search: H2 + active filter chips (children) +
 *    "Clear filters" / "Ask AI to broaden" actions.
 * An empty screen is an invitation to act — always offer the next step.
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'first-run' | 'zero-results'
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
}

export function EmptyState({
  variant = 'first-run',
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 px-6 py-16 text-center',
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon className="size-6 text-hl-fg-tertiary" strokeWidth={1.5} aria-hidden />
      ) : null}
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className={variant === 'first-run' ? 'hl-display' : 'hl-h2'}>{title}</h2>
        {description ? <p className="hl-body text-hl-fg-secondary">{description}</p> : null}
      </div>
      {children}
      {action || secondaryAction ? (
        <div className="flex items-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
