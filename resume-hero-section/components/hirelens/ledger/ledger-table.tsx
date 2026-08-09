'use client'

import * as React from 'react'
import { CircleCheck, TriangleAlert, CircleSlash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataTable, type DataTableColumn } from '../ui/data-table'
import { ConfidenceChip } from '../decision-intelligence/confidence-chip'
import { decisionMeta, fmtDate, fmtTime, decidedAt, actorLabel } from './ledger-meta'
import type { Recommendation } from '@/types/agent'

function DecisionCell({ rec }: { rec: Recommendation }) {
  const meta = decisionMeta(rec.status)
  const Icon = meta.tone === 'positive' ? CircleCheck : meta.tone === 'override' ? TriangleAlert : CircleSlash
  const tone =
    meta.tone === 'positive'
      ? 'text-hl-score-sharp'
      : meta.tone === 'override'
        ? 'text-hl-score-soft'
        : 'text-hl-fg-secondary'
  return (
    <span className="hl-body-medium flex items-center gap-2 text-hl-fg">
      <Icon className={cn('size-4 shrink-0', tone)} aria-hidden />
      {meta.label}
    </span>
  )
}

/** Ledger cells breathe more than the DS default — permanence over density. */
const LEDGER_CELL = 'py-4 align-top'
/* Inter, not mono (V2 §4): a column header is a label. Mono in this table is
   reserved for what is genuinely data — the timestamps and the record id. */
const LEDGER_HEADER = 'py-3 hl-label'

function columnsFor(viewerId?: string | null): DataTableColumn<Recommendation>[] {
  return [
    {
      key: 'date',
      header: 'Decided',
      className: cn(LEDGER_CELL, 'whitespace-nowrap'),
      headerClassName: LEDGER_HEADER,
      render: (rec) => {
        const stamp = decidedAt(rec)
        // No stamp means the decision time was never recorded. Say that, rather
        // than borrowing `created_at` and calling it the decision.
        if (!stamp) {
          return <span className="hl-caption text-hl-fg-tertiary">Not recorded</span>
        }
        return (
          <span className="hl-caption font-hl-mono tabular-nums text-hl-fg-secondary">
            {fmtDate(stamp)}
            <span className="text-hl-fg-tertiary"> · {fmtTime(stamp)}</span>
          </span>
        )
      },
    },
    {
      key: 'decision',
      header: 'Decision',
      className: LEDGER_CELL,
      headerClassName: LEDGER_HEADER,
      render: (rec) => <DecisionCell rec={rec} />,
    },
    {
      key: 'by',
      header: 'By',
      className: cn(LEDGER_CELL, 'whitespace-nowrap'),
      headerClassName: LEDGER_HEADER,
      // `decided_by` IS recorded (migration 0015) and the ledger dropped it —
      // the previous note here claimed "the decider is not recorded", which was
      // wrong. The actor is the point of an audit trail.
      render: (rec) => {
        const who = actorLabel(rec, viewerId)
        return who ? (
          <span className={cn('hl-caption', who === 'You' ? 'text-hl-fg' : 'font-hl-mono text-hl-fg-secondary')}>
            {who}
          </span>
        ) : (
          <span className="hl-caption text-hl-fg-tertiary">Not recorded</span>
        )
      },
    },
    {
      key: 'subject',
      // "Candidate · Role" was wrong for campaign-level records: those carry no
      // candidate, so the cell fell back to the recommendation title under a
      // header promising a person.
      header: 'Subject',
      className: LEDGER_CELL,
      headerClassName: LEDGER_HEADER,
      render: (rec) => (
        <>
          <span className="hl-body text-hl-fg">{rec.candidate_name ?? rec.title}</span>
          {rec.campaign_title ? (
            <span className="hl-small block text-hl-fg-tertiary">
              {rec.candidate_name ? rec.campaign_title : `${rec.campaign_title} · role-level`}
            </span>
          ) : null}
        </>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence at the time',
      className: LEDGER_CELL,
      headerClassName: LEDGER_HEADER,
      render: (rec) => <ConfidenceChip confidence={rec.confidence} />,
    },
  ]
}

/**
 * The Ledger table (Stitch "Decision Ledger"). Data-dense, hairline-ruled, and
 * near-static — permanence over motion. Every cell is real recommendation data.
 *
 * No Outcome column: the backend records the decision, never what came of it.
 * There IS a "By" column — `decided_by` is recorded and this table used to drop
 * it on the incorrect belief that it was not.
 *
 * Renders through the shared `DataTable`. Pagination stays with `LedgerScreen`,
 * which owns the record-range caption, so this table receives an already-sliced
 * page and does not paginate again.
 */
export function LedgerTable({
  rows,
  onOpen,
  viewerId,
}: {
  rows: Recommendation[]
  onOpen: (rec: Recommendation) => void
  viewerId?: string | null
}) {
  const columns = React.useMemo(() => columnsFor(viewerId), [viewerId])
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(rec) => rec.id}
      onRowClick={onOpen}
      getRowLabel={(rec) => `Open record for ${rec.candidate_name ?? rec.title}`}
      caption="Recorded decisions"
      minWidth="45rem"
      className="rounded-hl-xl border-hl-border-subtle"
    />
  )
}
