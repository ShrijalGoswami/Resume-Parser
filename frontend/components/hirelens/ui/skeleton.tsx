import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Loading placeholder (Design Bible §3.7 / §4.10). Mirrors the target layout's
 * box sizes; neutral sheen sweep (distinct from the AI shimmer). Decorative —
 * hidden from assistive tech; announce loading via a live region instead.
 */
export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div aria-hidden className={cn('hl-skeleton rounded-hl-sm', className)} {...props} />
  )
}
