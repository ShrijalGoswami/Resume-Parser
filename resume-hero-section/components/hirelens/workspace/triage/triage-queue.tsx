'use client'

import * as React from 'react'
import { ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '../../ui/avatar'
import { focusBand, isContradiction } from './triage-grouping'
import type { CandidateRow } from '@/lib/candidate'

export type TriageAction = 'advance' | 'reject' | 'shortlist' | 'deeper'

const ACTIONS: { action: TriageAction; label: string; key: string }[] = [
  { action: 'advance', label: 'Advance', key: 'A' },
  { action: 'reject', label: 'Reject', key: 'R' },
  { action: 'shortlist', label: 'Shortlist', key: 'S' },
  { action: 'deeper', label: 'Deeper', key: 'D' },
]

/** A number + Focus-scale bar + label — never color alone. */
function ScoreReadout({ score }: { score: number | null }) {
  const band = focusBand(score)
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-7 text-right font-hl-mono text-sm tabular-nums text-hl-fg">
        {score ?? '—'}
      </span>
      <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-hl-muted sm:block">
        <span
          className={cn('block h-full rounded-full', band.bar)}
          style={{ width: `${Math.max(0, Math.min(100, score ?? 0))}%` }}
        />
      </span>
      <span className={cn('hidden font-hl-mono text-[10px] uppercase tracking-wider md:inline', band.text)}>
        {band.label}
      </span>
    </div>
  )
}

function QueueRow({
  row,
  focused,
  onFocus,
  onAction,
}: {
  row: CandidateRow
  focused: boolean
  onFocus: () => void
  onAction: (action: TriageAction) => void
}) {
  const uncertain = row.hire === 'Maybe' || row.hire === 'Unrated' || isContradiction(row)
  const note = row.summary || row.recommendationText || row.matchCategory || 'No summary yet.'

  return (
    <div
      role="option"
      aria-selected={focused}
      onMouseEnter={onFocus}
      className={cn(
        'flex items-center gap-4 py-3 pl-4 pr-4 outline-none transition-colors',
        focused ? 'bg-hl-subtle' : 'hover:bg-hl-subtle/60',
      )}
    >
      <span
        aria-hidden
        className={cn('h-8 w-0.5 shrink-0 rounded-full', focused ? 'bg-hl-accent' : 'bg-transparent')}
      />
      <Avatar name={row.name} size={28} />
      <span className="hl-body-medium w-40 shrink-0 truncate text-hl-fg">{row.name}</span>
      <ScoreReadout score={row.overallScore} />

      <div className="flex min-w-0 flex-1 items-center justify-end">
        {focused ? (
          <div className="flex items-center gap-1">
            {ACTIONS.map((a) => (
              <button
                key={a.action}
                type="button"
                onClick={() => onAction(a.action)}
                className="group flex items-center gap-1 rounded-hl-sm px-2 py-1 text-hl-fg-secondary outline-none transition-colors hover:bg-hl-muted hover:text-hl-fg"
              >
                <span className="hl-small">{a.label}</span>
                <span className="font-hl-mono text-[10px] text-hl-fg-tertiary">({a.key})</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="hl-small flex items-center gap-2 truncate text-hl-fg-secondary">
            {uncertain ? (
              <span className="shrink-0 rounded-hl-sm bg-hl-muted px-1.5 py-0.5 font-hl-mono text-[10px] uppercase tracking-wide text-hl-fg-tertiary">
                AI unsure
              </span>
            ) : null}
            <span className="truncate">{note}</span>
          </p>
        )}
      </div>
    </div>
  )
}

export interface TriageQueueProps {
  rows: CandidateRow[]
  focusedIndex: number
  onFocusRow: (index: number) => void
  onAction: (row: CandidateRow, action: TriageAction) => void
}

/** The NEEDS YOU queue — the human-judgment core of Triage. Keyboard-first (A/R/S/D). */
export function TriageQueue({ rows, focusedIndex, onFocusRow, onAction }: TriageQueueProps) {
  const [open, setOpen] = React.useState(true)
  if (rows.length === 0) return null

  return (
    <section className="overflow-hidden rounded-hl-xl border border-hl-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 bg-hl-subtle px-4 py-3 outline-none"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-hl-mono text-[11px] uppercase tracking-widest text-hl-fg">
          <span className="size-1.5 rounded-full bg-hl-accent" aria-hidden />
          Needs you
          <span className="text-hl-fg-tertiary">· {rows.length} remaining</span>
        </span>
        <ChevronUp
          className={cn('size-4 text-hl-fg-tertiary transition-transform', !open && 'rotate-180')}
          aria-hidden
        />
      </button>
      {open ? (
        <div role="listbox" aria-label="Decisions that need you" className="divide-y divide-hl-border-subtle">
          {rows.map((row, i) => (
            <QueueRow
              key={row.id}
              row={row}
              focused={i === focusedIndex}
              onFocus={() => onFocusRow(i)}
              onAction={(action) => onAction(row, action)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}
