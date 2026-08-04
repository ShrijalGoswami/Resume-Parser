'use client'

import * as React from 'react'

/**
 * Error boundary for the public marketing page.
 *
 * Self-contained inline styles, matching the marketing surface's dark hero rather
 * than importing either design system: this group mounts no `.hl` scope, and the
 * `mkt-*` tokens live in a stylesheet whose load is not guaranteed when the
 * segment itself failed. A first-time visitor hitting a blank page is the worst
 * possible outcome here, so this trades styling fidelity for certainty.
 */
export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('Unhandled error in (marketing):', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#0A0C18',
        color: '#EEF0FA',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <main style={{ maxWidth: '30rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
          This page didn’t load
        </h1>
        <p
          style={{
            margin: '0 0 1.5rem',
            lineHeight: 1.6,
            color: 'rgba(237, 241, 240, 0.62)',
          }}
        >
          Something went wrong on our side. Try again, or head straight to sign in.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
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
              color: '#0A0C18',
              background: '#EEF0FA',
            }}
          >
            Try again
          </button>
          <a
            href="/auth/login"
            style={{
              borderRadius: 8,
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#EEF0FA',
              textDecoration: 'none',
              border: '1px solid rgba(237, 241, 240, 0.24)',
            }}
          >
            Sign in
          </a>
        </div>
      </main>
    </div>
  )
}
