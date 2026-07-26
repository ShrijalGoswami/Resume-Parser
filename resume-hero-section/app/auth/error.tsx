'use client'

import * as React from 'react'
import Link from 'next/link'
import { ErrorState } from '@/components/hirelens/states/error-state'
import { Button } from '@/components/hirelens/ui/button'

/**
 * Error boundary for the authentication surface.
 *
 * Kept separate from the product boundary because the failure matters more here:
 * a crash mid sign-in, password reset or invite acceptance leaves someone locked
 * out with nothing to click. `reset()` retries the segment, and an explicit link
 * back to sign-in gives a second exit that does not depend on the crashed subtree
 * recovering.
 */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('Unhandled error in /auth:', error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-hl-canvas px-6">
      <ErrorState
        variant="route"
        title="Something interrupted sign-in"
        description="This is on our side, not your credentials. Try again, or start over from the sign-in page."
        requestId={error.digest}
        onRetry={reset}
      />
      <Button variant="ghost" asChild>
        <Link href="/auth/login">Back to sign in</Link>
      </Button>
    </div>
  )
}
