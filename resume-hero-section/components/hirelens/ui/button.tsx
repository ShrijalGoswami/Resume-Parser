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
  // `box-shadow` is in the transition list so the primary variant's accent glow
  // fades in on hover instead of snapping. Background-image (the CTA gradient)
  // is not animatable and is intentionally absent.
  // `active:scale-[0.98]` is on the BASE, not per-variant. It used to sit only
  // on `primary` and `danger` — but `secondary` and `ghost` are most of the
  // controls in this product (the rail, filter bars, "Hold", "Add note",
  // "Upload candidates"), so the majority of clicks produced no pressed
  // feedback at all. Only the two loudest buttons acknowledged being pressed,
  // which reads as the rest being slightly dead. `transform` joins the
  // transition list for the same reason `box-shadow` is there: so the press
  // eases rather than snaps. Under `prefers-reduced-motion` the blanket rule
  // collapses the duration to ~0ms, so the press becomes an instant state
  // change rather than disappearing — which is what that preference asks for.
  'hl-ui relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-hl-md outline-none transition-[color,background-color,border-color,box-shadow,filter,transform] duration-[var(--hl-dur-fast)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-hl-icon-sm [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // Primary carries weight as well as fill — it should be the single
        // heaviest thing on the screen it lives on.
        //
        // FLAT FILL, NOT A GRADIENT (V2 §7/§12). This was `hl-gradient-cta`,
        // the violet identity gradient with a hover glow — both of which V2
        // §23 removes by name. The fill is the accent solid (terracotta in
        // dark, where white clears AA at 4.54:1), and hover DEEPENS to the
        // accent-hover step: V2 buttons never brighten and never glow.
        primary:
          'bg-hl-accent font-semibold text-white shadow-[var(--hl-shadow-xs)] hover:bg-[var(--hl-accent-hover)]',
        // Secondary must stay elegant without disappearing: a real border and
        // full-strength foreground, not a tinted ghost.
        secondary:
          'border border-hl-border-strong bg-hl-canvas text-hl-fg hover:border-hl-border-strong hover:bg-hl-subtle',
        ghost: 'text-hl-fg-secondary hover:bg-hl-subtle hover:text-hl-fg',
        // The SOLID danger tone, not the text tone: `--hl-danger` is the
        // AA-safe TYPE colour (#E07A7A in dark — white on it fails), while
        // `--hl-danger-solid` is the fill white labels were measured on
        // (6.51:1 in dark). The two-tone contract is the same as the accent's.
        danger:
          'bg-[color:var(--hl-danger-solid)] font-semibold text-white hover:brightness-95',
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
