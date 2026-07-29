import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

/**
 * Button (Design Bible §4.1). Variants: primary / secondary / ghost / danger /
 * ai (prism gradient border + ✨). Sizes track the shared control scale
 * (--hl-control-h-*). Focus ring is inherited from the global `.hl` rule.
 */
const buttonVariants = cva(
  // Label sits at `hl-ui` (15/530) and icons at the token size, so a
  // button reads as something you press rather than as a link that happens to
  // have a border.
  'hl-ui relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-hl-md outline-none transition-[color,background-color,border-color,filter] duration-[var(--hl-dur-fast)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-hl-icon-sm [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary carries weight as well as fill — it should be the single
        // heaviest thing on the screen it lives on.
        primary:
          'bg-hl-accent font-semibold text-white shadow-[var(--hl-shadow-xs)] hover:bg-hl-accent-hover active:scale-[0.98]',
        // Secondary must stay elegant without disappearing: a real border and
        // full-strength foreground, not a tinted ghost.
        secondary:
          'border border-hl-border-strong bg-hl-canvas text-hl-fg hover:border-hl-border-strong hover:bg-hl-subtle',
        ghost: 'text-hl-fg-secondary hover:bg-hl-subtle hover:text-hl-fg',
        danger:
          'bg-[color:var(--hl-danger)] font-semibold text-white hover:brightness-95 active:scale-[0.98]',
        ai: 'hl-prism-border text-hl-fg hover:brightness-[0.97]',
      },
      size: {
        sm: 'h-hl-control-sm px-3',
        md: 'h-hl-control-md px-3.5',
        lg: 'h-hl-control-lg px-5',
        icon: 'h-hl-control-md w-hl-control-md px-0',
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
