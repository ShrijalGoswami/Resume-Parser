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
        'flex flex-col items-center justify-center gap-5 px-6 py-20 text-center',
        className,
      )}
      {...props}
    >
      {/* The icon sits on a raised plate inside an ambient halo — a faint
          instrument grid dissolving into a prism bloom. An empty screen is
          the product's first impression as often as not; it should read as
          composed, not as an absence. */}
      {Icon ? (
        <span
          className="hl-empty-halo grid size-16 place-items-center rounded-hl-xl border border-hl-border bg-hl-canvas text-hl-accent-text shadow-[var(--hl-shadow-sm)]"
          aria-hidden
        >
          <Icon className="size-7" strokeWidth={1.5} />
        </span>
      ) : null}
      <div className="flex max-w-lg flex-col gap-2.5">
        {/* An empty screen has the reader's whole attention and nothing to
            compete with. It should be the focal point of the page, not an
            apology in the middle of it — so the title takes a page-heading
            step and the explanation takes the lead body step. */}
        <h2 className={variant === 'first-run' ? 'hl-display' : 'hl-h1'}>{title}</h2>
        {description ? (
          <p className="hl-body-lg text-hl-fg-secondary">{description}</p>
        ) : null}
      </div>
      {children}
      {action || secondaryAction ? (
        // The CTA is the point of the state — give it the large control size.
        <div className="mt-1 flex items-center gap-3 [&_button]:h-hl-control-lg [&_button]:px-5 [&_a]:h-hl-control-lg">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
