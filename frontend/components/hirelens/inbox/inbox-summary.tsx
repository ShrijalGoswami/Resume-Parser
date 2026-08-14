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
    // ONE QUIET LINE, NOT FOUR TILES. The audit's sharpest finding: four
    // large metric plates were the first thing on screen, and for most
    // organizations most mornings they read `0 · 0 · 0 · —` — a telemetry
    // console announcing emptiness. The counts are navigation, not the news;
    // the decision queue above is the news. So the strip drops to a single
    // hairline row of links: mono count, Inter label, no plates, no shadows.
    // All three data states survive — skeleton, em dash + sr-only reason,
    // real number — because honesty was never the problem, prominence was.
    <nav
      aria-label="Pipeline summary"
      className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-b border-hl-border-subtle py-3"
    >
      {stats.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          className="group flex items-baseline gap-2 rounded-hl-sm outline-none focus-visible:ring-2 focus-visible:ring-hl-accent"
        >
          {loading ? (
            <Skeleton className="h-4 w-6" />
          ) : s.value === null ? (
            <>
              <span
                className="hl-caption text-hl-fg-tertiary font-[family-name:var(--font-hl-mono)]"
                aria-hidden
              >
                —
              </span>
              <span className="sr-only">{s.label}: count unavailable</span>
            </>
          ) : (
            <span className="hl-caption text-hl-fg font-[family-name:var(--font-hl-mono)]">
              {s.value}
            </span>
          )}
          <span className="hl-caption text-hl-fg-tertiary transition-colors group-hover:text-hl-fg-secondary">
            {s.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
