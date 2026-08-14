'use client'

import type { UseMutationResult } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../ui/button'
import { ErrorState } from '../states/error-state'
import { ComparisonReport } from './comparison-report'
import type { CandidateComparisonReport } from '@/types/comparison'

/**
 * Compare (Design Bible §7.3) — a WORKSPACE, not a drawer.
 *
 * WHY THIS IS NOT A DRAWER ANY MORE
 * ---------------------------------
 * It used to render inside the `Drawer` primitive at `size="wide"`, which is
 * `fixed inset-y-0 right-0` capped at `sm:max-w-[560px]`. So the one surface in
 * the product whose whole job is SIDE-BY-SIDE reading was the most horizontally
 * constrained thing in it: a rankings table with seven columns — rank, name,
 * Fit, gap, ATS, strength, watch — folded into 560px against a dimmed copy of
 * the workspace it was summarising. Every cell wrapped to two or three lines,
 * which is exactly the reading a comparison is supposed to make easy.
 *
 * The peek stays a drawer, because a peek is a glance at ONE candidate beside
 * the list you are working through. A comparison is the work itself, so it gets
 * the canvas.
 *
 * WHAT DID NOT CHANGE
 * -------------------
 * The props, the loading/error/report branches, and `ComparisonReport` itself.
 * This is a container swap: the report renders identically, just with room. The
 * component still returns nothing when closed, so hosts can keep mounting it
 * unconditionally.
 */
export interface ComparePanelProps {
  open: boolean
  count: number
  result: UseMutationResult<CandidateComparisonReport, Error, string[]>
  /**
   * The role the compared candidates belong to, used to link each of them to
   * their full evaluation. Optional: Talent can compare across a result set
   * that spans roles, and in that case no single correct link exists.
   */
  roleId?: string
  onRetry: () => void
  onClose: () => void
}

export function ComparePanel({ open, count, result, roleId, onRetry, onClose }: ComparePanelProps) {
  if (!open) return null

  return (
    // No fixed positioning and no width cap: the host places this in its content
    // canvas, so Compare inherits whatever width the shell already gives every
    // other workspace surface, and narrows with it rather than against it.
    <section aria-label={`Compare ${count} candidates`} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Leaving Compare returns to the list you selected from — the same
            back-out the drawer's close button used to provide. */}
        <Button variant="secondary" size="sm" onClick={onClose}>
          <ArrowLeft /> Back
        </Button>
        <div className="min-w-0">
          <h2 className="hl-h2 truncate">Compare {count} candidates</h2>
          {/* Was "AI side-by-side, grounded in each résumé" — a grounding claim
              the panel did not back, because it discarded the `sources_used`
              the response carried. The report now renders that attribution, so
              the header can simply say what it is. */}
          <p className="hl-body text-hl-fg-secondary">
            Side by side, from each candidate’s analysis.
          </p>
        </div>
      </div>

      {result.isPending ? (
        // A sparkle in prism blue inside a gradient ring — three V2
        // violations in one loading state (§8 no sparkles, §16 copper
        // marks system work, §23 no gradients). Work in progress is a
        // copper progress rule; nothing about it needs to be magical.
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="h-0.5 w-24 overflow-hidden rounded-full bg-hl-muted" aria-hidden>
            <span className="hl-indeterminate block h-full w-1/3 rounded-full bg-[var(--hl-accent-secondary)]" />
          </span>
          <p className="hl-body text-hl-fg-secondary">Comparing candidates…</p>
        </div>
      ) : result.isError ? (
        <ErrorState
          variant="inline"
          title="Couldn’t compare"
          description={result.error?.message}
          onRetry={onRetry}
        />
      ) : result.data ? (
        <ComparisonReport report={result.data} roleId={roleId} />
      ) : null}
    </section>
  )
}
