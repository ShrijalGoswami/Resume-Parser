'use client'

import * as React from 'react'
import {
  AlertTriangle,
  UserRound,
  TrendingDown,
  ListChecks,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Avatar } from '../ui/avatar'
import { relativeTime } from '../lib/format'
import { useCan, PERMS } from '../lib/use-can'
import type { Recommendation, ApprovalStatus } from '@/types/agent'

const iconFor: Record<string, LucideIcon> = {
  urgent: AlertTriangle,
  candidate_alert: UserRound,
  campaign_risk: TrendingDown,
  action: ListChecks,
}

/**
 * Severity, said out loud (V2 §21: colour never carries meaning alone).
 * Normal-severity items carry no chip — a queue where every row is labelled
 * is a queue where no label means anything.
 */
const SEVERITY_CHIP: Record<string, { label: string; className: string } | undefined> = {
  urgent: { label: 'Urgent', className: 'text-hl-danger border-hl-danger/40 bg-hl-danger-bg' },
  high: { label: 'High', className: 'text-hl-warning border-hl-warning/40 bg-hl-warning-bg' },
}

export interface PriorityQueueProps {
  recommendations: Recommendation[]
  aiReviewCount: number
  onUpdate: (id: string, status: ApprovalStatus) => void
  pendingId: string | null
  onOpenCandidate: (roleId: string, candidateId: string) => void
  onPrefetchCandidate: (roleId: string, candidateId: string) => void
}

/**
 * The decision queue — the Dashboard's centre of gravity (audit: "what needs
 * my attention right now?"). Each row is one pending decision, drawn from a
 * real agent recommendation, and the row leads with WHO it is about: the
 * candidate's initials and name where one is named, the category glyph where
 * the item is about a role or the pipeline itself. The reason (`why`) is the
 * evidence line; the primary action is the next step. Items that name a
 * candidate open the frozen CandidatePeek; the rest resolve in place.
 */
export function InboxPriorityQueue({
  recommendations,
  aiReviewCount,
  onUpdate,
  pendingId,
  onOpenCandidate,
  onPrefetchCandidate,
}: PriorityQueueProps) {
  // Approve / Dismiss write to the recommendation (`agent.manage`); "Review"
  // only opens the candidate, which is a read. Roles without agent.manage keep
  // the queue as a reading list — which is what it is for them.
  const canDecide = useCan(PERMS.AGENT_MANAGE)

  return (
    <section aria-labelledby="inbox-priority-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="inbox-priority-heading" className="hl-h2 text-hl-fg">
          Needs your attention
        </h2>
        {/* The queue's own count, in the product's notation: mono, because it
            is a count, and quiet, because the rows below already say it. */}
        <span className="hl-caption text-hl-fg-tertiary font-[family-name:var(--font-hl-mono)]">
          {recommendations.length} pending
        </span>
      </div>

      {aiReviewCount > 0 ? (
        // Was a sparkle on a tinted AI surface. V2 §16: system-generated
        // content is marked by a copper rule and a plain sentence — the fact
        // matters, the technology does not.
        <p
          className="border-l-2 border-[var(--hl-accent-secondary)] py-0.5 pl-3 hl-small text-hl-fg-secondary"
          role="status"
        >
          {aiReviewCount} candidate{aiReviewCount === 1 ? '' : 's'} deserve
          {aiReviewCount === 1 ? 's' : ''} immediate review.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {recommendations.map((rec) => {
          const Icon = iconFor[rec.category] ?? ListChecks
          const candidate =
            rec.candidate_id && rec.campaign_id
              ? { roleId: rec.campaign_id, id: rec.candidate_id }
              : null
          const busy = pendingId === rec.id
          const chip = SEVERITY_CHIP[rec.severity]

          return (
            <li
              key={rec.id}
              // V2 §11: a card is one background step above the canvas —
              // #1C1F24 on #121417 — with the default border as texture.
              className="flex items-start gap-3 rounded-hl-md border border-hl-border bg-hl-subtle p-4"
              onMouseEnter={
                candidate ? () => onPrefetchCandidate(candidate.roleId, candidate.id) : undefined
              }
            >
              {/* WHO, before what: a named candidate leads with their
                  initials (the same identity plate used everywhere else);
                  only impersonal items keep a category glyph. */}
              {candidate && rec.candidate_name ? (
                <Avatar name={rec.candidate_name} size={36} className="mt-0.5 shrink-0" />
              ) : (
                <span className="mt-0.5 flex size-hl-control-md shrink-0 items-center justify-center rounded-full bg-hl-muted text-hl-fg-secondary">
                  <Icon className="size-4" aria-hidden />
                </span>
              )}

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {candidate && rec.candidate_name ? (
                      <span className="hl-body font-semibold text-hl-fg">
                        {rec.candidate_name}
                      </span>
                    ) : null}
                    {chip ? (
                      <span
                        className={`rounded-hl-sm border px-1.5 py-px hl-label-sm ${chip.className}`}
                      >
                        {chip.label}
                      </span>
                    ) : null}
                  </div>
                  {/* A timestamp is metadata; metadata is mono (V2 §4). */}
                  <time className="hl-caption shrink-0 pt-0.5 text-hl-fg-tertiary font-[family-name:var(--font-hl-mono)]">
                    {relativeTime(rec.created_at)}
                  </time>
                </div>

                {/* The situation, then the evidence for it. When the row
                    already leads with the candidate's name, the title reads
                    as the situation line rather than repeating as a second
                    heading. */}
                <p
                  className={
                    candidate && rec.candidate_name
                      ? 'hl-body text-hl-fg-secondary'
                      : 'hl-body font-medium text-hl-fg'
                  }
                >
                  {rec.title}
                </p>
                {rec.why ? (
                  <p className="hl-small text-hl-fg-tertiary">{rec.why}</p>
                ) : null}

                <div className="mt-2 flex items-center gap-2">
                  {candidate ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onOpenCandidate(candidate.roleId, candidate.id)}
                    >
                      Review{rec.candidate_name ? ` ${rec.candidate_name.split(/\s+/)[0]}` : ''}
                    </Button>
                  ) : canDecide ? (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={busy}
                      onClick={() => onUpdate(rec.id, 'approved')}
                    >
                      {rec.recommended_action || 'Approve'}
                    </Button>
                  ) : null}
                  {canDecide ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => onUpdate(rec.id, 'dismissed')}
                    >
                      Dismiss
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
