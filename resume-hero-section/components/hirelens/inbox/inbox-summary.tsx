'use client'

import Link from 'next/link'
import { Skeleton } from '../ui/skeleton'
import type { SummaryStat } from './inbox-data'

/**
 * Executive summary strip — four navigation summaries (not analytics). Each is a
 * link into where the work lives. 2×2 on mobile, one row of four on desktop, so
 * the strip never scrolls horizontally.
 */
export function InboxSummary({ stats, loading }: { stats: SummaryStat[]; loading?: boolean }) {
  return (
    <nav aria-label="Summary" className="hl-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          className="hl-surface flex flex-col gap-0.5 rounded-hl-lg border border-hl-border px-4 py-3 transition-[box-shadow,border-color,transform] duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)] hover:-translate-y-0.5 hover:border-hl-border-strong hover:shadow-[var(--hl-shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hl-accent"
        >
          {loading ? (
            <Skeleton className="h-8 w-12" />
          ) : (
            <span className="hl-metric-sm text-hl-fg">{s.value}</span>
          )}
          <span className="hl-label text-hl-fg-tertiary">{s.label}</span>
        </Link>
      ))}
    </nav>
  )
}
