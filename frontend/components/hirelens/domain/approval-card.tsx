'use client'

import { Sparkles } from 'lucide-react'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { ConfidencePill } from './confidence-pill'
import { relativeTime } from '../lib/format'
import { useCan, PERMS } from '../lib/use-can'
import type { Recommendation } from '@/types/agent'

/**
 * ApprovalCard (Design Bible §4.7) — the decision object. Approve applies
 * optimistically (parent wires the mutation + Undo toast); Dismiss drops it.
 * "Modify" is intentionally omitted for now: there is no modify flow to target
 * yet, and a button that does nothing would be a fake interaction. It slots in
 * once a modify path exists, with no redesign.
 */
export interface ApprovalCardProps {
  recommendation: Recommendation
  onApprove: () => void
  onDismiss: () => void
  busy?: boolean
}

export function ApprovalCard({ recommendation, onApprove, onDismiss, busy }: ApprovalCardProps) {
  const context = recommendation.candidate_name ?? recommendation.campaign_title
  // Reading a recommendation is `candidate.view`; deciding on one is
  // `agent.manage` (`PATCH /agent/recommendations/{id}`). Interviewers have AI
  // access and so reach this card, but the decision is not theirs — they keep
  // the proposal and lose the verdict.
  const canDecide = useCan(PERMS.AGENT_MANAGE)
  return (
    <Card variant="approval" className="flex w-full flex-col gap-3 p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-hl-prism-mid" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="hl-h3">{recommendation.title}</h3>
          {recommendation.why ? (
            <p className="hl-body mt-0.5 text-hl-fg-secondary">{recommendation.why}</p>
          ) : null}
        </div>
      </div>

      {recommendation.recommended_action ? (
        <div className="rounded-hl-md border border-hl-border-subtle bg-hl-canvas px-3 py-2">
          <p className="hl-body text-hl-fg">{recommendation.recommended_action}</p>
        </div>
      ) : null}

      <div className="hl-caption flex flex-wrap items-center gap-x-2 gap-y-1 text-hl-fg-tertiary">
        <span>Proposed by Agent</span>
        {recommendation.created_at ? <span>· {relativeTime(recommendation.created_at)}</span> : null}
        {context ? <span className="truncate">· {context}</span> : null}
        <ConfidencePill value={recommendation.confidence} className="ml-auto" />
      </div>

      {canDecide ? (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onApprove} loading={busy}>
            Approve
          </Button>
          <Button variant="ghost" size="sm" onClick={onDismiss} disabled={busy}>
            Dismiss
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
