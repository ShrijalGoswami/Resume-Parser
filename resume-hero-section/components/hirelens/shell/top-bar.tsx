'use client'

import { Sparkles } from 'lucide-react'
import { useShell } from './shell-context'
import { Kbd } from '../ui/kbd'
import { Notifications } from './notifications'
import { Breadcrumbs, type Crumb } from './breadcrumbs'

/**
 * Top bar (Design Bible §5.2) — 52px, sticky. Breadcrumb/title on the left; the
 * ⌘K launcher (the product's single search/command entry), notifications, and
 * account on the right.
 */
export interface TopBarProps {
  breadcrumbs?: Crumb[]
  title?: string
  unreadCount?: number
}

export function TopBar({ breadcrumbs, title, unreadCount }: TopBarProps) {
  const { setCommandOpen } = useShell()

  return (
    <header className="sticky top-0 z-[var(--hl-z-sticky)] flex h-[52px] shrink-0 items-center gap-3 border-b border-hl-border-subtle bg-hl-canvas px-4">
      <div className="min-w-0 flex-1">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} />
        ) : title ? (
          // Chrome context label, not the page heading — the page's <h1> is the
          // in-content PageHeader, so this stays a muted, quiet wayfinding label.
          <span className="hl-body-medium truncate text-hl-fg-secondary">{title}</span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label="Search or ask HireLens"
        aria-keyshortcuts="Meta+K Control+K"
        className="group inline-flex h-8 w-64 max-w-[45vw] items-center gap-2 rounded-hl-md border border-hl-border-subtle bg-hl-subtle px-3 text-left outline-none transition-colors hover:border-hl-border hover:bg-hl-muted"
      >
        {/* Prism sparkle marks this as the AI-aware entry point (§3.3). */}
        <Sparkles
          className="size-4 shrink-0 text-hl-prism-mid opacity-80 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
        <span className="hl-small flex-1 truncate text-hl-fg-tertiary">
          Search or ask HireLens&hellip;
        </span>
        <Kbd className="hidden shrink-0 sm:inline-flex">⌘K</Kbd>
      </button>

      <Notifications unreadCount={unreadCount} />
    </header>
  )
}
