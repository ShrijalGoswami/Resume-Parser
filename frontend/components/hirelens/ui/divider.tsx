import * as React from 'react'
import { cn } from '@/lib/utils'

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  /** Optional centered label (horizontal only), e.g. a section separator. */
  label?: string
}

export function Divider({
  className,
  orientation = 'horizontal',
  label,
  ...props
}: DividerProps) {
  if (label && orientation === 'horizontal') {
    return (
      <div className={cn('flex items-center gap-3', className)} {...props}>
        <span className="h-px flex-1 bg-hl-border-subtle" />
        <span className="hl-caption text-hl-fg-tertiary">{label}</span>
        <span className="h-px flex-1 bg-hl-border-subtle" />
      </div>
    )
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-hl-border-subtle',
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px self-stretch',
        className,
      )}
      {...props}
    />
  )
}
