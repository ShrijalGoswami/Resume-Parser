'use client'

import * as React from 'react'
import { CircleCheck, TriangleAlert, CircleSlash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DataTable, type DataTableColumn } from '../ui/data-table'
import { ConfidenceChip } from '../decision-intelligence/confidence-chip'
import { decisionMeta, fmtDate, fmtTime, decidedAt } from './ledger-meta'
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
const LEDGER_HEADER = 'py-3 hl-label font-hl-mono'

const columns: DataTableColumn<Recommendation>[] = [
  {
    key: 'date',
    header: 'Date',
    className: cn(LEDGER_CELL, 'whitespace-nowrap'),
    headerClassName: LEDGER_HEADER,
    render: (rec) => {
      const stamp = decidedAt(rec)
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
    key: 'candidate',
    header: 'Candidate · Role',
    className: LEDGER_CELL,
    headerClassName: LEDGER_HEADER,
    render: (rec) => (
      <>
        <span className="hl-body text-hl-fg">{rec.candidate_name ?? rec.title}</span>
        {rec.campaign_title ? (
          <span className="hl-small block text-hl-fg-tertiary">{rec.campaign_title}</span>
        ) : null}
      </>
    ),
  },
  {
    key: 'confidence',
    header: 'Confidence',
    className: LEDGER_CELL,
    headerClassName: LEDGER_HEADER,
    render: (rec) => <ConfidenceChip confidence={rec.confidence} />,
  },
]

/**
 * The Ledger table (Stitch "Decision Ledger"). Data-dense, hairline-ruled, and
 * near-static — permanence over motion. Mono for the record metadata; every cell
 * is real recommendation data. No Outcome column (not tracked). No "By" column
 * (the decider is not recorded).
 *
 * Renders through the shared `DataTable`. Pagination stays with `LedgerScreen`,
 * which owns the record-range caption, so this table receives an already-sliced
 * page and does not paginate again.
 */
export function LedgerTable({
  rows,
  onOpen,
}: {
  rows: Recommendation[]
  onOpen: (rec: Recommendation) => void
}) {
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
