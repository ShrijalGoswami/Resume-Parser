'use client'

import { Search } from 'lucide-react'
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
        aria-label="Search or run a command"
        aria-keyshortcuts="Meta+K Control+K"
        className="hl-small inline-flex h-8 items-center gap-2 rounded-hl-md border border-hl-border bg-hl-subtle px-2.5 text-hl-fg-tertiary outline-none transition-colors hover:text-hl-fg-secondary"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">Search or ask&hellip;</span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </button>

      <Notifications unreadCount={unreadCount} />
    </header>
  )
}
