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
    <nav aria-label="Summary" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          className="flex flex-col gap-1 rounded-hl-md border border-hl-border bg-hl-canvas px-4 py-3 transition-colors hover:border-hl-accent hover:bg-hl-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hl-accent"
        >
          {loading ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <span className="hl-display-xl tabular-nums text-hl-fg">{s.value}</span>
          )}
          <span className="hl-caption text-hl-fg-tertiary">{s.label}</span>
        </Link>
      ))}
    </nav>
  )
}
