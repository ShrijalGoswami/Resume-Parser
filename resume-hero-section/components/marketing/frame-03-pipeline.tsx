'use client'

import { Counter, Reveal } from './motion'

/**
 * Frame 3 — `hirelens_marketing_the_decision_pipeline_frame_3`.
 *
 * The pipeline rail (seven stages with a dashed return path closing the loop)
 * followed by three alternating stage scenes, each pairing an editorial column
 * with a product frame.
 *
 * The three product frames are the load-bearing part of this section: they are
 * where the page has to show what the AI is actually doing rather than assert
 * it. Each one is a working console rather than a token screenshot —
 *
 *   Stage 01  the triage funnel, plus the reason every excluded applicant was
 *             excluded and the feed of verdicts as they land
 *   Stage 02  competency verification down to the quoted evidence span and
 *             the source it came from
 *   Stage 03  the reasoning chain behind a recommendation, the risk it names,
 *             and the human approval that closes it
 *
 * Frame 3 uses a 1440px container with 24/48px side margins and stock Tailwind
 * type sizes rather than a bespoke scale.
 */

/** Rail stages. The three AI-owned stages carry the prism tick; the rest are
 *  plain hairlines, and their tick opacity ramps as the pipeline narrows.
 *  The count under each label is the same cohort of 250 narrowing through the
 *  instrument — so the rail reads as one job, not seven unrelated steps. */
const PIPELINE_STAGES = [
  { label: 'Arrive', count: '250', prism: false, opacity: '' },
  { label: 'Triage', count: '30', prism: true, opacity: 'opacity-50' },
  { label: 'Deep Review', count: '12', prism: true, opacity: 'opacity-70' },
  { label: 'Decide', count: '4', prism: true, opacity: 'opacity-90' },
  { label: 'Approve', count: '2', prism: false, opacity: '' },
  { label: 'Ledger', count: '2', prism: false, opacity: '' },
  { label: 'Outcome', count: '2', prism: false, opacity: '' },
]

/** Stage 01 — why the 220 who didn't advance didn't advance. This is the
 *  section's real claim: nothing is dropped without a stated reason. */
const TRIAGE_REASONS = [
  { reason: 'Missing a core requirement', count: 96, pct: 100 },
  { reason: 'Insufficient depth at level', count: 74, pct: 77 },
  { reason: 'Outside the comp band', count: 32, pct: 33 },
  { reason: 'Duplicate application', count: 18, pct: 19 },
]

/** Stage 01 — verdicts as they land. Timestamps run backwards from now so the
 *  feed reads as live rather than as a fixture. */
const TRIAGE_FEED = [
  { name: 'R. Kaur', verdict: 'Advanced', because: 'Go · distributed systems', tone: 'pass', at: '0:04' },
  { name: 'H. Nakamura', verdict: 'Filtered', because: 'Below level for scope', tone: 'fail', at: '0:11' },
  { name: 'P. Varga', verdict: 'Held', because: 'Strong, adjacent domain', tone: 'hold', at: '0:19' },
  { name: 'A. Okonkwo', verdict: 'Advanced', because: 'Owned ingestion at scale', tone: 'pass', at: '0:26' },
]

const FEED_TONE = {
  pass: 'text-mkt-focus-high',
  fail: 'text-mkt-fg-tertiary',
  hold: 'text-mkt-focus-legible',
} as const

/** Stage 02 — the competencies the role was calibrated on, each with the
 *  verification state HireLens could actually support from evidence. */
const COMPETENCIES = [
  { name: 'System architecture', score: 88, state: 'Validated', tone: 'high', spans: 6 },
  { name: 'Distributed systems', score: 91, state: 'Validated', tone: 'high', spans: 5 },
  { name: 'Team leadership', score: 74, state: 'Partial', tone: 'sharp', spans: 3 },
  { name: 'Incident response', score: 63, state: 'Partial', tone: 'legible', spans: 2 },
  { name: 'Hiring & mentoring', score: 41, state: 'Thin evidence', tone: 'soft', spans: 1 },
]

const COMPETENCY_TONE = {
  high: { text: 'text-mkt-focus-high', bg: 'bg-mkt-focus-high', tint: 'bg-mkt-focus-high/10' },
  sharp: { text: 'text-mkt-focus-sharp', bg: 'bg-mkt-focus-sharp', tint: 'bg-mkt-focus-sharp/10' },
  legible: { text: 'text-mkt-focus-legible', bg: 'bg-mkt-focus-legible', tint: 'bg-mkt-focus-legible/10' },
  soft: { text: 'text-mkt-focus-soft', bg: 'bg-mkt-focus-soft', tint: 'bg-mkt-focus-soft/10' },
} as const

/** Stage 03 — the reasoning chain, shown as the nodes it actually runs. */
const REASONING_CHAIN = [
  { node: 'Evidence', detail: '17 spans · 5 competencies' },
  { node: 'Weighting', detail: 'Role calibration v4' },
  { node: 'Comparison', detail: '4 shortlisted' },
  { node: 'Recommendation', detail: '1 primary · 1 alternate' },
]

export function Frame03Pipeline() {
  return (
    <div className="w-full bg-mkt-canvas">
      {/* ---------------------------------------------------------------- */}
      {/* THE DECISION PIPELINE                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-6 py-24 md:px-12 md:py-32">
        <Reveal className="mb-16 w-full">
          {/* Scrollable on narrow screens: seven labelled stages will not fit
              a phone, and crushing them is worse than letting them run. */}
          <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
            <div className="relative mx-auto flex h-36 w-full max-w-5xl min-w-[640px] items-center justify-between">
              {/* The loop path: a solid forward rail and a dashed return */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
                viewBox="0 0 1000 128"
                aria-hidden="true"
              >
                <path d="M 50 64 L 950 64" fill="none" stroke="#DCE1E0" strokeWidth="1" />
                {/* The learning loop, drawn as travelling dashes — the one
                    thing on the rail that is genuinely continuous. */}
                <path
                  className="mkt-flow"
                  d="M 950 64 C 950 120, 50 120, 50 64"
                  fill="none"
                  stroke="#B9C0BF"
                  strokeWidth="1"
                />
              </svg>

              {PIPELINE_STAGES.map((stage, i) => (
                <Reveal
                  key={stage.label}
                  delay={i * 70}
                  className="relative z-10 flex flex-col items-center bg-mkt-canvas px-2"
                >
                  <span className="mb-2 mkt-data text-mkt-fg">
                    {stage.count}
                  </span>
                  <div
                    className={
                      stage.prism
                        ? `mb-2 h-4 w-[2px] bg-gradient-to-b from-[#6E5CF0] to-[#2FB8C6] ${stage.opacity}`
                        : 'mb-2 h-4 w-px bg-mkt-border-strong'
                    }
                  />
                  <span className="mkt-label text-mkt-fg-secondary">
                    {stage.label}
                  </span>
                </Reveal>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center mkt-label text-mkt-fg-tertiary">
            One cohort of 250 · the dashed return is what the next role learns from
          </p>
        </Reveal>

        <Reveal delay={120}>
          <h2 className="max-w-4xl text-center font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
            One instrument, from the whole pile to the right decision — and back,
            learning each time.
          </h2>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 01 — TRIAGE                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-16 px-6 py-24 md:px-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="order-2 flex max-w-xl flex-col gap-6 lg:order-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-mkt-fg-tertiary">
              filter_list
            </span>
            <span className="mkt-label text-mkt-fg-tertiary">
              Stage 01 — Triage
            </span>
          </div>
          <h3 className="font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
            Clear hundreds.
            <br />
            Miss no one.
          </h3>
          <p className="max-w-md mkt-body-lg text-mkt-fg-secondary">
            AI-driven compression surfaces signal from noise instantly.
            Calibrated to your baseline, it identifies the viable subset without
            subjective bias.
          </p>

          {/* The claim, made checkable. Three numbers a recruiter can hold. */}
          <dl className="mt-2 grid grid-cols-3 gap-px overflow-hidden rounded-mkt-lg border border-mkt-border-subtle bg-mkt-border-subtle">
            <div className="bg-mkt-canvas p-4">
              <dd className="font-mkt-mono text-2xl text-mkt-fg">
                <Counter to={6.2} decimals={1} />
                <span className="text-base text-mkt-fg-tertiary"> min</span>
              </dd>
              <dt className="mt-1 mkt-label text-mkt-fg-tertiary">
                Full pass
              </dt>
            </div>
            <div className="bg-mkt-canvas p-4">
              <dd className="font-mkt-mono text-2xl text-mkt-fg">
                <Counter to={100} suffix="%" />
              </dd>
              <dt className="mt-1 mkt-label text-mkt-fg-tertiary">
                Pile read
              </dt>
            </div>
            <div className="bg-mkt-canvas p-4">
              <dd className="font-mkt-mono text-2xl text-mkt-fg">
                <Counter to={0} />
              </dd>
              <dt className="mt-1 mkt-label text-mkt-fg-tertiary">
                Unseen
              </dt>
            </div>
          </dl>
        </Reveal>

        <Reveal delay={100} className="order-1 lg:order-2">
          <div className="mkt-lift relative overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-canvas shadow-[0_8px_40px_rgba(11,13,13,0.04)]">
            <div className="mkt-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

            {/* Console header */}
            <div className="relative flex items-center justify-between border-b border-mkt-border-subtle bg-mkt-subtle/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="mkt-live-dot h-1.5 w-1.5 rounded-full bg-mkt-focus-high" />
                <span className="mkt-data text-mkt-fg-secondary">
                  Triage · Senior Backend Engineer
                </span>
              </div>
              <span className="mkt-data text-mkt-fg-tertiary">
                250 inbound
              </span>
            </div>

            <div className="relative space-y-6 p-5 md:p-6">
              {/* The funnel: three widths you can compare at a glance. */}
              <div className="space-y-3">
                {[
                  { label: 'Applicants read', value: 250, pct: 100, tone: 'bg-mkt-border-strong' },
                  { label: 'Met the bar', value: 88, pct: 35, tone: 'bg-mkt-focus-sharp' },
                  { label: 'Viable for this role', value: 30, pct: 12, tone: 'bg-mkt-focus-high' },
                ].map((row, i) => (
                  <div key={row.label}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="mkt-body-sm text-mkt-fg-secondary">
                        {row.label}
                      </span>
                      <span className="mkt-data text-mkt-fg">
                        <Counter to={row.value} />
                        <span className="text-mkt-fg-tertiary"> · {row.pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-mkt-border-subtle">
                      <div
                        className={`mkt-meter-fill h-full rounded-full ${row.tone}`}
                        style={{
                          width: `${row.pct}%`,
                          ['--mkt-reveal-delay' as string]: `${i * 160}ms`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Why the rest didn't advance. This is the section's promise —
                  "miss no one" is only credible if exclusions carry reasons. */}
              <div className="rounded-mkt-lg border border-mkt-border-subtle bg-mkt-subtle/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="mkt-label text-mkt-fg-tertiary">
                    Why 220 did not advance
                  </span>
                  <span className="mkt-data text-mkt-fg-tertiary">
                    every exclusion carries a reason
                  </span>
                </div>
                <ul className="space-y-2">
                  {TRIAGE_REASONS.map((reason, i) => (
                    <li key={reason.reason} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 truncate mkt-body-sm text-mkt-fg-secondary">
                        {reason.reason}
                      </span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-mkt-border-subtle">
                        <span
                          className="mkt-meter-fill block h-full rounded-full bg-mkt-fg-tertiary/60"
                          style={{
                            width: `${reason.pct}%`,
                            ['--mkt-reveal-delay' as string]: `${200 + i * 90}ms`,
                          }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right mkt-data text-mkt-fg">
                        {reason.count}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Verdicts landing. */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="mkt-live-dot h-1 w-1 rounded-full bg-mkt-accent" />
                  <span className="mkt-label text-mkt-fg-tertiary">
                    Verdicts landing
                  </span>
                </div>
                <ul className="divide-y divide-mkt-border-subtle border-y border-mkt-border-subtle">
                  {TRIAGE_FEED.map((entry) => (
                    <li
                      key={entry.name}
                      className="flex items-center gap-3 py-2 mkt-data"
                    >
                      <span className="w-10 shrink-0 text-mkt-fg-tertiary">
                        {entry.at}
                      </span>
                      <span className="w-24 shrink-0 truncate text-mkt-fg">
                        {entry.name}
                      </span>
                      <span
                        className={`w-16 shrink-0 ${FEED_TONE[entry.tone as keyof typeof FEED_TONE]}`}
                      >
                        {entry.verdict}
                      </span>
                      <span className="truncate text-mkt-fg-tertiary">
                        {entry.because}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 02 — DEEP REVIEW                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="w-full bg-mkt-subtle">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 px-6 py-24 md:px-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className="order-1">
            <div className="mkt-lift relative overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-canvas shadow-[0_8px_40px_rgba(11,13,13,0.04)]">
              <div className="mkt-prism-edge-bottom flex items-center justify-between bg-mkt-canvas px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#4C8FE0]">
                    temp_preferences_custom
                  </span>
                  <span className="font-mkt-label text-base font-medium text-mkt-fg">
                    Competency verification
                  </span>
                </div>
                <span className="mkt-data text-mkt-fg-secondary">
                  R. Kaur · resolved 4 of 6
                </span>
              </div>

              <div className="space-y-5 bg-mkt-ai-bg p-5 md:p-6">
                {/* Coverage. The meter is the honest part: 66%, not 100%. */}
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between mkt-data">
                    <span className="text-mkt-fg-secondary">Evidence coverage</span>
                    <span className="text-mkt-fg">
                      <Counter to={66} suffix="%" />
                      <span className="text-mkt-fg-tertiary"> · 17 spans cited</span>
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-mkt-border-subtle">
                    <div className="mkt-meter-fill mkt-prism-hairline h-full w-[66%]" />
                  </div>
                </div>

                {/* Every competency the role was calibrated on, with what the
                    evidence could and could not support. */}
                <ul className="space-y-2.5">
                  {COMPETENCIES.map((competency, i) => {
                    const tone = COMPETENCY_TONE[competency.tone as keyof typeof COMPETENCY_TONE]
                    return (
                      <li
                        key={competency.name}
                        className="flex items-center gap-3 border-b border-mkt-border-subtle pb-2.5 last:border-b-0 last:pb-0"
                      >
                        <span className="min-w-0 flex-1 truncate mkt-body-sm text-mkt-fg-secondary">
                          {competency.name}
                        </span>
                        <span className="hidden mkt-data text-mkt-fg-tertiary sm:inline">
                          {competency.spans} span{competency.spans === 1 ? '' : 's'}
                        </span>
                        <span className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-mkt-border-subtle">
                          <span
                            className={`mkt-meter-fill block h-full rounded-full ${tone.bg}`}
                            style={{
                              width: `${competency.score}%`,
                              ['--mkt-reveal-delay' as string]: `${i * 110}ms`,
                            }}
                          />
                        </span>
                        <span
                          className={`w-[104px] shrink-0 rounded-[0.25rem] px-2 py-1 text-right mkt-data ${tone.tint} ${tone.text}`}
                        >
                          {competency.score} {competency.state}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                {/* The span itself. Nothing above this line is assertable
                    without it, which is the whole point of the stage. */}
                <figure className="mkt-prism-edge-left rounded-r-mkt-lg border border-l-0 border-mkt-border-subtle bg-mkt-canvas p-4">
                  <blockquote className="mkt-body-sm leading-relaxed text-mkt-fg">
                    &ldquo;Led the re-platforming of the order pipeline to an
                    event-driven architecture serving 40k req/s, cutting p99
                    latency from 900ms to 120ms.&rdquo;
                  </blockquote>
                  <figcaption className="mt-3 flex flex-wrap items-center gap-2 mkt-data text-mkt-fg-tertiary">
                    <span className="inline-flex items-center gap-1 rounded-[0.25rem] border border-mkt-border-subtle px-1.5 py-0.5">
                      Source
                      <span className="material-symbols-outlined text-[12px]">
                        arrow_outward
                      </span>
                    </span>
                    <span>Résumé · page 2 · role 2 of 5</span>
                    <span className="ml-auto text-mkt-focus-high">
                      Supports: system architecture, distributed systems
                    </span>
                  </figcaption>
                </figure>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="order-2 flex max-w-xl flex-col gap-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-mkt-fg-tertiary">
                search_insights
              </span>
              <span className="mkt-label text-mkt-fg-tertiary">
                Stage 02 — Deep Review
              </span>
            </div>
            <h3 className="font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
              Confidence you
              <br />
              can defend.
            </h3>
            <p className="max-w-md mkt-body-lg text-mkt-fg-secondary">
              Every assertion backed by extracted evidence. The system maps raw
              unstructured data against your specific requirements, quantifying
              fit objectively.
            </p>

            <ul className="mt-2 space-y-3 border-t border-mkt-border pt-6">
              {[
                ['Every score opens to the span it came from', 'description'],
                ['Thin evidence is labelled thin, never rounded up', 'visibility'],
                ['Competencies come from your calibration, not a template', 'tune'],
              ].map(([copy, icon]) => (
                <li key={copy} className="flex items-start gap-3">
                  <span className="material-symbols-outlined mt-px text-[16px] text-mkt-accent-text">
                    {icon}
                  </span>
                  <span className="mkt-body-sm text-mkt-fg-secondary">
                    {copy}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 03 — DECIDE                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-16 px-6 py-24 md:px-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="order-2 flex max-w-xl flex-col gap-6 lg:order-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-mkt-fg-tertiary">
              gavel
            </span>
            <span className="mkt-label text-mkt-fg-tertiary">
              Stage 03 — Decide
            </span>
          </div>
          <h3 className="font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
            Choose, and
            <br />
            know why.
          </h3>
          <p className="max-w-md mkt-body-lg text-mkt-fg-secondary">
            Synthesized, defensible recommendations delivered in a high-fidelity
            memo. It highlights strengths, isolates risks, and tells you what
            you&rsquo;d regret.
          </p>

          {/* The chain the memo was produced by, laid out as steps. */}
          <ol className="mt-2 border-t border-mkt-border pt-6">
            {REASONING_CHAIN.map((step, i) => (
              <li key={step.node} className="flex items-start gap-4 pb-4 last:pb-0">
                <div className="flex flex-col items-center self-stretch">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-mkt-accent" />
                  {i < REASONING_CHAIN.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-mkt-border" aria-hidden="true" />
                  )}
                </div>
                <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4">
                  <span className="font-mkt-label text-base font-medium text-mkt-fg">
                    {step.node}
                  </span>
                  <span className="mkt-data text-mkt-fg-tertiary">
                    {step.detail}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={100} className="order-1 lg:order-2">
          <div className="mkt-lift overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-canvas shadow-[0_8px_40px_rgba(11,13,13,0.04)]">
            <div className="mkt-prism-edge-bottom bg-mkt-canvas p-5 md:p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h4 className="mb-1 font-mkt-display text-xl text-mkt-fg">
                    Recommendation memo
                  </h4>
                  <p className="mkt-data text-mkt-fg-secondary">
                    Generated for Role ID: 884-A · 4 candidates compared
                  </p>
                </div>
                <span className="material-symbols-outlined text-xl text-mkt-accent">
                  auto_awesome
                </span>
              </div>

              {/* Who it lands on, and who it would have landed on instead. */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-mkt-lg border border-mkt-border-subtle bg-mkt-border-subtle">
                <div className="bg-mkt-canvas p-3">
                  <span className="mkt-label text-mkt-fg-tertiary">
                    Primary
                  </span>
                  <p className="mt-1 font-mkt-mono text-base text-mkt-fg">A. Okonkwo</p>
                  <p className="mkt-data text-mkt-focus-high">
                    91 Focus · 17 evidence
                  </p>
                </div>
                <div className="bg-mkt-canvas p-3">
                  <span className="mkt-label text-mkt-fg-tertiary">
                    Alternate
                  </span>
                  <p className="mt-1 font-mkt-mono text-base text-mkt-fg">M. Davis</p>
                  <p className="mkt-data text-mkt-focus-sharp">
                    82 Sharp · 11 evidence
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 bg-mkt-muted p-5 md:p-6">
              <div>
                <span className="mb-2 block mkt-label text-mkt-fg-tertiary">
                  Primary risk factor
                </span>
                <p className="mkt-body-sm leading-relaxed text-mkt-fg">
                  Candidate demonstrates lower tenure averages in senior roles
                  compared to baseline, presenting a potential retention risk
                  post-18 months.
                </p>
              </div>

              {/* Tenure, shown rather than asserted. */}
              <div className="rounded-mkt-lg border border-mkt-border-subtle bg-mkt-canvas p-3">
                <div className="mb-2 flex items-baseline justify-between mkt-data text-mkt-fg-tertiary">
                  <span className="tracking-widest uppercase">Tenure by role</span>
                  <span>baseline 2.8 yrs</span>
                </div>
                <div className="flex items-end gap-1.5">
                  {[
                    { years: 3.4, label: '3.4' },
                    { years: 2.9, label: '2.9' },
                    { years: 1.6, label: '1.6' },
                    { years: 1.2, label: '1.2' },
                  ].map((bar) => (
                    <div key={bar.label} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-[2px] ${
                          bar.years >= 2.8 ? 'bg-mkt-focus-sharp/70' : 'bg-mkt-focus-soft/70'
                        }`}
                        style={{ height: `${(bar.years / 3.4) * 44}px` }}
                      />
                      <span className="mkt-label-sm text-mkt-fg-tertiary">
                        {bar.label}
                      </span>
                    </div>
                  ))}
                  <div
                    className="ml-1 h-11 w-px bg-mkt-border-strong"
                    aria-hidden="true"
                  />
                  <span className="self-center mkt-label-sm text-mkt-fg-tertiary">
                    yrs
                  </span>
                </div>
              </div>

              {/* The decision is still a person's. */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mkt-border-subtle pt-4">
                <span className="inline-flex items-center gap-1.5 mkt-data text-mkt-fg-secondary">
                  <span className="material-symbols-outlined text-[14px] text-mkt-success">
                    verified_user
                  </span>
                  Awaiting your approval · reversible · logged to the ledger
                </span>
                <span className="mkt-data text-mkt-fg-tertiary">
                  Confidence 74 &middot; Sharp
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
