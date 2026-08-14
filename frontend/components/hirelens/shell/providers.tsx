'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { AnnouncerProvider } from '../lib/use-announcer'
import { TooltipProvider } from '../ui/tooltip'
import { Toaster } from '../ui/toast'
import { CommandRegistryProvider } from '../command-palette/command-registry'
import { ApiProvider } from '../lib/api/query-client'
import { BillingCheckoutProvider } from '../billing'
import { ShellProvider } from './shell-context'

/**
 * The `.hl` scope root. Carries the font variables and the `.hl` scope that
 * every product token resolves against. Toaster mounts here so toasts resolve
 * V3 tokens.
 */
function HireLensRoot({
  fontClassName,
  children,
}: {
  fontClassName: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('hl min-h-dvh', fontClassName)}>
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
      <AnnouncerProvider>
        <TooltipProvider>
          <CommandRegistryProvider>
            <ShellProvider>
              {/* Every upgrade CTA in the product — a locked button, a lock
                  panel, a quota wall, a 402 from an action — resolves to this
                  one dialog, which now carries a real checkout. It mounts the
                  upgrade dialog itself and supplies its `onCheckout`, so no
                  lock, meter or button changed to gain a purchase path. */}
              <BillingCheckoutProvider>
                <HireLensRoot fontClassName={fontClassName}>{children}</HireLensRoot>
              </BillingCheckoutProvider>
            </ShellProvider>
          </CommandRegistryProvider>
        </TooltipProvider>
      </AnnouncerProvider>
    </ApiProvider>
  )
}
