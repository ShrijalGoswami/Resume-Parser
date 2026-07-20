import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Card (Design Bible §4.2–§4.3). `ai` and `approval` carry the prism gradient
 * border over the AI surface; `interactive` lifts on hover.
 */
const cardVariants = cva('rounded-hl-lg text-hl-fg', {
  variants: {
    variant: {
      default: 'border border-hl-border bg-hl-canvas shadow-[var(--hl-shadow-xs)]',
      interactive:
        'cursor-pointer border border-hl-border bg-hl-canvas shadow-[var(--hl-shadow-xs)] transition-[box-shadow,border-color] duration-[var(--hl-dur-fast)] hover:border-hl-border-strong hover:shadow-[var(--hl-shadow-sm)]',
      ai: 'hl-prism-border shadow-[var(--hl-shadow-xs)] [--hl-prism-fill:var(--hl-ai-surface)]',
      approval: 'hl-prism-border shadow-[var(--hl-shadow-xs)] [--hl-prism-fill:var(--hl-ai-surface)]',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />
  ),
)
Card.displayName = 'Card'

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col gap-1 p-[var(--hl-card-pad)] pb-0', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('hl-h3', className)} {...props} />
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('hl-small text-hl-fg-secondary', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-[var(--hl-card-pad)]', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 p-[var(--hl-card-pad)] pt-0', className)}
      {...props}
    />
  )
}

export { cardVariants }
