'use client'

import { CircleCheck, TriangleAlert, CircleSlash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfidenceChip } from '../decision-intelligence/confidence-chip'
import { decisionMeta, fmtDate, fmtTime } from './ledger-meta'
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

/**
 * The Ledger table (Stitch "Decision Ledger"). Data-dense, hairline-ruled, and
 * near-static — permanence over motion. Mono for the record metadata; every cell
 * is real recommendation data. No Outcome column (not tracked). No "By" column
 * (the decider is not recorded).
 */
export function LedgerTable({
  rows,
  onOpen,
}: {
  rows: Recommendation[]
  onOpen: (rec: Recommendation) => void
}) {
  return (
    <div className="overflow-x-auto rounded-hl-xl border border-hl-border-subtle">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-hl-border-subtle bg-hl-subtle">
            {['Date', 'Decision', 'Candidate · Role', 'Confidence'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-hl-mono text-[10px] font-medium uppercase tracking-widest text-hl-fg-tertiary"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((rec) => {
            const stamp = rec.updated_at ?? rec.created_at
            return (
              <tr
                key={rec.id}
                onClick={() => onOpen(rec)}
                className="cursor-pointer border-b border-hl-border-subtle transition-colors last:border-b-0 hover:bg-hl-subtle"
              >
                <td className="whitespace-nowrap px-4 py-4 align-top">
                  <span className="font-hl-mono text-[11px] tabular-nums text-hl-fg-secondary">
                    {fmtDate(stamp)}
                    <span className="text-hl-fg-tertiary"> · {fmtTime(stamp)}</span>
                  </span>
                </td>
                <td className="px-4 py-4 align-top">
                  <DecisionCell rec={rec} />
                </td>
                <td className="px-4 py-4 align-top">
                  <span className="hl-body text-hl-fg">{rec.candidate_name ?? rec.title}</span>
                  {rec.campaign_title ? (
                    <span className="hl-small block text-hl-fg-tertiary">{rec.campaign_title}</span>
                  ) : null}
                </td>
                <td className="px-4 py-4 align-top">
                  <ConfidenceChip confidence={rec.confidence} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
