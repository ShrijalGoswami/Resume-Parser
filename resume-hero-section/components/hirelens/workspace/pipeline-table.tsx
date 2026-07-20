'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { ScoreMeter } from '../domain/score-meter'
import { HireBadge } from './hire-badge'
import { StageMenu } from './stage-menu'
import { relativeTime } from '../lib/format'
import type { CandidateRow } from '@/lib/candidate'
import type { PipelineStage } from '@/types/campaign'

/**
 * Pipeline table (UX Spec §7.2) — the default, dense view. Virtualized so it
 * stays smooth on large roles (Design Bible §4.8 / §12: virtualize ≥100 rows).
 * Rows render inside a scroll container using the padding-row technique, which
 * keeps native table layout, column alignment, and the sticky header intact.
 */
export interface PipelineTableProps {
  rows: CandidateRow[]
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onStageChange: (id: string, stage: PipelineStage) => void
  onOpenCandidate: (id: string) => void
}

const COLUMN_COUNT = 8

export function PipelineTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  onStageChange,
  onOpenCandidate,
}: PipelineTableProps) {
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id))
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // react-virtual returns fresh functions each render; the React Compiler can't
  // memoize them and simply skips compiling this component — safe and expected.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 49,
    overscan: 12,
    getItemKey: (index) => rows[index]?.id ?? index,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
      : 0

  return (
    <div
      ref={scrollRef}
      className="max-h-[calc(100dvh-17rem)] overflow-auto rounded-hl-lg border border-hl-border"
    >
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-hl-subtle">
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
          {paddingTop > 0 ? (
            <tr aria-hidden>
              <td colSpan={COLUMN_COUNT} style={{ height: paddingTop }} />
            </tr>
          ) : null}
          {virtualItems.map((item) => {
            const row = rows[item.index]
            return (
              <tr
                key={row.id}
                data-index={item.index}
                ref={virtualizer.measureElement}
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
                    <button
                      type="button"
                      onClick={() => onOpenCandidate(row.id)}
                      className="min-w-0 text-left outline-none"
                    >
                      <p className="hl-body-medium truncate hover:underline">{row.name}</p>
                      {row.matchCategory ? (
                        <p className="hl-caption truncate text-hl-fg-tertiary">
                          {row.matchCategory}
                        </p>
                      ) : null}
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2">
                  {row.overallScore !== null ? (
                    <ScoreMeter score={row.overallScore} showLabel={false} />
                  ) : row.status === 'awaiting' || row.status === 'analyzing' ? (
                    <span
                      className="hl-skeleton inline-block h-3 w-16 rounded-full"
                      aria-label="Analyzing"
                    />
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
                  <StageMenu
                    stage={row.raw.stage}
                    onChange={(stage) => onStageChange(row.id, stage)}
                  />
                </td>
                <td className="px-3 py-2">
                  <HireBadge hire={row.hire} />
                </td>
                <td className="hl-caption px-3 py-2 text-hl-fg-tertiary">
                  {relativeTime(row.analysisAt ?? row.uploadedAt)}
                </td>
              </tr>
            )
          })}
          {paddingBottom > 0 ? (
            <tr aria-hidden>
              <td colSpan={COLUMN_COUNT} style={{ height: paddingBottom }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
