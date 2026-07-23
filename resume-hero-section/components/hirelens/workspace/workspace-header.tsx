'use client'

import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { PageHeader } from '../shell/page-header'
import { LensSwitcher } from './lens-switcher'
import type { Campaign } from '@/types/campaign'

/**
 * Role Workspace header (Design Bible §7.1). Uses the shared PageHeader so the
 * role identity carries the same premium (Fraunces) title as every other
 * surface; status + counts sit on the supporting line, the single primary action
 * (Add candidates) is the header action, and the LensSwitcher rides beneath.
 * Stays sticky. The live forecast chip is deferred (no per-role endpoint yet).
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
    <header className="sticky top-0 z-[var(--hl-z-sticky)] border-b border-hl-border-subtle bg-hl-canvas px-6 py-4">
      <PageHeader
        title={campaign.title}
        spacing="none"
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 capitalize',
                statusColor[campaign.status] ?? 'text-hl-fg-tertiary',
              )}
            >
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              {campaign.status}
            </span>
            <span className="text-hl-fg-tertiary" aria-hidden>
              ·
            </span>
            <span>
              {candidateCount} candidate{candidateCount === 1 ? '' : 's'} · {stageCount} stage
              {stageCount === 1 ? '' : 's'}
            </span>
          </span>
        }
        actions={
          <Button variant="primary" onClick={onAddCandidates}>
            <Plus /> Add candidates
          </Button>
        }
      >
        <LensSwitcher />
      </PageHeader>
    </header>
  )
}
