'use client'

import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'
import { useCan, PERMS } from '../lib/use-can'
import { ALL_STAGES, STAGE_LABELS } from './stages'
import type { PipelineStage } from '@/types/campaign'

/**
 * Inline stage control — the keyboard/pointer path for moving a candidate.
 *
 * Moving a candidate is `candidate.manage` (`PATCH …/stage`). Without it the
 * control degrades to a plain label rather than disappearing: which stage a
 * candidate sits in is information an interviewer is entitled to, it is only
 * the changing of it that they are not. Gated here rather than at the two call
 * sites (pipeline table row, candidate overview) so neither can forget.
 */
export function StageMenu({
  stage,
  onChange,
}: {
  stage: PipelineStage
  onChange: (stage: PipelineStage) => void
}) {
  const canManage = useCan(PERMS.CANDIDATE_MANAGE)

  if (!canManage) {
    return (
      <span className="hl-small inline-flex items-center rounded-hl-sm border border-hl-border-subtle px-2 py-0.5 text-hl-fg-secondary">
        {STAGE_LABELS[stage]}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hl-small inline-flex items-center gap-1 rounded-hl-sm border border-hl-border px-2 py-0.5 text-hl-fg-secondary outline-none transition-colors hover:text-hl-fg"
        >
          {STAGE_LABELS[stage]}
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ALL_STAGES.map((option) => (
          <DropdownMenuItem key={option} onSelect={() => onChange(option)}>
            {STAGE_LABELS[option]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
