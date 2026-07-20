import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

/**
 * Button (Design Bible §4.1). Variants: primary / secondary / ghost / danger /
 * ai (prism gradient border + ✨). Sizes track the density scale
 * (--hl-control-h-*). Focus ring is inherited from the global `.hl` rule.
 */
const buttonVariants = cva(
  'hl-body-medium relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-hl-md outline-none transition-[color,background-color,border-color,filter] duration-[var(--hl-dur-fast)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-hl-accent text-white hover:bg-hl-accent-hover active:scale-[0.98]',
        secondary: 'border border-hl-border bg-hl-canvas text-hl-fg hover:bg-hl-subtle',
        ghost: 'text-hl-fg-secondary hover:bg-hl-subtle hover:text-hl-fg',
        danger:
          'bg-[color:var(--hl-danger)] text-white hover:brightness-95 active:scale-[0.98]',
        ai: 'hl-prism-border text-hl-fg hover:brightness-[0.97]',
      },
      size: {
        sm: 'h-[var(--hl-control-h-sm)] px-2.5 text-[13px]',
        md: 'h-[var(--hl-control-h-md)] px-3',
        lg: 'h-[var(--hl-control-h-lg)] px-4',
        icon: 'h-[var(--hl-control-h-md)] w-[var(--hl-control-h-md)] px-0',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as the child element (Radix Slot), e.g. an anchor. */
  asChild?: boolean
  /** Shows an inline spinner and disables the button. */
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'
    const showSpinner = loading && !asChild

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {showSpinner ? (
          <>
            <Spinner className="size-4" />
            <span className="opacity-70">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
