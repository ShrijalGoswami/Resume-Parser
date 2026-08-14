'use client'

import { Analytics } from '@vercel/analytics/next'
import { redactAnalyticsUrl } from '@/lib/analytics/redact'

/**
 * `<Analytics />` with every page-view URL passed through `redactAnalyticsUrl`
 * first, so campaign and candidate identifiers never reach the provider. The
 * reasoning for the redaction itself lives in `lib/analytics/redact.ts`.
 *
 * THIS WRAPPER EXISTS BECAUSE `beforeSend` IS A FUNCTION. The root layout is a
 * server component, and a function cannot cross that boundary as a prop — so
 * the callback has to be supplied from a client component. That is the whole
 * job of this file; the policy it applies is deliberately somewhere else, where
 * it can be unit-tested without rendering anything.
 */
export function RedactedAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: redactAnalyticsUrl(event.url) })} />
}
