'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * LensSwitcher (Design Bible §7.1) — segmented, URL-bound. Pipeline is the base
 * route; the other lenses are sub-routes (UX Spec §2).
 */
const lenses = [
  { label: 'Pipeline', segment: '' },
  { label: 'Analytics', segment: 'analytics' },
  { label: 'Forecast', segment: 'forecast' },
  { label: 'Report', segment: 'report' },
  { label: 'Activity', segment: 'activity' },
] as const

export function LensSwitcher({ roleId }: { roleId: string }) {
  const pathname = usePathname()
  const base = `/roles/${roleId}`

  return (
    <div
      role="tablist"
      aria-label="Workspace lens"
      className="inline-flex items-center gap-1 rounded-hl-md bg-hl-muted p-1"
    >
      {lenses.map((lens) => {
        const href = lens.segment ? `${base}/${lens.segment}` : base
        const active = lens.segment
          ? pathname === href || pathname.startsWith(`${href}/`)
          : pathname === base
        return (
          <Link
            key={lens.label}
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
