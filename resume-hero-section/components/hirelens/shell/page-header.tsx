import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * PageHeader — the single page-header pattern used across Home, Roles, Talent,
 * Ask, and Settings (UX Spec §5 · Design Bible §2). It gives every authenticated
 * surface the same premium identity: an optional eyebrow, a Fraunces editorial
 * title (the one "major page header" moment the type system reserves), an
 * optional supporting line, right-aligned actions, and an optional row beneath
 * (e.g. a lens switcher). It establishes hierarchy and rhythm; it does not
 * change any workflow, and the dense body below always stays in the UI voice.
 */
export interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  /** A row rendered under the header block (tabs, lens switcher, filters). */
  children?: React.ReactNode
  /** Vertical rhythm below the header. Defaults to a comfortable page gap. */
  spacing?: 'page' | 'compact' | 'none'
  className?: string
}

/* Tightened 30 Jul 2026. On a 1536×695 viewport the header block (31px title +
   16px description + 24px pad + 16px gap) consumed ~100px — 14% of the canvas —
   before a single row of content. Stripe and Linear give a page title far less
   than that. Nothing here changes type size; it closes the air around it. */
const SPACING: Record<NonNullable<PageHeaderProps['spacing']>, string> = {
  page: 'pb-4',
  compact: 'pb-2',
  none: 'pb-0',
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
  spacing = 'page',
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('hl-enter flex flex-col gap-3', SPACING[spacing], className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          {eyebrow ? <p className="hl-caption text-hl-fg-tertiary">{eyebrow}</p> : null}
          <h1 className="hl-display truncate">{title}</h1>
          {description ? (
            <p className="hl-body max-w-2xl text-hl-fg-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
