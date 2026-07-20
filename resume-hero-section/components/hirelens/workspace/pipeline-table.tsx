'use client'

import { cn } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { ScoreMeter } from '../domain/score-meter'
import { HireBadge } from './hire-badge'
import { StageMenu } from './stage-menu'
import { relativeTime } from '../lib/format'
import type { CandidateRow } from '@/lib/candidate'
import type { PipelineStage } from '@/types/campaign'

/** Pipeline table (UX Spec §7.2) — the default, dense view. */
export interface PipelineTableProps {
  rows: CandidateRow[]
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onStageChange: (id: string, stage: PipelineStage) => void
}

export function PipelineTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onStageChange,
}: PipelineTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id))

  return (
    <div className="overflow-x-auto rounded-hl-lg border border-hl-border">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 bg-hl-subtle">
          <tr className="hl-caption text-hl-fg-tertiary">
            <th className="w-9 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all candidates"
                className="size-3.5 accent-[var(--hl-accent-solid)]"
              />
            </th>
            <th className="px-3 py-2 font-medium">Candidate</th>
            <th className="px-3 py-2 font-medium">Fit</th>
            <th className="px-3 py-2 font-medium">ATS</th>
            <th className="px-3 py-2 font-medium">Top skills</th>
            <th className="px-3 py-2 font-medium">Stage</th>
            <th className="px-3 py-2 font-medium">Verdict</th>
            <th className="px-3 py-2 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                'hl-small border-t border-hl-border-subtle',
                selected.has(row.id) ? 'bg-hl-accent-subtle' : 'hover:bg-hl-subtle',
              )}
            >
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.has(row.id)}
                  onChange={() => onToggle(row.id)}
                  aria-label={`Select ${row.name}`}
                  className="size-3.5 accent-[var(--hl-accent-solid)]"
                />
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Avatar name={row.name} size={24} />
                  <div className="min-w-0">
                    <p className="hl-body-medium truncate">{row.name}</p>
                    {row.matchCategory ? (
                      <p className="hl-caption truncate text-hl-fg-tertiary">{row.matchCategory}</p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2">
                {row.overallScore !== null ? (
                  <ScoreMeter score={row.overallScore} showLabel={false} />
                ) : row.status === 'awaiting' || row.status === 'analyzing' ? (
                  <span className="hl-skeleton inline-block h-3 w-16 rounded-full" aria-label="Analyzing" />
                ) : (
                  <span className="hl-caption text-hl-fg-tertiary">—</span>
                )}
              </td>
              <td className="hl-mono px-3 py-2">
                {row.atsScore !== null ? Math.round(row.atsScore) : '—'}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {row.topSkills.slice(0, 3).map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2">
                <StageMenu stage={row.raw.stage} onChange={(stage) => onStageChange(row.id, stage)} />
              </td>
              <td className="px-3 py-2">
                <HireBadge hire={row.hire} />
              </td>
              <td className="hl-caption px-3 py-2 text-hl-fg-tertiary">
                {relativeTime(row.analysisAt ?? row.uploadedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
