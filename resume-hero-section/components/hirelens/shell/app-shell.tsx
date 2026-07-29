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
          // `hl-canvas-wash` puts one soft prism bloom behind the content so a
          // sparse screen has atmosphere rather than a flat fill.
          className="hl-canvas-wash flex-1 overflow-y-auto outline-none"
        >
          <div key={pathname} className="hl-route-enter min-h-full">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  )
}
