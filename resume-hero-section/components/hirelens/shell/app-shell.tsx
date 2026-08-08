'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { LeftNav } from './left-nav'
import { TopBar, type TopBarProps } from './top-bar'
import { SkipLink } from './skip-link'
import { OfflineBanner } from '../states/offline-banner'
import { CommandPalette } from '../command-palette/command-palette'
import type { AccountMenuProps } from './account-menu'

/**
 * App shell (Design Bible §4.1, Part V). Composes the nav rail, top bar, an
 * independently scrolling content region, and the command palette. AI is
 * contextual (⌘K is the primary entry); there is no persistent AI rail.
 */
export interface AppShellProps extends TopBarProps {
  children: React.ReactNode
  account?: AccountMenuProps
}

export function AppShell({ children, account, ...topBarProps }: AppShellProps) {
  // Keyed on the route so the content region replays its entrance on every
  // navigation. This is a CSS animation on a remounted node — no transition
  // library, no effect on the router, and nothing in the tree below re-renders
  // differently because of it.
  const pathname = usePathname()

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-hl-canvas text-hl-fg">
      <SkipLink />
      <LeftNav account={account} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <TopBar {...topBarProps} />
        <main
          id="hl-main"
          tabIndex={-1}
          // The prism bloom that used to sit here is gone (V2 §2, §23). It was
          // three violet/cyan radial gradients behind every authenticated
          // screen — atmosphere standing in for substance, and it tinted every
          // neutral surface above it, which defeats the point of a neutral
          // ramp. V2's answer to a sparse screen is space and typography.
          className="flex-1 overflow-y-auto outline-none"
        >
          {/* `flex flex-col` is here so a screen can say `flex-1` and actually
              fill the viewport. `min-h-full` alone gives this wrapper a minimum,
              not a DEFINITE height, so a child's `h-full` had nothing to resolve
              against and fell back to its own content height. Talent, Ask and
              Settings each ended ~195px short of the bottom, leaving their
              column dividers stopping in mid-air over the canvas — a seam that
              only shows up once a screen is assembled and under-filled.
              `min-h-full` is kept rather than `h-full` so tall screens still
              grow and scroll instead of being pinned to one viewport. */}
          <div key={pathname} className="hl-route-enter flex min-h-full flex-col">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
