'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { LensSwitcher } from './lens-switcher'
import type { Campaign } from '@/types/campaign'

/**
 * Role Workspace header (Design Bible §7.1). Title, status, counts, the single
 * primary action (Add candidates), and the LensSwitcher. The live forecast chip
 * is deferred — there is no per-role forecast endpoint yet.
 */
const statusColor: Record<string, string> = {
  active: 'text-hl-success',
  paused: 'text-hl-warning',
  draft: 'text-hl-fg-tertiary',
  archived: 'text-hl-fg-tertiary',
}

export interface WorkspaceHeaderProps {
  campaign: Campaign
  candidateCount: number
  stageCount: number
  onAddCandidates: () => void
}

export function WorkspaceHeader({
  campaign,
  candidateCount,
  stageCount,
  onAddCandidates,
}: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-[var(--hl-z-sticky)] flex flex-col gap-3 border-b border-hl-border-subtle bg-hl-canvas px-6 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="hl-h1 truncate">{campaign.title}</h1>
            <span
              className={cn(
                'hl-caption inline-flex shrink-0 items-center gap-1 capitalize',
                statusColor[campaign.status] ?? 'text-hl-fg-tertiary',
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {campaign.status}
            </span>
          </div>
          <p className="hl-small text-hl-fg-secondary">
            {candidateCount} candidate{candidateCount === 1 ? '' : 's'} · {stageCount} stage
            {stageCount === 1 ? '' : 's'}
          </p>
        </div>
        <Button variant="primary" onClick={onAddCandidates}>
          <Plus /> Add candidates
        </Button>
      </div>
      <LensSwitcher />
    </header>
  )
}
