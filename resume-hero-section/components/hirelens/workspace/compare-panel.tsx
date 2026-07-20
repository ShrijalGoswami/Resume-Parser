'use client'

import { Sparkles } from 'lucide-react'
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
            <p className="hl-small text-hl-fg-secondary">
              AI side-by-side, grounded in each résumé.
            </p>
          </div>
        </DrawerHeader>
        <DrawerBody>
          {result.isPending ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="hl-prism-border flex size-9 items-center justify-center rounded-full [--hl-prism-fill:var(--hl-ai-surface)]">
                <Sparkles className="size-4 animate-pulse text-hl-prism-mid" aria-hidden />
              </span>
              <p className="hl-small text-hl-fg-secondary">Comparing candidates…</p>
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
