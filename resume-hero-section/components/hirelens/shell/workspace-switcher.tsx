'use client'

import { cn } from '@/lib/utils'

/**
 * Workspace area (Design Bible §5.4). Shows the product mark and workspace name;
 * becomes a switcher when more than one workspace is available (wired when org
 * data lands). Kept in the UI (Inter) voice — Fraunces is reserved for editorial
 * moments, not persistent chrome.
 */
export function WorkspaceSwitcher({
  collapsed = false,
  workspaceName = 'HireLens',
}: {
  collapsed?: boolean
  workspaceName?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-hl-md bg-hl-accent text-white"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {collapsed ? null : (
        <span className="truncate text-sm font-semibold tracking-tight text-hl-fg">
          {workspaceName}
        </span>
      )}
    </div>
  )
}
