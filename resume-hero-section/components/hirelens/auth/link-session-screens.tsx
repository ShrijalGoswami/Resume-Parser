'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useFocusOnMount } from './use-focus-on-mount'

/**
 * The two screens that stand in front of an emailed-link form.
 *
 * Shared by `/auth/reset-password` and `/auth/accept-invite` so the wait and
 * the refusal look and behave identically on both — same spinner, same
 * announcement, same focus move to the new heading. What differs between them
 * is only the wording and the way out, which is why those are props: a reset
 * can be re-requested by the person standing there, an invite cannot.
 */

/** Shown while `useLinkSession` is still deciding. */
export function CheckingLink({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-live="polite">
      <Loader2 className="size-5 animate-spin text-hl-fg-tertiary" aria-hidden />
      <p className="hl-body text-hl-fg-secondary">{label}</p>
    </div>
  )
}

/**
 * Shown when there is no session behind the link.
 *
 * The heading is focused on arrival: this replaces a form in place, which is
 * not a navigation, so focus would otherwise stay on whatever preceded it.
 */
export function LinkExpired({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  /** The way forward, when there is one the person can take themselves. */
  action?: React.ReactNode
}) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>()
  return (
    <div className="flex flex-col gap-4">
      <h1 ref={headingRef} tabIndex={-1} className="hl-display-md outline-none">
        {title}
      </h1>
      <p className="hl-body text-hl-fg-secondary">{children}</p>
      {action}
      <p className="hl-body text-hl-fg-tertiary">
        <Link href="/auth/login" className="text-hl-accent-fg outline-none hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
