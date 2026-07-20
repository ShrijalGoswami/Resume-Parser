import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge / Pill (Design Bible §4.7). Status variants pair color with text; never
 * rely on color alone. Score badges are handled by ScoreMeter, not here.
 */
const badgeVariants = cva(
  'hl-caption inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-hl-muted text-hl-fg-secondary',
        accent: 'bg-hl-accent-subtle text-hl-accent-fg',
        outline: 'border border-hl-border text-hl-fg-secondary',
        success: 'bg-hl-success-bg text-hl-success',
        warning: 'bg-hl-warning-bg text-hl-warning',
        danger: 'bg-hl-danger-bg text-hl-danger',
        info: 'bg-hl-info-bg text-hl-info',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
