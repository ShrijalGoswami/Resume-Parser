'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '../lib/use-online-status'

/**
 * Offline banner (Design Bible §4.10 / UX §4.5). A calm amber top-bar strip when
 * the backend is unreachable — never a dead white screen. Auto-hides on
 * reconnect. Render at the top of the shell.
 */
export function OfflineBanner({ className }: { className?: string }) {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'hl-small flex items-center justify-center gap-2 bg-hl-warning-bg py-1.5 text-hl-warning',
        className,
      )}
    >
      <span className="inline-block size-1.5 animate-pulse rounded-full bg-[color:var(--hl-warning)]" />
      Can&rsquo;t reach HireLens — reconnecting&hellip;
    </div>
  )
}
