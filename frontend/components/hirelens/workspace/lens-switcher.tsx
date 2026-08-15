'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCan, PERMS } from '../lib/use-can'

/**
 * LensSwitcher (Design Bible §7.1) — segmented, URL-bound via a `?lens=` param.
 * This keeps every lens shareable/deep-linkable (UX Spec §2 deep-link rule)
 * without a five-file sub-route tree; it can be promoted to sub-route paths
 * later with no UI change.
 */
// Forecast and Report were removed in Phase 9.1. Both rendered a "coming soon"
// card because forecasting and the report generator are org-wide with no
// per-role backend, so they were two dead ends inside the main workspace. They
// return as one `Insights` lens when `/analytics/overview` accepts a
// `campaign_id` filter; until then the tab set only lists lenses that answer.
const lenses = [
  { label: 'Pipeline', value: 'pipeline' },
  { label: 'Triage', value: 'triage' },
  { label: 'Analytics', value: 'analytics' },
  { label: 'Activity', value: 'activity' },
] as const

export function LensSwitcher() {
  const pathname = usePathname()
  const params = useSearchParams()
  const current = params.get('lens') ?? 'pipeline'
  // Triage is the one lens that is nothing but mutations — every key in its
  // queue moves a candidate to another stage. The other five read data that
  // `campaign.view` / `candidate.view` already cover, so they stay for everyone.
  // The lens still gates itself; `?lens=triage` is a shareable URL.
  const canTriage = useCan(PERMS.CANDIDATE_MANAGE)
  const visible = lenses.filter((lens) => lens.value !== 'triage' || canTriage)

  return (
    /* At 390 the four tabs need ~403px, so "Activity" was cut in half by the
       viewport edge with nothing to indicate more existed. The strip now
       scrolls inside its own track — `max-w-full` keeps that scrolling
       contained, so the page itself still never scrolls sideways. The
       scrollbar is the affordance; `min-w-max` stops the tabs from being
       squeezed into two-line stubs instead. */
    <div className="max-w-full overflow-x-auto">
      <div
        role="tablist"
        aria-label="Workspace lens"
        className="inline-flex min-w-max items-center gap-1 rounded-hl-md bg-hl-muted p-1"
      >
      {visible.map((lens) => {
        const active = current === lens.value
        const href = lens.value === 'pipeline' ? pathname : `${pathname}?lens=${lens.value}`
        return (
          <Link
            key={lens.value}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              'hl-body-medium shrink-0 whitespace-nowrap rounded-hl-sm px-3 py-1 outline-none transition-colors',
              active
                ? 'bg-hl-canvas text-hl-accent-fg shadow-[var(--hl-shadow-xs)]'
                : 'text-hl-fg-secondary hover:text-hl-fg',
            )}
          >
            {lens.label}
          </Link>
          )
        })}
      </div>
    </div>
  )
}
