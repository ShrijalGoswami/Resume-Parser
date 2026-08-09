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
    <header className="sticky top-0 z-[var(--hl-z-sticky)] flex h-[var(--hl-topbar-h)] shrink-0 items-center gap-3 border-b border-hl-border-subtle bg-hl-canvas px-4">
      {/*
        The trail itself is hidden below `sm`, but this spacer keeps `flex-1` so the
        launcher and account controls stay pinned right at every width.

        Why hide it: at 390px the ⌘K launcher takes 45vw of a ~334px header, leaving
        ~71px for the crumbs — enough to truncate each one to roughly 12px of
        unreadable text rather than convey anything. Nothing is lost, because every
        surface repeats the same label as its in-content `<h1>` a few pixels below
        and the rail marks the active section.
      */}
      <div className="min-w-0 flex-1">
        <div className="hidden sm:block">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <Breadcrumbs items={breadcrumbs} />
          ) : title ? (
            // Chrome context label, not the page heading — the page's <h1> is the
            // in-content PageHeader, so this stays a muted, quiet wayfinding label.
            <span className="hl-body-medium truncate text-hl-fg-secondary">{title}</span>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label="Search or ask HireLens"
        aria-keyshortcuts="Meta+K Control+K"
        // Search is the shell's most-used affordance — it gets a real control
        // height, a full-size icon, and a placeholder at body size rather than
        // the caption it was.
        // Was `hl-prism-focus` — a violet→cyan gradient ring on focus. V2 §3.9
        // has exactly one focus treatment: a flat copper outline. The launcher
        // is chrome, and chrome does not get the AI identity.
        className="group inline-flex h-hl-control-md w-80 max-w-[45vw] items-center gap-2.5 rounded-hl-md border border-hl-border bg-hl-subtle px-3.5 text-left outline-none transition-[background-color,border-color,box-shadow] duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)] hover:border-hl-border-strong hover:bg-hl-canvas hover:shadow-[var(--hl-shadow-sm)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hl-focus-ring,var(--hl-accent-secondary))]"
      >
        {/* Was a prism sparkle "marking the AI-aware entry point". V2 §8/§23
            removes it: this control is a SEARCH field first — that is what a
            recruiter comes here to do — and labelling it with the AI glyph
            advertised the technology rather than the task. A magnifier says
            what the control does, and the placeholder already says it also
            answers questions. */}
        <Search
          className="size-hl-icon-md shrink-0 text-hl-fg-tertiary transition-colors duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)] group-hover:text-hl-fg-secondary"
          aria-hidden
        />
        <span className="hl-body flex-1 truncate text-hl-fg-tertiary">
          Search or ask HireLens&hellip;
        </span>
        <Kbd className="hidden shrink-0 sm:inline-flex">⌘K</Kbd>
      </button>

      <Notifications unreadCount={unreadCount} />
    </header>
  )
}
