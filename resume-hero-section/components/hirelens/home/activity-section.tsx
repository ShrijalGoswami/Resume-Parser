'use client'

import { useRecentActivity } from '../lib/api/hooks'
import { ActivityRow } from '../domain'
import { Section } from './section'
import { Skeleton } from '../ui/skeleton'

/**
 * Recent AI Activity (UX Spec §6) — a quiet ledger for trust. Collapses when
 * empty or unavailable (it is supporting context, never a blocker).
 */
export function ActivitySection() {
  const { data, isLoading, isError } = useRecentActivity(12)

  if (isLoading) {
    return (
      <Section title="Recent AI activity">
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-6" />
          ))}
        </div>
      </Section>
    )
  }

  if (isError || !data || data.length === 0) return null

  return (
    <Section title="Recent AI activity">
      <ul className="divide-y divide-hl-border-subtle rounded-hl-lg border border-hl-border bg-hl-canvas px-3">
        {data.map((event) => (
          <ActivityRow key={event.id} event={event} />
        ))}
      </ul>
    </Section>
  )
}
