'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '../theme/theme-provider'
import { DensityProvider, useDensity } from '../lib/density'
import { AnnouncerProvider } from '../lib/use-announcer'
import { TooltipProvider } from '../ui/tooltip'
import { Toaster } from '../ui/toast'
import { CommandRegistryProvider } from '../command-palette/command-registry'
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

/** Full V3 provider stack, mounted once by the (hirelens) layout. */
export function HireLensProviders({
  fontClassName,
  children,
}: {
  fontClassName: string
  children: React.ReactNode
}) {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  )
}
