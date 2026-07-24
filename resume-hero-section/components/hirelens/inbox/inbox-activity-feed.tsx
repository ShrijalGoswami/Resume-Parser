'use client'

import * as React from 'react'
import { ActivityRow } from '../domain/activity-row'
import { groupActivity } from './inbox-data'
import type { ActivityEvent } from '@/types/campaign'

/**
 * Grouped activity feed — Today / Yesterday / Earlier. This is the "what happened"
 * record (concise, read-only); the priority queue above is "what to do now". Reuses
 * the shared domain ActivityRow so activity rendering stays single-sourced.
 */
export function InboxActivityFeed({ events }: { events: ActivityEvent[] }) {
  const groups = React.useMemo(() => groupActivity(events), [events])

  if (groups.length === 0) return null

  return (
    <section aria-labelledby="inbox-activity-heading" className="flex flex-col gap-4">
      <h2 id="inbox-activity-heading" className="hl-h2 text-hl-fg">
        Recent activity
      </h2>
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <h3 className="hl-caption uppercase tracking-wide text-hl-fg-tertiary">{group.label}</h3>
          <ul className="flex flex-col">
            {group.events.map((event) => (
              <ActivityRow key={event.id} event={event} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
