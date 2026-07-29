import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Input (Design Bible §4.7). Height tracks the control scale; the accent focus
 * ring is provided by the global `.hl :focus-visible` rule, so variants only
 * carry the resting/error border.
 */
const inputVariants = cva(
  // What you type and the placeholder that prompts it are both body size
  // (16px) — a placeholder you have to lean in for is a placeholder that
  // stops doing its job.
  'hl-body flex w-full rounded-hl-md border bg-hl-canvas px-4 text-hl-fg outline-none transition-[border-color] duration-[var(--hl-dur-fast)] placeholder:text-hl-fg-tertiary disabled:cursor-not-allowed disabled:opacity-50',
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

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      // A field you type into gets its own token — one step taller than a
      // same-size button.
      className={cn(inputVariants({ variant }), 'h-hl-input', className)}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { inputVariants }
