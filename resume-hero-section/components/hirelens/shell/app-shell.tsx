'use client'

import * as React from 'react'
import { LeftNav } from './left-nav'
import { TopBar, type TopBarProps } from './top-bar'
import { SkipLink } from './skip-link'
import { OfflineBanner } from '../states/offline-banner'
import { CommandPalette } from '../command-palette/command-palette'
import type { AccountMenuProps } from './account-menu'

/**
 * App shell (Design Bible §4.1, Part V). Composes the nav rail, top bar, and an
 * independently scrolling content region. `rail` is the slot for the Copilot
 * rail (push ≥1440 / overlay < 1440), supplied by the surface.
 */
export interface AppShellProps extends TopBarProps {
  children: React.ReactNode
  rail?: React.ReactNode
  account?: AccountMenuProps
}

export function AppShell({ children, rail, account, ...topBarProps }: AppShellProps) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-hl-canvas text-hl-fg">
      <SkipLink />
      <LeftNav account={account} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <TopBar {...topBarProps} />
        <main id="hl-main" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
          {children}
        </main>
      </div>
      {rail}
      <CommandPalette />
    </div>
  )
}
