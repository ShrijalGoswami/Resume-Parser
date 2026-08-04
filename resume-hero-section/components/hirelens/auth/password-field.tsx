'use client'

import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { AuthField, type AuthFieldProps } from './auth-field'

/**
 * A password field that can be read back.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS. Every password in the product was write-only. On a phone,
 * with autocorrect off and a mixed-case password, the only way to find a typo
 * was to fail the sign-in and start again — and on the reset and invite screens,
 * where a mistyped password is *saved* rather than rejected, the person is
 * locked out of an account they just created and has no way to discover why.
 * Revealing the field is the fix, and it has been the platform convention long
 * enough that its absence reads as an oversight.
 *
 * IT IS A REAL BUTTON. Not a div with onClick, not the input's own
 * `-ms-reveal`: a `type="button"` (so it cannot submit the form), in the tab
 * order, operable by Enter and Space for free. Its accessible name states the
 * action — "Show password" / "Hide password" — rather than the state, because a
 * button named for its state is ambiguous about what pressing it will do.
 *
 * `aria-pressed` carries the state alongside that name, and `aria-controls`
 * points at the field, so a screen reader announces the toggle *and* what it
 * governs without the visual association the sighted user gets for free.
 *
 * THE FIELD KEEPS ITS FOCUS AND ITS CARET. Toggling swaps `type`, which some
 * browsers treat as grounds to drop the selection; the caret is captured and
 * restored so revealing a password mid-word does not send the cursor to the
 * end. The button itself is `tabIndex`-normal but never steals focus on click.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export interface PasswordFieldProps extends Omit<AuthFieldProps, 'type' | 'trailing'> {
  /**
   * Hides the reveal control. Used where a field is decorative or disabled;
   * the toggle is otherwise always offered, including on sign-in.
   */
  revealable?: boolean
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ revealable = true, id, ...props }, forwardedRef) => {
    const [visible, setVisible] = React.useState(false)
    const generatedId = React.useId()
    const fieldId = id ?? generatedId
    const inputRef = React.useRef<HTMLInputElement | null>(null)

    // Merge the caller's ref with the local one — the caller may want to focus
    // this field (error recovery, step transitions) and we need it for the caret.
    const setRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node
        if (typeof forwardedRef === 'function') forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )

    function toggle() {
      const input = inputRef.current
      const start = input?.selectionStart ?? null
      const end = input?.selectionEnd ?? null
      setVisible((current) => !current)
      // After the type swap has been applied. Guarded because selection APIs
      // throw on some input types in older engines.
      requestAnimationFrame(() => {
        if (!input || start === null || end === null) return
        input.focus()
        try {
          input.setSelectionRange(start, end)
        } catch {
          /* selection unsupported — focus alone is the useful part */
        }
      })
    }

    return (
      <AuthField
        {...props}
        ref={setRef}
        id={fieldId}
        type={visible ? 'text' : 'password'}
        trailing={
          revealable ? (
            <button
              type="button"
              onClick={toggle}
              // Without this the input blurs on mousedown and the caret restore
              // above becomes a visible jump rather than a no-op.
              onMouseDown={(event) => event.preventDefault()}
              aria-label={visible ? 'Hide password' : 'Show password'}
              aria-pressed={visible}
              aria-controls={fieldId}
              className="flex size-11 items-center justify-center text-hl-fg-tertiary transition-colors hover:text-hl-fg"
            >
              {visible ? (
                <EyeOff className="size-[18px]" aria-hidden />
              ) : (
                <Eye className="size-[18px]" aria-hidden />
              )}
            </button>
          ) : null
        }
      />
    )
  },
)
PasswordField.displayName = 'PasswordField'
