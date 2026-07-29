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
      // `hl-surface` supplies the raised plane and the lit top edge; the
      // border is the hairline that keeps it crisp on light backgrounds.
      default: 'hl-surface border border-hl-border',
      // Interactive cards travel 2px and gain a real elevation step, so the
      // hover reads as the card lifting rather than as a colour change.
      interactive:
        'hl-surface group cursor-pointer border border-hl-border transition-[box-shadow,border-color,transform] duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)] hover:-translate-y-0.5 hover:border-hl-border-strong hover:shadow-[var(--hl-shadow-md)] active:translate-y-0 active:shadow-[var(--hl-shadow-sm)]',
      // A card that is already lifted — used for the one panel on a screen
      // that should read as floating above the rest.
      elevated: 'hl-surface border border-hl-border shadow-[var(--hl-shadow-md)]',
      ai: 'hl-prism-border shadow-[var(--hl-shadow-sm)] [--hl-prism-fill:var(--hl-ai-surface)]',
      approval: 'hl-prism-border shadow-[var(--hl-shadow-sm)] [--hl-prism-fill:var(--hl-ai-surface)]',
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
