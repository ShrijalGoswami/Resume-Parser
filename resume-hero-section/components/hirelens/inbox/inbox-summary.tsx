'use client'

import Link from 'next/link'
import { Skeleton } from '../ui/skeleton'
import type { SummaryStat } from './inbox-data'

/**
 * Executive summary strip — four navigation summaries (not analytics). Each is a
 * link into where the work lives. 2×2 on mobile, one row of four on desktop, so
 * the strip never scrolls horizontally.
 *
 * THREE STATES, NOT TWO. It used to have loading and ready, which meant every
 * other outcome — the request failing, or the organization's plan not including
 * the endpoint the counts come from — resolved to a confident `0`. That is the
 * first thing a Free or Plus customer saw on opening the product, and it said
 * their pipeline was empty when it was not.
 *
 * The strip still renders in all three, because these are LINKS and the
 * destinations are worth reaching whether or not we can count what is behind
 * them. An unknown count shows an em dash and says so to a screen reader,
 * rather than being dropped — a missing tile reads as a layout bug, and a
 * missing number reads as an answer.
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
          ) : s.value === null ? (
            <>
              {/* An em dash, not a zero and not a blank. The tile keeps its
                  shape so the row does not reflow, and the reason is available
                  to anyone who cannot see that it is a dash. */}
              <span className="hl-metric-sm text-hl-fg-tertiary" aria-hidden>
                —
              </span>
              <span className="sr-only">{s.label}: count unavailable</span>
            </>
          ) : (
            <span className="hl-metric-sm text-hl-fg">{s.value}</span>
          )}
          <span className="hl-label text-hl-fg-tertiary">{s.label}</span>
        </Link>
      ))}
    </nav>
  )
}
