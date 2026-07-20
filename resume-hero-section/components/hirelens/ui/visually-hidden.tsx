import * as React from 'react'
import { cn } from '@/lib/utils'

/** Visually hidden but available to assistive tech (Design Bible §IX). */
export function VisuallyHidden({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('sr-only', className)} {...props} />
}
