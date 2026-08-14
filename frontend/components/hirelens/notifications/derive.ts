import type { Recommendation } from '@/types/agent'
import type { ActivityEvent } from '@/types/campaign'
import type { HLNotification, NotificationSeverity } from './types'

/**
 * Builds the notification feed out of data the recruiter already has.
 *
 * There is no notifications table yet, so rather than seed a fake inbox this
 * projects two real sources into the notification shape:
 *
 *  - pending agent recommendations (`GET /recommendations?status=pending`) —
 *    things genuinely waiting on the user's decision;
 *  - the recruiter activity feed (`GET /activity`) — things that happened.
 *
 * When a real notifications endpoint lands, delete this file and have the
 * source return `HLNotification[]` directly; nothing else changes.
 */

const SEVERITIES: NotificationSeverity[] = ['urgent', 'high', 'medium', 'low']

function toSeverity(value: string): NotificationSeverity {
  const normalized = value.toLowerCase() as NotificationSeverity
  return SEVERITIES.includes(normalized) ? normalized : 'medium'
}

function recommendationHref(rec: Recommendation): string | undefined {
  if (rec.campaign_id && rec.candidate_id) {
    return `/roles/${rec.campaign_id}/candidates/${rec.candidate_id}`
  }
  if (rec.campaign_id) return `/roles/${rec.campaign_id}`
  return '/home'
}

function activityHref(event: ActivityEvent): string | undefined {
  if (event.campaign_id && event.candidate_id) {
    return `/roles/${event.campaign_id}/candidates/${event.candidate_id}`
  }
  if (event.campaign_id) return `/roles/${event.campaign_id}`
  return undefined
}

export function deriveNotifications({
  recommendations = [],
  activity = [],
}: {
  recommendations?: Recommendation[]
  activity?: ActivityEvent[]
}): HLNotification[] {
  const fromRecommendations: HLNotification[] = recommendations.map((rec) => ({
    // Prefixed so a recommendation and an activity row can never collide on id.
    id: `rec:${rec.id}`,
    kind: 'recommendation',
    title: rec.title,
    detail: rec.candidate_name ?? rec.campaign_title ?? undefined,
    severity: toSeverity(rec.severity),
    createdAt: rec.created_at,
    href: recommendationHref(rec),
  }))

  const fromActivity: HLNotification[] = activity.map((event) => ({
    id: `act:${event.id}`,
    kind: 'activity',
    title: event.summary,
    detail: event.type.replace(/[._]/g, ' '),
    severity: 'low',
    createdAt: event.created_at ?? null,
    href: activityHref(event),
  }))

  return [...fromRecommendations, ...fromActivity].sort((a, b) => {
    // Newest first; undated records sink rather than sorting as epoch 0.
    const at = a.createdAt ? Date.parse(a.createdAt) : Number.NaN
    const bt = b.createdAt ? Date.parse(b.createdAt) : Number.NaN
    const aBad = Number.isNaN(at)
    const bBad = Number.isNaN(bt)
    if (aBad && bBad) return 0
    if (aBad) return 1
    if (bBad) return -1
    return bt - at
  })
}
