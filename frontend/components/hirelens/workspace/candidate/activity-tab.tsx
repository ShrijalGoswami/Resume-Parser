'use client'

import { useCandidateActivity } from '../../lib/api/candidate'
import { ActivityRow } from '../../domain'
import { Skeleton } from '../../ui/skeleton'
import { EmptyHint } from './parts'

/** Per-candidate activity (UX Spec §7.4). */
export function CandidateActivityTab({
  roleId,
  candidateId,
}: {
  roleId: string
  candidateId: string
}) {
  const { data, isLoading } = useCandidateActivity(roleId, candidateId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-6" />
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <EmptyHint text="No activity yet for this candidate." />
  }

  return (
    <ul className="divide-y divide-hl-border-subtle">
      {data.map((event) => (
        <ActivityRow key={event.id} event={event} />
      ))}
    </ul>
  )
}
