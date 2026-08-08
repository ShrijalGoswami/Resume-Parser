'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { ScoreMeter } from '../domain/score-meter'
import { DRAWER_FOCUS_KEY } from '../ui/drawer'
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

const COLUMN_COUNT = 9

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
          <tr className="hl-label text-hl-fg-tertiary">
            <th className="w-9 px-3 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all candidates"
                className="size-3.5 accent-[var(--hl-accent-solid)]"
              />
            </th>
            {/* Standing under the current sort. The audit's score-compression
                finding is the reason this column exists: when ten of twelve
                candidates read "Moderate Match", ORDER is the differentiator
                the reader can trust — V2 §3.6's rule that position, not hue,
                carries a sequence. */}
            <th className="w-10 px-3 py-2 text-right font-medium" aria-label="Position">
              #
            </th>
            <th className="px-3 py-2 font-medium">Candidate</th>
            <th className="px-3 py-2 font-medium">Fit</th>
            {/* Numeric column, right-aligned (V2 §14). */}
            <th className="px-3 py-2 text-right font-medium">ATS</th>
            {/* Matched skills, not "top skills": evidence against THIS role's
                requirements rather than generic résumé keywords. */}
            <th className="px-3 py-2 font-medium">Matched skills</th>
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
                  'hl-body border-t border-hl-border-subtle',
                  // Selected rows take V2 §14's treatment exactly: the muted
                  // step plus a 2px copper left border. The old accent tint
                  // read as "highlighted by the system"; copper-at-the-edge
                  // reads as "held by you", and stays distinct from hover.
                  selected.has(row.id)
                    ? 'bg-hl-muted shadow-[inset_2px_0_0_var(--hl-accent-secondary)]'
                    : 'hover:bg-hl-subtle',
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
                {/* Standing under the current sort — mono, because it is a
                    count, and quiet, because it is context rather than a
                    score. `item.index` is the post-sort position. */}
                <td className="hl-mono px-3 py-2 text-right text-hl-fg-tertiary">
                  {item.index + 1}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={row.name} size={24} />
                    <button
                      type="button"
                      onClick={() => onOpenCandidate(row.id)}
                      // Focus comes back here when the drawer closes. Keyed
                      // rather than left to Radix's node reference because this
                      // table is virtualized — see DRAWER_FOCUS_KEY.
                      {...{ [DRAWER_FOCUS_KEY]: `candidate-${row.id}` }}
                      className="min-w-0 text-left outline-none"
                    >
                      <p className="hl-body-medium truncate hover:underline">{row.name}</p>
                      {/* The one-line reason, not the category. Ten of twelve
                          rows repeating "Moderate Match" said nothing; the
                          analysis summary is the evidence line the audit asked
                          for. The category survives only as a fallback for
                          analyses that produced no summary. */}
                      {row.summary || row.matchCategory ? (
                        <p className="hl-caption max-w-[38ch] truncate text-hl-fg-tertiary">
                          {row.summary ?? row.matchCategory}
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
                {/* Right-aligned numerics (V2 §14), and deliberately tertiary:
                    the audit found ATS values clustering (49 repeated down the
                    column), so the number stays available without pretending
                    to differentiate. */}
                <td className="hl-mono px-3 py-2 text-right text-hl-fg-tertiary">
                  {row.atsScore !== null ? Math.round(row.atsScore) : '—'}
                </td>
                <td className="px-3 py-2">
                  {(() => {
                    // Evidence against this role first; generic top skills only
                    // when the analysis produced no matches to show.
                    const skills = row.matchingSkills.length > 0 ? row.matchingSkills : row.topSkills
                    const shown = skills.slice(0, 3)
                    const rest = skills.length - shown.length
                    return (
                      <div className="flex flex-wrap items-center gap-1">
                        {shown.map((skill) => (
                          <Badge key={skill}>{skill}</Badge>
                        ))}
                        {rest > 0 ? (
                          <span className="hl-mono text-hl-fg-tertiary">+{rest}</span>
                        ) : null}
                      </div>
                    )
                  })()}
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
