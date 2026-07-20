import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const textareaVariants = cva(
  'hl-body flex min-h-16 w-full rounded-hl-md border bg-hl-canvas px-3 py-2 text-hl-fg outline-none transition-[border-color] duration-[var(--hl-dur-fast)] placeholder:text-hl-fg-tertiary disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-hl-border focus-visible:border-hl-accent',
        error: 'border-[color:var(--hl-danger)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => (
    <textarea ref={ref} className={cn(textareaVariants({ variant }), className)} {...props} />
  ),
)
Textarea.displayName = 'Textarea'

export { textareaVariants }
