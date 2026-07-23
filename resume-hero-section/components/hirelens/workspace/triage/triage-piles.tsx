'use client'

import { ArrowRight, TriangleAlert } from 'lucide-react'
import { ACCEPT_MIN_SCORE, REJECT_MAX_SCORE } from './triage-grouping'
import type { CandidateRow } from '@/lib/candidate'

/** Items sitting within 5 points of the pile's threshold — worth a human glance. */
function borderlineCount(rows: CandidateRow[], kind: 'accept' | 'reject'): number {
  return rows.filter((r) => {
    if (r.overallScore == null) return false
    return kind === 'accept'
      ? r.overallScore < ACCEPT_MIN_SCORE + 5
      : r.overallScore >= REJECT_MAX_SCORE - 5
  }).length
}

function Pile({
  kind,
  rows,
  onReview,
}: {
  kind: 'accept' | 'reject'
  rows: CandidateRow[]
  onReview: () => void
}) {
  if (rows.length === 0) return null
  const near = borderlineCount(rows, kind)
  const title = kind === 'accept' ? 'Review & accept' : 'Review & reject'
  const basis =
    kind === 'accept'
      ? `AI recommends advancing · fit ≥ ${ACCEPT_MIN_SCORE}`
      : `AI recommends rejecting · fit < ${REJECT_MAX_SCORE}`

  return (
    <div className="flex flex-col gap-3 rounded-hl-xl border border-hl-border-subtle bg-hl-canvas px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="hl-body-medium text-hl-fg">
          {title} <span className="font-hl-mono tabular-nums text-hl-fg-tertiary">· {rows.length}</span>
        </span>
        <span className="hl-small text-hl-fg-secondary">{basis}</span>
        {near > 0 ? (
          <span className="flex items-center gap-1 rounded-hl-sm bg-hl-score-soft/10 px-1.5 py-0.5 font-hl-mono text-[10px] uppercase tracking-wide text-hl-score-soft">
            <TriangleAlert className="size-3" aria-hidden />
            {near} near the line
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onReview}
        className="hl-small flex shrink-0 items-center gap-1 text-hl-accent-fg outline-none transition-opacity hover:opacity-80"
      >
        Review
        <ArrowRight className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}

export interface TriagePilesProps {
  accept: CandidateRow[]
  reject: CandidateRow[]
  onReviewAccept: () => void
  onReviewReject: () => void
}

export function TriagePiles({ accept, reject, onReviewAccept, onReviewReject }: TriagePilesProps) {
  if (accept.length === 0 && reject.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      <Pile kind="accept" rows={accept} onReview={onReviewAccept} />
      <Pile kind="reject" rows={reject} onReview={onReviewReject} />
    </div>
  )
}
