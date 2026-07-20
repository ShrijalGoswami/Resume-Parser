import * as React from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '../ui/skeleton'
import { Spinner } from '../ui/spinner'

/**
 * Loading patterns (Design Bible §4.5). Skeletons on the hot path; the spinner
 * screen only for rare route-level waits (e.g. an auth check).
 */
export interface LoadingLinesProps {
  lines?: number
  className?: string
}

export function LoadingLines({ lines = 3, className }: LoadingLinesProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-4"
          style={{ width: `${Math.max(40, 90 - index * 12)}%` }}
        />
      ))}
    </div>
  )
}

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-hl-fg-tertiary"
      role="status"
      aria-label={label}
    >
      <Spinner className="size-6" label={label} />
    </div>
  )
}
