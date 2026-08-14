'use client'

import * as React from 'react'
import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { passwordRules } from '@/lib/password-policy'

/**
 * The live requirement checklist under a new-password field.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT REPLACES. `minLength={8}` and nothing else. The rule existed but was
 * invisible until submission, at which point the browser's own bubble said
 * "Please lengthen this text to 8 characters or more" — a sentence written by
 * the browser vendor, in the browser's voice, that vanishes on the next
 * keystroke and is not announced to a screen reader at all.
 *
 * ACCESSIBILITY IS THE WHOLE DESIGN HERE, not a pass over it afterwards.
 *
 *   · The colour and the tick are redundant. Each item carries visually-hidden
 *     text — "met" / "not met" — so the state does not depend on distinguishing
 *     a green tick from a grey ring, which is precisely the distinction that
 *     fails for the people most likely to be typing carefully.
 *
 *   · `aria-live="polite"` on the list, so a satisfied rule is *announced* as
 *     it is satisfied rather than discovered on submit. Polite, not assertive:
 *     this is progress, not an alarm, and it must not interrupt the character
 *     echo of the field being typed into.
 *
 *   · The list is referenced by the input's `aria-describedby`, so arriving at
 *     the field reads the requirements before a single character is typed.
 *     A rule discovered only by breaking it is not a rule, it is a trap.
 *
 * ADVISORY ITEMS NEVER TURN RED. Only a `required` rule that has been left
 * unmet after the field has been touched is styled as a failure. The others are
 * suggestions, and a suggestion rendered in the error colour is a lie about
 * what the form will accept — see `lib/password-policy.ts` for why the
 * distinction is enforced there rather than here.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function PasswordRequirements({
  id,
  password,
  /** Only after the field has been touched may an unmet requirement look like a failure. */
  showErrors = false,
  className,
}: {
  id: string
  password: string
  showErrors?: boolean
  className?: string
}) {
  const rules = passwordRules(password)

  return (
    <ul
      id={id}
      aria-live="polite"
      className={cn('flex flex-col gap-1', className)}
    >
      {rules.map((rule) => {
        const failing = showErrors && rule.required && !rule.met
        return (
          <li
            key={rule.id}
            className={cn(
              'hl-caption flex items-center gap-2 transition-colors',
              rule.met
                ? 'text-hl-success'
                : failing
                  ? 'text-hl-danger'
                  : 'text-hl-fg-tertiary',
            )}
          >
            {rule.met ? (
              <Check className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <Circle className="size-3.5 shrink-0" aria-hidden />
            )}
            <span>{rule.label}</span>
            {/* The state, in words, for anyone the colour and the glyph do not reach. */}
            <span className="sr-only">{rule.met ? '— met' : '— not met'}</span>
          </li>
        )
      })}
    </ul>
  )
}
