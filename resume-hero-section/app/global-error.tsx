'use client'

import * as React from 'react'

/**
 * Last-resort boundary: catches errors thrown by the root layout itself.
 *
 * This one replaces the whole document, so it must render its own `<html>` and
 * `<body>`. It deliberately imports nothing and uses inline styles rather than
 * the design system: if the root layout failed, the font variables, `.hl` token
 * scope and provider stack cannot be assumed to exist, and a boundary that
 * depends on the thing that just broke is not a boundary.
 *
 * Route-group boundaries (`app/(hirelens)/error.tsx`, `app/auth/error.tsx`) handle
 * everything below the root and use the real design system.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('Unhandled root error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#FBFCFF',
          color: '#141A2E',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <main style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
            HireLens couldn’t start
          </h1>
          <p style={{ margin: '0 0 1.25rem', lineHeight: 1.5, color: '#4A5578' }}>
            Something failed before the app could load. Reloading usually clears it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              cursor: 'pointer',
              border: 0,
              borderRadius: 8,
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#FFFFFF',
              background: '#6355EA',
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: '1.25rem',
                fontSize: '0.75rem',
                color: '#626B8A',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  )
}
