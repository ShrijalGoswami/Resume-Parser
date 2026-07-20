import { cn } from '@/lib/utils'
import { Card } from '../ui/card'
import { ScoreMeter } from './score-meter'
import { relativeTime } from '../lib/format'
import type { Campaign } from '@/types/campaign'

/**
 * RoleCard (UX Spec §6). Renders the fields the backend exposes today: title,
 * role/department, status, avg fit, counts, last activity. The spec's mini
 * pipeline bar, forecasted days-to-fill, and forecast chip have no backend
 * source yet — they are intentionally omitted (optional) and will render here
 * once the campaign object exposes per-stage counts / a days-to-fill forecast,
 * with no redesign. Non-interactive until the Role Workspace route exists.
 */
const statusColor: Record<string, string> = {
  active: 'text-hl-success',
  paused: 'text-hl-warning',
  draft: 'text-hl-fg-tertiary',
  archived: 'text-hl-fg-tertiary',
}

export function RoleCard({ campaign }: { campaign: Campaign }) {
  const count = campaign.total_candidates ?? campaign.candidate_count ?? 0
  const fit = campaign.average_match_score
  const subtitle = [campaign.role_title, campaign.department].filter(Boolean).join(' · ')

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="hl-h3 truncate">{campaign.title}</h3>
          {subtitle ? (
            <p className="hl-small truncate text-hl-fg-secondary">{subtitle}</p>
          ) : null}
        </div>
        <span
          className={cn(
            'hl-caption inline-flex shrink-0 items-center gap-1 capitalize',
            statusColor[campaign.status] ?? 'text-hl-fg-tertiary',
          )}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {campaign.status}
        </span>
      </div>

      {typeof fit === 'number' ? <ScoreMeter score={fit} /> : null}

      <div className="hl-caption flex items-center gap-2 text-hl-fg-tertiary">
        <span>
          {count} candidate{count === 1 ? '' : 's'}
        </span>
        {campaign.awaiting_analysis ? <span>· {campaign.awaiting_analysis} analyzing</span> : null}
        {campaign.last_activity_at ? <span>· {relativeTime(campaign.last_activity_at)}</span> : null}
      </div>
    </Card>
  )
}
