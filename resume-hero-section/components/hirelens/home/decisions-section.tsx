'use client'

import { usePendingRecommendations, useUpdateRecommendation } from '../lib/api/hooks'
import { ApprovalCard } from '../domain'
import { Section } from './section'
import { Skeleton } from '../ui/skeleton'
import { ErrorState } from '../states/error-state'
import { toast } from '../ui/use-toast'
import type { Recommendation } from '@/types/agent'

/**
 * Needs Your Decision (UX Spec §6). The agent's approval queue. Approve/dismiss
 * apply optimistically with an Undo toast (restores by setting status back to
 * pending). Collapses when the queue is empty.
 */
export function DecisionsSection() {
  const { data, isLoading, isError, refetch } = usePendingRecommendations()
  const update = useUpdateRecommendation()

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
  }

  if (isLoading) {
    return (
      <Section title="Needs your decision">
        <div className="grid gap-3 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      </Section>
    )
  }

  if (isError) {
    return (
      <Section title="Needs your decision">
        <ErrorState
          variant="inline"
          title="Couldn't load recommendations"
          onRetry={() => refetch()}
        />
      </Section>
    )
  }

  if (!data || data.length === 0) return null

  return (
    <Section title="Needs your decision" count={data.length}>
      <div className="grid gap-3 lg:grid-cols-2">
        {data.map((recommendation) => (
          <ApprovalCard
            key={recommendation.id}
            recommendation={recommendation}
            busy={update.isPending && update.variables?.id === recommendation.id}
            onApprove={() => act(recommendation, 'approved')}
            onDismiss={() => act(recommendation, 'dismissed')}
          />
        ))}
      </div>
    </Section>
  )
}
