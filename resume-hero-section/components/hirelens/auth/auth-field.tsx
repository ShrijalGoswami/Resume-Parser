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
  /**
   * Marks the field as the thing that failed. Until this existed a rejected
   * sign-in left the password field looking untouched — accent underline, accent
   * focus ring — with the only signal a line of red text below it. The field
   * that caused the error should carry the error.
   */
  invalid?: boolean
  /** Id of the message describing the error, wired to `aria-describedby`. */
  errorId?: string
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, labelAction, id, className, invalid, errorId, ...props }, ref) => {
    const generatedId = React.useId()
    const fieldId = id ?? generatedId
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label
            htmlFor={fieldId}
            className="hl-label font-hl-mono text-hl-fg-tertiary"
          >
            {label}
          </label>
          {labelAction}
        </div>
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid && errorId ? errorId : undefined}
          className={cn(
            'hl-body h-hl-input w-full rounded-none border-0 border-b bg-transparent px-0 text-hl-fg outline-none transition-[border-color] duration-[var(--hl-dur-fast)] placeholder:text-hl-fg-tertiary',
            // The invalid underline outranks the focus colour on purpose: the
            // field is still focused when the error lands, and "focused" is not
            // the news. This mirrors the rule documented for the boxed field in
            // globals.css — an errored field keeps its red border and merely
            // gains the accent ring.
            invalid
              ? 'border-hl-danger focus-visible:border-hl-danger'
              : 'border-hl-border focus-visible:border-hl-accent',
            className,
          )}
          {...props}
        />
      </div>
    )
  },
)
AuthField.displayName = 'AuthField'
