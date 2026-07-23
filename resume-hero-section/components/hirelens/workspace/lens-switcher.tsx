'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * LensSwitcher (Design Bible §7.1) — segmented, URL-bound via a `?lens=` param.
 * This keeps every lens shareable/deep-linkable (UX Spec §2 deep-link rule)
 * without a five-file sub-route tree; it can be promoted to sub-route paths
 * later with no UI change.
 */
const lenses = [
  { label: 'Pipeline', value: 'pipeline' },
  { label: 'Triage', value: 'triage' },
  { label: 'Analytics', value: 'analytics' },
  { label: 'Forecast', value: 'forecast' },
  { label: 'Report', value: 'report' },
  { label: 'Activity', value: 'activity' },
] as const

export function LensSwitcher() {
  const pathname = usePathname()
  const params = useSearchParams()
  const current = params.get('lens') ?? 'pipeline'

  return (
    <div
      role="tablist"
      aria-label="Workspace lens"
      className="inline-flex items-center gap-1 rounded-hl-md bg-hl-muted p-1"
    >
      {lenses.map((lens) => {
        const active = current === lens.value
        const href = lens.value === 'pipeline' ? pathname : `${pathname}?lens=${lens.value}`
        return (
          <Link
            key={lens.value}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              'hl-body-medium rounded-hl-sm px-3 py-1 outline-none transition-colors',
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
  )
}
