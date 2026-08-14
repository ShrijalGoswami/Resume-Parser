import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SpinnerProps extends React.SVGProps<SVGSVGElement> {
  /** Accessible label; announced via role="status". */
  label?: string
}

/**
 * In-button / inline async indicator (Design Bible §4.5 — spinners only for
 * in-button async and rare full-page auth checks, never the hot path).
 */
export function Spinner({ className, label = 'Loading', ...props }: SpinnerProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      role="status"
      aria-label={label}
      className={cn('size-4 animate-spin', className)}
      {...props}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
