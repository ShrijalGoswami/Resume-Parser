'use client'

import Link from 'next/link'
// MessageSquareText, not Sparkles (V2 §8/§23) — the same glyph the palette and
// `nav-config` already use for Ask. It names the act of asking a question, not
// the technology answering it.
import { Search, MessageSquareText } from 'lucide-react'
import { useShell } from './shell-context'
import { useCan, PERMS } from '../lib/use-can'
import { Kbd } from '../ui/kbd'
import { Notifications } from './notifications'
import { Breadcrumbs, type Crumb } from './breadcrumbs'

/**
 * Top bar (Design Bible §5.2) — 52px, sticky. Breadcrumb/title on the left; the
 * ⌘K launcher (the product's single search/command entry), the Ask entry point,
 * notifications, and account on the right.
 */
export interface TopBarProps {
  breadcrumbs?: Crumb[]
  title?: string
  unreadCount?: number
}

export function TopBar({ breadcrumbs, title, unreadCount }: TopBarProps) {
  const { setCommandOpen } = useShell()
  /*
    Same rule as the command palette (`command-palette.tsx`): every Ask request
    is `ai.use` server-side, so without the permission the offer is withdrawn
    rather than made and broken. `useCan` reads "not known yet" as false, so the
    control appears on resolve instead of flashing and withdrawing.

    Permission HIDES; the `ai_copilot` entitlement does NOT — a plan lock is
    shown, not hidden, so the customer can discover the feature exists
    (`nav-config.ts`). `/ask` still gates itself on both, so this is
    discoverability, never access control.
  */
  const canAsk = useCan(PERMS.AI_USE)

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
        {/*
          The org's own name is what drops below `sm`, and only there.

          At 390 the launcher is capped at 45vw (176px), which leaves 116px for
          a placeholder needing 163px — it rendered "Search or ask HireLen…".
          Widening was measured first and cannot solve it: the flex spacer to
          the left is 17px at that width (the breadcrumb trail is already
          hidden), so even consuming all of it leaves 137px, still short.

          So the one redundant word goes instead. "HireLens" tells a reader
          inside HireLens nothing; "Search or ask" is the whole proposition —
          that this control does both — and that survives intact. The button's
          `aria-label` above is unchanged at every width, so the accessible
          name stays "Search or ask HireLens" whatever is painted here.
        */}
        <span className="hl-body flex-1 truncate text-hl-fg-tertiary">
          <span className="sm:hidden">Search or ask&hellip;</span>
          <span className="hidden sm:inline">Search or ask HireLens&hellip;</span>
        </span>
        <Kbd className="hidden shrink-0 sm:inline-flex">⌘K</Kbd>
      </button>

      {/*
        Ask is reachable from ⌘K, but a keystroke is not an entry point a
        recruiter discovers — Phase 9.1 moved Ask off the rail on the strength of
        contextual entry points that do not exist yet, which left the Copilot
        with no visible door. This is that door. ⌘K is untouched and stays what
        it is: search and navigation.

        The label is hidden below `md` for the same reason the breadcrumb trail
        is: at 390px the ⌘K launcher already takes 45vw, and two words of chrome
        would push the bell off the bar. The icon keeps its accessible name.
      */}
      {canAsk ? (
        <Link
          href="/ask"
          aria-label="Ask HireLens"
          className="inline-flex h-hl-control-md shrink-0 items-center gap-2 rounded-hl-md px-2.5 text-hl-fg-secondary outline-none transition-colors duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)] hover:bg-hl-subtle hover:text-hl-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hl-focus-ring,var(--hl-accent-secondary))]"
        >
          <MessageSquareText className="size-[18px] shrink-0" aria-hidden />
          <span className="hl-body-medium hidden md:inline">Ask</span>
        </Link>
      ) : null}

      <Notifications unreadCount={unreadCount} />
    </header>
  )
}
