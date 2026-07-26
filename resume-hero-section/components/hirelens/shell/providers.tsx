'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { DensityProvider, useDensity } from '../lib/density'
import { AnnouncerProvider } from '../lib/use-announcer'
import { TooltipProvider } from '../ui/tooltip'
import { Toaster } from '../ui/toast'
import { CommandRegistryProvider } from '../command-palette/command-registry'
import { ApiProvider } from '../lib/api/query-client'
import { ShellProvider } from './shell-context'

/**
 * The `.hl` scope root. Carries the font variables and reflects the density
 * preference onto `data-hl-density`, which drives the density scale in
 * globals.css. Toaster mounts here so toasts resolve V3 tokens.
 */
function HireLensRoot({
  fontClassName,
  children,
}: {
  fontClassName: string
  children: React.ReactNode
}) {
  const { density } = useDensity()
  return (
    <div className={cn('hl min-h-dvh', fontClassName)} data-hl-density={density}>
      {children}
      <Toaster />
    </div>
  )
}

/**
 * Full V3 provider stack, mounted by the `(hirelens)` and `auth` layouts.
 *
 * ThemeProvider is deliberately NOT in this stack — it lives in the root
 * layout. This stack is mounted per route group, so anything here re-mounts
 * when navigating between `/auth/*` and the app; next-themes emits a `<script>`
 * that must only ever be rendered on the server. `useTheme()` still works
 * everywhere because the root provider is an ancestor of both groups.
 */
export function HireLensProviders({
  fontClassName,
  children,
}: {
  fontClassName: string
  children: React.ReactNode
}) {
  return (
    <ApiProvider>
      <DensityProvider>
        <AnnouncerProvider>
          <TooltipProvider>
            <CommandRegistryProvider>
              <ShellProvider>
                <HireLensRoot fontClassName={fontClassName}>{children}</HireLensRoot>
              </ShellProvider>
            </CommandRegistryProvider>
          </TooltipProvider>
        </AnnouncerProvider>
      </DensityProvider>
    </ApiProvider>
  )
}
