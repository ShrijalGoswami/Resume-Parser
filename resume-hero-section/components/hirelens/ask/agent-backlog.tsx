'use client'

import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw, CheckCircle2 } from 'lucide-react'
import { ApprovalCard, ConfidencePill } from '../domain'
import { Badge, type BadgeProps } from '../ui/badge'
import { Button } from '../ui/button'
import { Skeleton } from '../ui/skeleton'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import { usePendingRecommendations, useUpdateRecommendation } from '../lib/api/hooks'
import { useAllRecommendations, useAgentScan, askKeys } from '../lib/api/ask'
import { relativeTime } from '../lib/format'
import { toast } from '../ui/use-toast'
import { PageHeader } from '../shell/page-header'
import type { Recommendation } from '@/types/agent'

const STATUS_TONE: Record<string, BadgeProps['variant']> = {
  approved: 'success',
  executed: 'info',
  rejected: 'neutral',
  dismissed: 'neutral',
}

/**
 * Agent backlog (UX Spec §9.2, mode 3) — the whole-picture audit view of the
 * agent's recommendations. Pending items are actionable ApprovalCards (approve
 * / dismiss apply optimistically with an Undo toast, shared with Home); decided
 * items are a read-only history.
 */
export function AgentBacklog() {
  const queryClient = useQueryClient()
  const pending = usePendingRecommendations()
  const all = useAllRecommendations()
  const update = useUpdateRecommendation()
  const scan = useAgentScan()

  const act = (recommendation: Recommendation, status: 'approved' | 'dismissed') => {
    update.mutate({ id: recommendation.id, status })
    toast({
      variant: status === 'approved' ? 'success' : 'info',
      title: `${status === 'approved' ? 'Approved' : 'Dismissed'}: ${recommendation.title}`,
      action: {
        label: 'Undo',
        onClick: () => update.mutate({ id: recommendation.id, status: 'pending' }),
      },
    })
    void queryClient.invalidateQueries({ queryKey: askKeys.recommendations('all') })
  }

  const decided = (all.data ?? []).filter((recommendation) => recommendation.status !== 'pending')
  const pendingItems = pending.data ?? []
  const isLoading = pending.isLoading || all.isLoading

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-[800px] flex-col gap-6 px-4 py-6">
        <PageHeader
          title="Agent backlog"
          description="What the agent proposes — you decide. Nothing changes without your approval."
          spacing="none"
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => scan.mutate()}
              loading={scan.isPending}
            >
              <RefreshCw /> Run scan
            </Button>
          }
        />

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1].map((index) => (
              <Skeleton key={index} className="h-36" />
            ))}
          </div>
        ) : pending.isError ? (
          <ErrorState
            variant="inline"
            title="Couldn’t load the backlog"
            onRetry={() => pending.refetch()}
          />
        ) : pendingItems.length === 0 && decided.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nothing needs your attention"
            description="Your pipeline looks healthy. Run a scan any time to look again."
            action={
              <Button variant="primary" onClick={() => scan.mutate()} loading={scan.isPending}>
                Run a scan
              </Button>
            }
          />
        ) : (
          <>
            {pendingItems.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="hl-h3">
                  Needs your decision{' '}
                  <span className="hl-small text-hl-fg-tertiary">· {pendingItems.length}</span>
                </h2>
                {pendingItems.map((recommendation) => (
                  <ApprovalCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    busy={update.isPending && update.variables?.id === recommendation.id}
                    onApprove={() => act(recommendation, 'approved')}
                    onDismiss={() => act(recommendation, 'dismissed')}
                  />
                ))}
              </section>
            ) : null}

            {decided.length > 0 ? (
              <section className="flex flex-col gap-2">
                <h2 className="hl-h3">Recently decided</h2>
                {decided.map((recommendation) => (
                  <DecidedRow key={recommendation.id} recommendation={recommendation} />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

function DecidedRow({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div className="flex items-center gap-3 rounded-hl-md border border-hl-border-subtle bg-hl-canvas px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="hl-small truncate text-hl-fg">{recommendation.title}</p>
        <p className="hl-caption text-hl-fg-tertiary">{relativeTime(recommendation.updated_at)}</p>
      </div>
      <ConfidencePill value={recommendation.confidence} />
      <Badge variant={STATUS_TONE[recommendation.status] ?? 'neutral'} className="capitalize">
        {recommendation.status}
      </Badge>
    </div>
  )
}
