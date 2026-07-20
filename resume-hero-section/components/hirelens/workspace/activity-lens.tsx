'use client'

import { Activity } from 'lucide-react'
import { useCampaignActivity } from '../lib/api/workspace'
import { ActivityRow } from '../domain'
import { Skeleton } from '../ui/skeleton'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'

/** Activity lens (UX Spec §7.8) — genuinely per-role via campaignActivity. */
export function ActivityLens({ roleId }: { roleId: string }) {
  const { data, isLoading, isError, refetch } = useCampaignActivity(roleId)

  if (isLoading) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-6" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <ErrorState
        variant="inline"
        title="Couldn't load activity"
        onRetry={() => refetch()}
        className="mt-2"
      />
    )
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Stage moves, notes, and AI actions for this role will appear here."
      />
    )
  }

  return (
    <ul className="mt-2 divide-y divide-hl-border-subtle rounded-hl-lg border border-hl-border bg-hl-canvas px-3">
      {data.map((event) => (
        <ActivityRow key={event.id} event={event} />
      ))}
    </ul>
  )
}
