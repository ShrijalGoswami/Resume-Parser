'use client'

import * as React from 'react'
import { ErrorState } from '@/components/workspace/states'

/**
 * Error boundary for the remaining Classic (v1.0) surfaces — Insights, Reports,
 * Agent, Knowledge, Predictions.
 *
 * Uses the legacy `ErrorState` rather than the V4 one on purpose: the V4 component
 * is styled with `--hl-*` tokens that only resolve inside the `.hl` scope, which
 * this route group does not mount. A boundary rendered in the wrong token scope
 * would come out unstyled at exactly the moment the user needs to read it.
 */
export default function LegacyError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('Unhandled error in (legacy):', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4">
      <div className="w-full">
        <ErrorState message="This page didn’t load. Retrying usually clears it." onRetry={reset} />
        {error.digest ? (
          <p className="mt-4 text-center font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  )
}
