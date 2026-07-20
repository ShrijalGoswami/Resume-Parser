'use client'

import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu'
import { ALL_STAGES, STAGE_LABELS } from './stages'
import type { PipelineStage } from '@/types/campaign'

/** Inline stage control — the keyboard/pointer path for moving a candidate. */
export function StageMenu({
  stage,
  onChange,
}: {
  stage: PipelineStage
  onChange: (stage: PipelineStage) => void
}) {
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
