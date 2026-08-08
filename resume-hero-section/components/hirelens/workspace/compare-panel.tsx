'use client'

import type { UseMutationResult } from '@tanstack/react-query'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerTitle,
} from '../ui/drawer'
import { ErrorState } from '../states/error-state'
import { ComparisonReport } from './comparison-report'
import type { CandidateComparisonReport } from '@/types/comparison'

/** Compare panel (Design Bible §7.3) — opens from the multiselect toolbar. */
export interface ComparePanelProps {
  open: boolean
  count: number
  result: UseMutationResult<CandidateComparisonReport, Error, string[]>
  onRetry: () => void
  onClose: () => void
}

export function ComparePanel({ open, count, result, onRetry, onClose }: ComparePanelProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DrawerContent size="wide">
        <DrawerHeader>
          <div>
            <DrawerTitle>Compare {count} candidates</DrawerTitle>
            {/* Was "AI side-by-side, grounded in each résumé" — a grounding
                claim the panel did not back, because it discarded the
                `sources_used` the response carried. The report now renders
                that attribution, so the header can simply say what it is. */}
            <p className="hl-body text-hl-fg-secondary">
              Side by side, from each candidate&rsquo;s analysis.
            </p>
          </div>
        </DrawerHeader>
        <DrawerBody>
          {result.isPending ? (
            // A sparkle in prism blue inside a gradient ring — three V2
            // violations in one loading state (§8 no sparkles, §16 copper
            // marks system work, §23 no gradients). Work in progress is a
            // copper progress rule; nothing about it needs to be magical.
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span
                className="h-0.5 w-24 overflow-hidden rounded-full bg-hl-muted"
                aria-hidden
              >
                <span className="hl-indeterminate block h-full w-1/3 rounded-full bg-[var(--hl-accent-secondary)]" />
              </span>
              <p className="hl-body text-hl-fg-secondary">Comparing candidates…</p>
            </div>
          ) : result.isError ? (
            <ErrorState
              variant="inline"
              title="Couldn't compare"
              description={result.error?.message}
              onRetry={onRetry}
            />
          ) : result.data ? (
            <ComparisonReport report={result.data} />
          ) : null}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  )
}
