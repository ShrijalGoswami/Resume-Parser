import { Badge, type BadgeProps } from '../ui/badge'
import type { HireLabel } from '@/lib/candidate'

/** V3-styled hiring verdict badge derived from the candidate's recommendation. */
const variantFor: Record<HireLabel, NonNullable<BadgeProps['variant']>> = {
  'Strong Hire': 'success',
  Hire: 'accent',
  Maybe: 'warning',
  Reject: 'danger',
  Unrated: 'neutral',
}

export function HireBadge({ hire }: { hire: HireLabel }) {
  if (hire === 'Unrated') return null
  return <Badge variant={variantFor[hire]}>{hire}</Badge>
}
