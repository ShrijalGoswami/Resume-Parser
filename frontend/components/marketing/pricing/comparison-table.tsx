'use client'

import * as React from 'react'
import {
  CAMPAIGN_CANDIDATE_LIMITS,
  CORE_PLAN_KEYS,
  FEATURES,
  FEATURE_KEYS,
  LIMITS,
  METRIC_KEYS,
  METRIC_LABELS,
  PLAN_LABELS,
  isAtLeast,
  isUnlimited,
  metricWindow,
  type MetricKey,
  type PlanKey,
} from '@/components/hirelens/lib/entitlements/catalog'

/**
 * The full plan comparison, DERIVED FROM THE ENTITLEMENT CATALOG.
 *
 * Not one row is written by hand. Limits come from `LIMITS` and
 * `METRIC_LABELS`; every capability row is a catalog feature, grouped by the
 * tier that introduces it; each cell is `isAtLeast(plan, feature.minPlan)` —
 * the same comparison the server uses to decide access.
 *
 * This is the whole point of the table. A pricing page that lists features by
 * hand is a second source of truth for what the product sells, and it goes
 * wrong silently: a feature moves tier, enforcement follows the catalog, and
 * the page keeps promising it on a plan that no longer includes it. The
 * customer discovers the difference after paying, which is the worst possible
 * moment and the hardest kind of trust to get back.
 *
 * The catalog is pure data with no React and no `hl-` tokens, so importing it
 * into the `.mkt` scope costs nothing and couples nothing.
 *
 * The `founding` ruleset is deliberately absent: it is not for sale, and a
 * pricing page is a list of things a visitor can buy.
 */

function CheckCell({ included, label }: { included: boolean; label: string }) {
  return (
    <td className="border-b border-mkt-border-subtle px-4 py-3.5 text-center">
      {included ? (
        <>
          <span
            className="material-symbols-outlined text-[18px] text-mkt-accent-text"
            aria-hidden="true"
          >
            check
          </span>
          <span className="sr-only">{label}: included</span>
        </>
      ) : (
        <>
          {/* An em dash, not an empty cell. A blank reads as "we forgot to
              fill this in"; a mark reads as a deliberate answer. */}
          <span className="text-mkt-fg-tertiary" aria-hidden="true">
            —
          </span>
          <span className="sr-only">{label}: not included</span>
        </>
      )}
    </td>
  )
}

/** "2" · "25 / month" · "Unlimited" — the same figures the server enforces. */
function limitText(plan: PlanKey, metric: MetricKey): string {
  const limit = LIMITS[plan][metric]
  if (isUnlimited(limit)) return 'Unlimited'
  // A zero allowance means the capability is not on this plan at all — the
  // feature rows below say that; "0" in a limits row reads as a misprint.
  if (limit === 0) return '—'
  if (metric === 'interview_packs' || metric === 'copilot_questions') {
    return metricWindow(metric, plan) === 'month' ? `${limit} / month` : `${limit} total`
  }
  if (metric === 'resumes') {
    // Free's credits are for the lifetime of the organization — it is a trial,
    // not an allowance. Labelling them "/month" would promise a reset that
    // never comes, and the customer would find out in week five.
    return metricWindow('resumes', plan) === 'month' ? `${limit} / month` : `${limit} total`
  }
  return String(limit)
}

/** The per-campaign candidate cap — its own row: it is scoped per role, not
 *  per organization, so it does not live in `LIMITS`. */
function campaignCandidateText(plan: PlanKey): string {
  const limit = CAMPAIGN_CANDIDATE_LIMITS[plan]
  return isUnlimited(limit) ? 'Unlimited' : `${limit} / role`
}

function SectionRow({ title }: { title: string }) {
  return (
    <tr>
      <th
        scope="colgroup"
        colSpan={CORE_PLAN_KEYS.length + 1}
        className="border-b border-mkt-border bg-mkt-subtle px-4 py-2.5 text-left mkt-label text-mkt-fg-secondary"
      >
        {title}
      </th>
    </tr>
  )
}

export function ComparisonTable({ featured }: { featured: PlanKey }) {
  // Group capabilities by the tier that introduces them, in catalog order, so
  // the table reads as "what each step up buys you" rather than an alphabetical
  // list. Empty groups are dropped — a heading over nothing is worse than none.
  const groups = React.useMemo(
    () =>
      CORE_PLAN_KEYS.map((plan) => ({
        plan,
        features: FEATURE_KEYS.map((key) => FEATURES[key]).filter((f) => f.minPlan === plan),
      })).filter((group) => group.features.length > 0),
    [],
  )

  return (
    <div className="overflow-x-auto [contain:paint]">
      {/* The table scrolls inside its own container rather than pushing the
          page sideways: five columns cannot fit a phone, and a horizontally
          scrolling document is a far worse failure than a scrolling table.

          `contain: paint` IS LOAD-BEARING, not decoration. `overflow-x: auto`
          clips the table visually and lets it scroll — but it does NOT stop the
          child's extent contributing to `documentElement.scrollWidth` when an
          ancestor carries `zoom`, and `.mkt` carries `zoom: 0.85`. Measured at
          390px: without it the document scrolled sideways by 201px while the
          table scrolled correctly inside its box, so the page moved AND the
          table moved. Paint containment takes it to exactly 0.

          Verified in Chromium by mutating the live page: hiding the neural
          field changed nothing, zeroing the table's min-width only halved it,
          and `contain: paint` on this element alone fixed it completely. */}
      <table className="w-full min-w-[720px] border-collapse text-left">
        <caption className="sr-only">
          Feature and limit comparison across the Free, Plus, Pro and Custom plans
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="w-[34%] border-b border-mkt-border px-4 pb-4 text-left mkt-label text-mkt-fg-tertiary"
            >
              Compare plans
            </th>
            {CORE_PLAN_KEYS.map((plan) => (
              <th
                key={plan}
                scope="col"
                className={`border-b px-4 pb-4 text-center ${
                  plan === featured
                    ? 'border-mkt-border-strong text-mkt-fg'
                    : 'border-mkt-border text-mkt-fg-secondary'
                }`}
              >
                <span className="mkt-body-lg font-medium">{PLAN_LABELS[plan]}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <SectionRow title="Limits" />
          {METRIC_KEYS.map((metric) => (
            <tr key={metric}>
              <th
                scope="row"
                className="border-b border-mkt-border-subtle px-4 py-3.5 text-left mkt-body-sm font-normal text-mkt-fg"
              >
                <span className="capitalize">{METRIC_LABELS[metric]}</span>
              </th>
              {CORE_PLAN_KEYS.map((plan) => (
                <td
                  key={plan}
                  className="border-b border-mkt-border-subtle px-4 py-3.5 text-center font-mkt-mono mkt-body-sm text-mkt-fg-secondary"
                >
                  {limitText(plan, metric)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th
              scope="row"
              className="border-b border-mkt-border-subtle px-4 py-3.5 text-left mkt-body-sm font-normal text-mkt-fg"
            >
              <span className="capitalize">Candidates per role</span>
            </th>
            {CORE_PLAN_KEYS.map((plan) => (
              <td
                key={plan}
                className="border-b border-mkt-border-subtle px-4 py-3.5 text-center font-mkt-mono mkt-body-sm text-mkt-fg-secondary"
              >
                {campaignCandidateText(plan)}
              </td>
            ))}
          </tr>

          {groups.map((group) => (
            <React.Fragment key={group.plan}>
              <SectionRow title={`${PLAN_LABELS[group.plan]} and above`} />
              {group.features.map((feature) => (
                <tr key={feature.key}>
                  <th
                    scope="row"
                    className="border-b border-mkt-border-subtle px-4 py-3.5 text-left font-normal"
                  >
                    <span className="mkt-body-sm text-mkt-fg">{feature.label}</span>
                    {feature.blurb ? (
                      <span className="mt-0.5 block mkt-label-sm text-mkt-fg-tertiary">
                        {feature.blurb}
                      </span>
                    ) : null}
                  </th>
                  {CORE_PLAN_KEYS.map((plan) => (
                    <CheckCell
                      key={plan}
                      included={isAtLeast(plan, feature.minPlan)}
                      label={`${feature.label} on ${PLAN_LABELS[plan]}`}
                    />
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
