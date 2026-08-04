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
  /**
   * Id(s) of the message(s) describing this field, wired to `aria-describedby`.
   *
   * Space-separate to attach more than one — a password field points at both
   * its error line and its live requirement checklist. Described unconditionally
   * rather than only while `invalid`: the checklist is guidance a screen-reader
   * user needs *before* they trip the error, not after.
   */
  describedBy?: string
  /** Id of the error message. Attached only while `invalid`, so a stale id is never announced. */
  errorId?: string
  /**
   * Control rendered inside the field, at the trailing edge — the show/hide
   * password toggle. It sits inside the input's box rather than after it so the
   * underline still reads as one field, and the input gains right padding so a
   * long value cannot slide underneath it.
   */
  trailing?: React.ReactNode
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  (
    { label, labelAction, id, className, invalid, errorId, describedBy, trailing, ...props },
    ref,
  ) => {
    const generatedId = React.useId()
    const fieldId = id ?? generatedId
    const described =
      [describedBy, invalid && errorId ? errorId : null].filter(Boolean).join(' ') || undefined
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
        {/* The border lives on the input, not this wrapper, so the underline
            keeps reacting to :focus-visible and to `invalid` exactly as before
            adornments existed. */}
        <div className="relative">
          <input
            ref={ref}
            id={fieldId}
            aria-invalid={invalid || undefined}
            aria-describedby={described}
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
              trailing && 'pr-12',
              className,
            )}
            {...props}
          />
          {trailing ? (
            <span className="absolute inset-y-0 right-0 flex items-center">{trailing}</span>
          ) : null}
        </div>
      </div>
    )
  },
)
AuthField.displayName = 'AuthField'
