'use client'

import { ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Workspace switcher (Stitch RC-1 · Design Bible §5.4). A lettermark tile, the
 * workspace name, and a mono role sub-label, with an `unfold_more` affordance —
 * it becomes an active switcher when multi-workspace org data lands. Kept in the
 * UI (Inter) voice; the mono role label uses the readout family. When collapsed
 * only the tile shows.
 */
export function WorkspaceSwitcher({
  collapsed = false,
  workspaceName = 'Hirevo',
  role = 'Recruiter',
}: {
  collapsed?: boolean
  workspaceName?: string
  role?: string
}) {
  const initial = workspaceName.trim().charAt(0).toUpperCase() || 'H'

  const tile = (
    <span
      // Inter, not mono (V2 §4): the workspace monogram is identity chrome,
      // not data. Same rule for the role caption below.
      className="flex size-hl-control-md shrink-0 items-center justify-center rounded-hl-md border border-hl-border-strong bg-hl-canvas hl-body-medium text-hl-fg"
      aria-hidden
    >
      {initial}
    </span>
  )

  if (collapsed) {
    return <div className="flex w-full justify-center">{tile}</div>
  }

  return (
    <button
      type="button"
      aria-label={`${workspaceName} workspace`}
      className="group flex w-full items-center justify-between gap-2 rounded-hl-md px-2 py-1.5 outline-none transition-colors hover:bg-hl-muted"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {tile}
        <span className="flex min-w-0 flex-col text-left">
          <span className="truncate hl-body-medium text-hl-fg">
            {workspaceName}
          </span>
          <span className="truncate hl-label text-hl-fg-secondary">
            {role}
          </span>
        </span>
      </span>
      <ChevronsUpDown
        className={cn(
          'size-3.5 shrink-0 text-hl-fg-tertiary transition-colors group-hover:text-hl-fg',
        )}
        aria-hidden
      />
    </button>
  )
}
