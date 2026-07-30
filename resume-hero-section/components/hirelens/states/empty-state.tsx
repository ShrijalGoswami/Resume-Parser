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
  /**
   * Render inside a bordered panel that fills its column.
   *
   * Use on a PAGE-level empty state. Without it the content is centred on the
   * bare canvas, and on a wide screen that reads as a page still loading — a
   * headline and a button adrift in several hundred pixels of nothing, with
   * the void making the heading look bigger than it is. Inside a panel the
   * same content becomes a deliberate region: the page has an anchor directly
   * under its title, and the empty column is occupied rather than abandoned.
   *
   * Leave it off when the state already sits inside a card, a table or a
   * settings sub-section — two nested borders is worse than none.
   */
  surface?: boolean
}

export function EmptyState({
  variant = 'first-run',
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  surface = false,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 text-center',
        // AN EMPTY STATE IS AN APPLICATION STATE, NOT A HERO.
        // ---------------------------------------------------------------
        // This block used to render a 64px haloed icon plate, a 31px heading
        // (the same step as the page title above it), 18px body copy and 20px
        // gaps — ~370px tall on a 695px viewport, over half the screen, to say
        // "Create your first role". Since most surfaces in a new workspace ARE
        // empty, that one composition is what made the whole product read as
        // oversized. Linear, Stripe and GitHub answer the same moment in
        // ~160px: a small muted glyph, a ~20px heading, one quiet line.
        variant === 'first-run' ? 'py-10' : 'py-7',
        // The panel's border does the work that padding alone used to.
        surface && 'hl-surface rounded-hl-lg border border-hl-border',
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
          className="grid size-10 place-items-center rounded-hl-lg border border-hl-border-subtle bg-hl-subtle text-hl-fg-tertiary"
          aria-hidden
        >
          <Icon className="size-hl-icon-sm" strokeWidth={1.6} />
        </span>
      ) : null}
      <div className="flex max-w-md flex-col gap-1">
        {/* An empty screen has the reader's whole attention and nothing to
            compete with. It should be the focal point of the page, not an
            apology in the middle of it — so the title takes a page-heading
            step and the explanation takes the lead body step. */}
        {/* `hl-h3`. This heading answers "why is this empty?" — it is not the
            page's title and must not compete with the real one right above. */}
        <h2 className="hl-h3">{title}</h2>
        {description ? <p className="hl-small text-hl-fg-secondary">{description}</p> : null}
      </div>
      {children}
      {action || secondaryAction ? (
        // The CTA is the point of the state — give it the large control size.
        <div className="mt-1 flex items-center gap-2 [&_a]:h-hl-control-md [&_button]:h-hl-control-md [&_button]:px-4">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}
