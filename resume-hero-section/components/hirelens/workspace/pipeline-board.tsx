'use client'

import { CandidateCard } from './candidate-card'
import { BOARD_STAGES, STAGE_LABELS } from './stages'
import type { CandidateRow } from '@/lib/candidate'

/**
 * Pipeline board (UX Spec §7.2). Columns are stages; candidates grouped
 * client-side by `stage`. Stage moves happen via the table's stage control /
 * card menu — drag-and-drop is a follow-on enhancement (the spec's documented
 * fallback is the stage dropdown).
 */
export interface PipelineBoardProps {
  rows: CandidateRow[]
  selected: Set<string>
  onToggle: (id: string) => void
}

export function PipelineBoard({ rows, selected, onToggle }: PipelineBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {BOARD_STAGES.map((stage) => {
        const items = rows.filter((row) => row.raw.stage === stage)
        return (
          <div key={stage} className="flex w-64 shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="hl-body-medium">{STAGE_LABELS[stage]}</span>
              <span className="hl-caption rounded-full bg-hl-muted px-1.5 text-hl-fg-tertiary">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((row) => (
                <CandidateCard
                  key={row.id}
                  row={row}
                  selected={selected.has(row.id)}
                  onToggleSelect={() => onToggle(row.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
