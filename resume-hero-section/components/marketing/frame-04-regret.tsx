'use client'

import Link from 'next/link'

import { Reveal } from './motion'

/**
 * Frame 4 — `hirelens_marketing_the_regret_climax_frame_4`.
 *
 * The emotional peak: the Deep Ink regret-analysis section (with the breathing
 * aurora behind it and the comparison panel floating on top), the three AI
 * tenets, and the enterprise trust strip.
 *
 * Frame 4 uses a 1280px container with 16/32px side margins, and the deepest
 * ink (--mkt-ink) rather than frame 2's --mkt-dark-bg.
 */

/**
 * Trust marks — WHAT IS ACTUALLY TRUE, which is less than this strip claimed.
 *
 * It read: "SOC 2 Type II — Audited annually, report on request" · "SSO / SAML
 * — Okta, Entra, Google Workspace" · "Audit trail — Every decision, immutable,
 * exportable" · "Data residency — US, EU, or your own region".
 *
 * Every one of those was false. There is no SOC 2 audit and no report to send
 * anyone who asks for one. SSO is an unbuilt Enterprise capability. There is no
 * audit trail for administrative operations at all — the absence of one is a
 * tracked hardening item, and it is the reason a production incident in July
 * left no record of who deleted what. And the entire deployment is a single
 * database in Singapore, so a choice of three regions was false in all three
 * branches.
 *
 * These are the claims an enterprise buyer forwards to their security reviewer,
 * and "report on request" invites them to ask in writing for a document that
 * does not exist.
 *
 * Each mark below is now something a reviewer could verify today, and the
 * things that are merely PLANNED say so in their own words. The honest, longer
 * answers live on /privacy, which this strip now points at.
 */
const TRUST_MARKS = [
  {
    mark: 'Row-level isolation',
    detail: 'Enforced in the database, not the application layer',
  },
  {
    mark: 'Encrypted in transit and at rest',
    detail: 'Across storage, database and backups',
  },
  {
    mark: 'Data stored in Singapore',
    detail: 'One region today — no residency choice yet',
  },
  {
    mark: 'Your data trains nothing',
    detail: 'Never used to serve another organization',
  },
]

/** The two candidates, compared on the dimensions that decide the role rather
 *  than on a single composite score. The divergence column is the point: it
 *  names where the two genuinely differ, which is where regret lives. */
const COMPARISON = [
  { dimension: 'Domain depth', sarah: 91, marcus: 64, favours: 'Sarah' },
  { dimension: 'Systems scale', sarah: 68, marcus: 93, favours: 'Marcus' },
  { dimension: 'Team leadership', sarah: 74, marcus: 86, favours: 'Marcus' },
  { dimension: 'GTM motion', sarah: 88, marcus: 41, favours: 'Sarah' },
]

/** The symmetrical question, asked in both directions. */
const REGRET_BOTH_WAYS = [
  {
    choice: 'If you pick Marcus',
    cost: 'Slower time-to-market in Q3 — nobody left who has run early-stage GTM.',
    tone: 'text-mkt-focus-soft',
  },
  {
    choice: 'If you pick Sarah',
    cost: 'Re-architecture slips a quarter — the scale experience is not in the room.',
    tone: 'text-mkt-focus-legible',
  },
]

/** Micro-proofs for the three tenets — each row gets the product detail that
 *  makes its claim checkable rather than a heading and a sentence alone. */
const TENET_PROOF = [
  '17 spans cited on this candidate',
  '52 Soft — shown, not rounded up',
  'Reversible · logged · attributable',
]

export function Frame04Regret() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* REGRET ANALYSIS                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-t border-mkt-border-strong bg-mkt-ink px-4 py-32 text-mkt-canvas">
        <div className="mkt-aurora" />

        <div className="relative z-10 mx-auto max-w-[1280px]">
          <Reveal className="mx-auto mb-16 max-w-4xl text-center">
            <h2 className="mb-8 font-mkt-display text-4xl leading-tight font-light tracking-tight text-white md:text-5xl md:leading-none">
              Every tool tells you who&rsquo;s strongest.
              <br />
              Only HireLens tells you what you&rsquo;d regret.
            </h2>
            <p className="font-mkt-display text-xl italic text-mkt-fg-tertiary">
              The question no other tool asks.
            </p>
          </Reveal>

          {/* Product frame */}
          <Reveal delay={100}>
            <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-canvas text-mkt-fg shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
              <div className="mkt-prism-border-top h-0 w-full" />

              <div className="flex items-center justify-between border-b border-mkt-border-subtle bg-mkt-subtle/50 px-6 py-5 md:px-8">
                <div className="flex items-center gap-3">
                  <span
                    className="material-symbols-outlined text-mkt-fg-secondary"
                    aria-hidden="true"
                  >
                    compare_arrows
                  </span>
                  <h3 className="text-base font-medium tracking-wide">
                    Regret Analysis: Sarah vs Marcus
                  </h3>
                </div>
                <span className="mkt-data text-mkt-fg-tertiary">
                  Role 884-A · 28 evidence spans
                </span>
              </div>

              <div className="flex flex-col gap-8 p-6 md:flex-row md:p-8">
                {/* Strengths alignment — read across the row, not down a
                    column: each dimension shows both candidates against each
                    other, and which way it leans. */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-baseline justify-between">
                    <h4 className="mkt-label text-mkt-fg-secondary">
                      Strengths Alignment
                    </h4>
                    <span className="mkt-data text-mkt-fg-tertiary">
                      Sarah 82 Sharp · Marcus 88 Focus
                    </span>
                  </div>

                  <ul className="space-y-3">
                    {COMPARISON.map((row, i) => (
                      <li key={row.dimension}>
                        <div className="mb-1.5 flex items-baseline justify-between mkt-data">
                          <span className="text-mkt-fg-secondary">
                            {row.dimension}
                          </span>
                          <span
                            className={
                              row.favours === 'Sarah'
                                ? 'text-mkt-focus-sharp'
                                : 'text-mkt-focus-high'
                            }
                          >
                            {row.favours} +{Math.abs(row.sarah - row.marcus)}
                          </span>
                        </div>

                        {/* Two stacked hairline meters: the gap between them
                            is the divergence, visible without arithmetic. */}
                        <div className="space-y-1">
                          {(
                            [
                              ['Sarah', row.sarah, 'bg-mkt-focus-sharp'],
                              ['Marcus', row.marcus, 'bg-mkt-focus-high'],
                            ] as const
                          ).map(([who, score, tone], j) => (
                            <div key={who} className="flex items-center gap-2">
                              <span className="w-12 shrink-0 mkt-data text-mkt-fg-tertiary">
                                {who}
                              </span>
                              <span className="h-1 flex-1 overflow-hidden rounded-full bg-mkt-border-subtle">
                                <span
                                  className={`mkt-meter-fill block h-full rounded-full ${tone}`}
                                  style={{
                                    width: `${score}%`,
                                    ['--mkt-reveal-delay' as string]: `${i * 120 + j * 60}ms`,
                                  }}
                                />
                              </span>
                              <span className="w-6 shrink-0 text-right mkt-data text-mkt-fg">
                                {score}
                              </span>
                            </div>
                          ))}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hidden w-px bg-mkt-border-subtle md:block" />

                {/* Opportunity cost */}
                <div className="flex-1 space-y-4">
                  <h4 className="mkt-label text-mkt-fg-secondary">
                    Opportunity Cost
                  </h4>
                  <div className="mkt-prism-border-left rounded-r-[0.375rem] bg-mkt-ai-bg p-4">
                    <p className="mb-3 mkt-body-sm text-mkt-fg-secondary">
                      Selecting Marcus sacrifices Sarah&rsquo;s deep domain
                      expertise in early-stage GTM motion. The cost is slower
                      time-to-market in Q3.
                    </p>
                    <div className="flex items-center gap-2 mkt-body-sm text-mkt-fg-tertiary">
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        info
                      </span>
                      <span>AI Confidence Line:</span>
                      <span className="font-mkt-mono text-mkt-focus-soft">
                        52 Soft
                      </span>
                    </div>
                  </div>

                  {/* The question asked symmetrically. Regret only means
                      something if it is priced in both directions. */}
                  <ul className="space-y-2">
                    {REGRET_BOTH_WAYS.map((option) => (
                      <li
                        key={option.choice}
                        className="rounded-[0.375rem] border border-mkt-border-subtle bg-mkt-muted/30 p-3"
                      >
                        <span
                          className={`mkt-label ${option.tone}`}
                        >
                          {option.choice}
                        </span>
                        <p className="mt-1 mkt-body-sm leading-relaxed text-mkt-fg-secondary">
                          {option.cost}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Audit strip — the decision does not end at the memo. */}
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-mkt-border-subtle bg-mkt-subtle/40 px-6 py-3 mkt-data text-mkt-fg-tertiary md:px-8">
                <span className="inline-flex items-center gap-2">
                  <span className="mkt-live-dot h-1 w-1 rounded-full bg-mkt-success" />
                  Comparison written to the ledger · 14:02 · K. Osei
                </span>
                <span>Reversible for 30 days · exportable · attributable</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* AI DIFFERENTIATION                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-mkt-border-subtle bg-mkt-canvas px-4 py-32">
        <div className="mx-auto max-w-[1280px]">
          <Reveal className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
              Not a chatbot bolted onto an ATS.
              <br />
              Intelligence built into the decision.
            </h2>
          </Reveal>

          <div className="mx-auto flex max-w-4xl flex-col">
            {/* Tenet 1 — the prism mark */}
            <Reveal className="group flex flex-col items-start gap-6 border-t border-mkt-border-subtle py-7 md:flex-row md:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-mkt-lg border border-mkt-border bg-mkt-canvas shadow-sm transition-shadow duration-300 group-hover:shadow-md">
                <span className="material-symbols-outlined mkt-prism-text" aria-hidden="true">
                  auto_awesome
                </span>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-medium text-mkt-fg">
                  Evidence, not opinions
                </h3>
                <p className="text-mkt-fg-secondary">
                  Every claim opens to its source. No hallucinated summaries.
                </p>
              </div>
              {/* The proof, in the product's own notation. */}
              <span className="shrink-0 rounded-[0.25rem] border border-mkt-border-subtle bg-mkt-subtle px-2.5 py-1 mkt-data text-mkt-fg-tertiary">
                {TENET_PROOF[0]}
              </span>
            </Reveal>

            {/* Tenet 2 — the source chip */}
            <Reveal
              delay={80}
              className="group flex flex-col items-start gap-6 border-t border-mkt-border-subtle py-7 md:flex-row md:items-center"
            >
              <div className="mkt-prism-border-left flex shrink-0 items-center gap-2 rounded-[0.375rem] bg-mkt-ai-bg px-3 py-2 mkt-body-sm font-medium text-mkt-fg-secondary">
                Source
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  arrow_outward
                </span>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-medium text-mkt-fg">
                  It admits doubt
                </h3>
                <p className="text-mkt-fg-secondary">
                  Low confidence is shown, calmly, never hidden behind false
                  certainty.
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-2 rounded-[0.25rem] border border-mkt-border-subtle bg-mkt-subtle px-2.5 py-1 mkt-data text-mkt-focus-soft">
                <span className="h-1 w-10 overflow-hidden rounded-full bg-mkt-border">
                  <span className="mkt-meter-fill block h-full w-[52%] rounded-full bg-mkt-focus-soft" />
                </span>
                {TENET_PROOF[1]}
              </span>
            </Reveal>

            {/* Tenet 3 — the bare hairline */}
            <Reveal
              delay={160}
              className="group flex flex-col items-start gap-6 border-t border-b border-mkt-border-subtle py-7 md:flex-row md:items-center"
            >
              <div className="mkt-prism-hairline h-px w-12 shrink-0" />
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-medium text-mkt-fg">
                  You decide, always
                </h3>
                <p className="text-mkt-fg-secondary">
                  HireLens recommends; you approve; everything&rsquo;s
                  reversible and logged.
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-[0.25rem] border border-mkt-border-subtle bg-mkt-subtle px-2.5 py-1 mkt-data text-mkt-fg-tertiary">
                <span
                  className="material-symbols-outlined text-[13px] text-mkt-success"
                  aria-hidden="true"
                >
                  history
                </span>
                {TENET_PROOF[2]}
              </span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* ENTERPRISE TRUST                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section id="security" className="bg-mkt-canvas px-4 py-24">
        <div className="mx-auto max-w-[1280px] text-center">
          <Reveal>
            <h2 className="mb-12 font-mkt-display text-2xl text-mkt-fg-secondary md:text-3xl">
              Built for teams that can&rsquo;t afford to be wrong — or to leak.
            </h2>
          </Reveal>

          {/* Each mark carries what it actually guarantees, so the strip is a
              set of commitments rather than a row of badges. */}
          <dl className="mx-auto grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-mkt-lg border border-mkt-border-subtle bg-mkt-border-subtle md:grid-cols-4">
            {TRUST_MARKS.map((item, i) => (
              <Reveal key={item.mark} delay={i * 70} className="bg-mkt-canvas p-5 text-left">
                <dt className="font-mkt-label text-base font-medium text-mkt-fg">
                  {item.mark}
                </dt>
                <dd className="mt-1.5 mkt-data leading-relaxed text-mkt-fg-tertiary">
                  {item.detail}
                </dd>
              </Reveal>
            ))}
          </dl>

          {/* The strip states what is true; this line points at where the
              unflattering detail lives, including the certifications we do NOT
              hold. A security reviewer who has to hunt for that answer assumes
              the worst, and on this point the worst is roughly correct. */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 mkt-data text-mkt-fg-tertiary">
            <span className="h-px w-4 bg-mkt-border-strong" />
            No security certification yet — the full picture is in our{' '}
            <Link href="/privacy" className="text-mkt-accent-text underline">
              Privacy Policy
            </Link>
            .
            <span className="h-px w-4 bg-mkt-border-strong" />
          </div>
        </div>
      </section>
    </>
  )
}
