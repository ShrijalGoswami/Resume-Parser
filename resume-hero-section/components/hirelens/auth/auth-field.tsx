import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Auth input (frozen P2 design) — a bottom-border-only field with a mono
 * caption label. Distinct from the boxed `ui/input` primitive, which the auth
 * surface intentionally does not use. The 2px accent focus ring comes from the
 * global `.hl :focus-visible` rule; the underline also turns Iris on focus.
 */
export interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Optional element rendered on the right of the label row (e.g. a "Forgot password?" link). */
  labelAction?: React.ReactNode
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, labelAction, id, className, ...props }, ref) => {
    const generatedId = React.useId()
    const fieldId = id ?? generatedId
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label
            htmlFor={fieldId}
            className="font-hl-mono text-[11px] uppercase tracking-wide text-hl-fg-tertiary"
          >
            {label}
          </label>
          {labelAction}
        </div>
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            'hl-body h-9 w-full rounded-none border-0 border-b border-hl-border bg-transparent px-0 text-hl-fg outline-none transition-[border-color] duration-[var(--hl-dur-fast)] placeholder:text-hl-fg-tertiary focus-visible:border-hl-accent',
            className,
          )}
          {...props}
        />
      </div>
    )
  },
)
AuthField.displayName = 'AuthField'
