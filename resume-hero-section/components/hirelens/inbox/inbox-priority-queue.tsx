'use client'

import * as React from 'react'
import {
  AlertTriangle,
  UserRound,
  TrendingDown,
  ListChecks,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '../ui/button'
import { relativeTime } from '../lib/format'
import type { Recommendation, ApprovalStatus } from '@/types/agent'

const iconFor: Record<string, LucideIcon> = {
  urgent: AlertTriangle,
  candidate_alert: UserRound,
  campaign_risk: TrendingDown,
  action: ListChecks,
}

/** Left-edge accent by severity — the only decorative signal (spec: nothing decorative). */
function accentClass(severity: string): string {
  if (severity === 'urgent') return 'text-hl-danger'
  if (severity === 'high') return 'text-hl-warning'
  return 'text-hl-fg-secondary'
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
 * Priority queue — the recruiter's command center. Each item is one action, drawn
 * from a real pending agent recommendation. Items that name a candidate open the
 * frozen CandidatePeek; the rest are approved or dismissed in place.
 */
export function InboxPriorityQueue({
  recommendations,
  aiReviewCount,
  onUpdate,
  pendingId,
  onOpenCandidate,
  onPrefetchCandidate,
}: PriorityQueueProps) {
  return (
    <section aria-labelledby="inbox-priority-heading" className="flex flex-col gap-3">
      <h2 id="inbox-priority-heading" className="hl-h2 text-hl-fg">
        Needs your attention
      </h2>

      {aiReviewCount > 0 ? (
        <p
          className="flex items-center gap-2 rounded-hl-md bg-hl-ai-surface px-3 py-2 text-hl-fg-secondary"
          role="status"
        >
          <Sparkles className="size-4 shrink-0 text-hl-accent" aria-hidden />
          <span className="hl-small">
            {aiReviewCount} candidate{aiReviewCount === 1 ? '' : 's'} deserve
            {aiReviewCount === 1 ? 's' : ''} immediate review.
          </span>
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

          return (
            <li
              key={rec.id}
              className="flex items-start gap-3 rounded-hl-md border border-hl-border bg-hl-canvas p-4"
              onMouseEnter={
                candidate ? () => onPrefetchCandidate(candidate.roleId, candidate.id) : undefined
              }
            >
              <span
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-hl-muted ${accentClass(
                  rec.severity,
                )}`}
              >
                <Icon className="size-4" aria-hidden />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="hl-body font-medium text-hl-fg">{rec.title}</p>
                  <time className="hl-caption shrink-0 pt-0.5 text-hl-fg-tertiary">
                    {relativeTime(rec.created_at)}
                  </time>
                </div>
                {rec.why ? (
                  <p className="hl-small text-hl-fg-secondary">{rec.why}</p>
                ) : null}

                <div className="mt-2 flex items-center gap-2">
                  {candidate ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onOpenCandidate(candidate.roleId, candidate.id)}
                    >
                      Review{rec.candidate_name ? ` ${rec.candidate_name}` : ''}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={busy}
                      onClick={() => onUpdate(rec.id, 'approved')}
                    >
                      {rec.recommended_action || 'Approve'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onUpdate(rec.id, 'dismissed')}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
