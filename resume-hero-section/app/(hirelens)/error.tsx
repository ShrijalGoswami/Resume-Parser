'use client'

import * as React from 'react'
import { ErrorState } from '@/components/hirelens/states/error-state'

/**
 * Route-level error boundary for the V4 product surface.
 *
 * Without this, an uncaught render error anywhere under `(hirelens)` fell through
 * to Next's default handler — a blank page in production with no way back except
 * a manual reload. Every other failure mode in this app has a recovery path
 * (queries surface an ErrorState with retry, offline shows a banner); a render
 * crash should not be the exception.
 *
 * `reset()` re-renders the segment rather than reloading the document, so the
 * shell, session and query cache survive a transient failure. `digest` is the
 * server-side error fingerprint — the only diagnostic worth showing a user, and
 * the one that correlates with the backend request log.
 */
export default function HireLensError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Surfaced to the browser console for local debugging and picked up by any
    // client error reporter that hooks console/window.onerror in production.
    console.error('Unhandled error in (hirelens):', error)
  }, [error])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-hl-canvas px-6">
      <ErrorState
        variant="route"
        title="This screen didn’t load"
        description="Something went wrong rendering this page. Retrying usually clears it — your work is saved."
        requestId={error.digest}
        onRetry={reset}
      />
    </div>
  )
}
