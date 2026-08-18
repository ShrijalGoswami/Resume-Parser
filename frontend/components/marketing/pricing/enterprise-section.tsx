'use client'

import * as React from 'react'
import Link from 'next/link'
import { Reveal } from '@/components/marketing/motion'
import {
  FEATURES,
  FEATURE_KEYS,
  type CatalogFeature,
} from '@/components/hirelens/lib/entitlements/catalog'

/**
 * Enterprise.
 *
 * Given its own band, on ink, because it is a different transaction: not a
 * card you click but a conversation you start, with terms that do not exist
 * until someone writes them. Rendering it as a fourth equal card with "Custom"
 * where a number goes invites a comparison the visitor cannot complete.
 *
 * The capability list is still catalog-derived — the same keys the server
 * gates on — so what Sales can promise and what the product enforces cannot
 * drift apart. Only the framing is bespoke.
 *
 * Nothing here claims a certification, an SLA figure, or a compliance status.
 * Those are the easiest sentences to write on a page like this and the ones a
 * customer is most entitled to hold us to.
 */

const ENTERPRISE_NOTES: Partial<Record<string, string>> = {
  sso: 'SAML or OIDC for the whole organization.',
  // WAS: "Available to every plan to read — Enterprise adds retention and
  // export controls." That contradicted the comparison table directly above it
  // on the same page, which is generated from the catalog where `audit_logs`
  // carries `minPlan: 'enterprise'` and therefore renders "—" for Free, Plus
  // AND Pro. A visitor reading both saw the vendor disagree with itself about
  // what a plan includes.
  //
  // The table is right, because the table is what the server enforces. This map
  // is the one hand-written thing on the surface and it is exactly where the
  // drift landed — which is the argument for keeping such maps short.
  audit_logs: 'Every action recorded and exportable, with retention you control.',
  api_access: 'Programmatic access with scoped organization keys.',
  webhooks: 'Hiring events pushed to your own endpoints.',
  autonomous_agent: 'Continuous pipeline scanning with recommended actions.',
  dedicated_support: 'A named contact and a response-time commitment.',
}

export function EnterpriseSection() {
  const features: CatalogFeature[] = React.useMemo(
    () => FEATURE_KEYS.map((key) => FEATURES[key]).filter((f) => f.minPlan === 'enterprise'),
    [],
  )

  return (
    <section
      id="enterprise"
      className="border-y border-mkt-border bg-[color:var(--mkt-ink)] px-8 py-28"
    >
      <div className="mx-auto max-w-[1100px]">
        <Reveal className="mb-14 max-w-2xl">
          <p className="mb-4 mkt-label text-[color:var(--mkt-dark-fg-variant)]">Enterprise</p>
          <h2 className="mb-4 font-mkt-display text-3xl text-[color:var(--mkt-dark-fg)]">
            Your identity, your rules.
          </h2>
          <p className="mkt-body text-[color:var(--mkt-dark-fg-variant)]">
            For organizations that need Hirevo to run inside their own boundaries — their
            sign-on, their retention policy, their audit trail. Priced against what you actually
            need rather than a tier.
          </p>
        </Reveal>

        <div className="mb-14 grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
          {features.map((feature, index) => (
            <Reveal key={feature.key} delay={index * 60} className="flex flex-col gap-1.5">
              <div className="flex items-start gap-2.5">
                <span
                  className="material-symbols-outlined mt-px text-[18px] text-[color:var(--mkt-dark-primary)]"
                  aria-hidden="true"
                >
                  check
                </span>
                <h3 className="mkt-body-lg font-medium text-[color:var(--mkt-dark-fg)]">
                  {feature.label}
                </h3>
              </div>
              <p className="pl-[28px] mkt-body-sm text-[color:var(--mkt-dark-fg-variant)]">
                {ENTERPRISE_NOTES[feature.key] ?? feature.blurb}
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal className="flex flex-col items-start gap-4 border-t border-[color:var(--mkt-dark-outline)] pt-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="mkt-body-sm text-[color:var(--mkt-dark-fg-variant)]">
            Tell us how your hiring works and what has to stay inside your walls.
          </p>
          {/* `/contact` rather than a bare `mailto:` — a `mailto:` does nothing
              for anyone on webmail without a protocol handler, and fails
              silently when it fails, which on an enterprise enquiry means the
              lead simply never arrives. */}
          <Link
            href="/contact"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-[0.25rem] bg-[color:var(--mkt-dark-fg)] px-5 py-2.5 text-base font-medium text-[color:var(--mkt-ink)] transition-opacity hover:opacity-90"
          >
            Talk to sales
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
