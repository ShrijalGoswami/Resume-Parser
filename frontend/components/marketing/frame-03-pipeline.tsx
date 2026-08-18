'use client'

import { Counter, Reveal } from './motion'
import { EditorialBackdrop } from './fx/editorial-backdrops'

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
  { name: 'M. Davis', verdict: 'Advanced', because: 'Event-driven re-platform', tone: 'pass', at: '0:31' },
  { name: 'S. Lindqvist', verdict: 'Filtered', because: 'Duplicate application', tone: 'fail', at: '0:38' },
]

/** Stage 01 — what the run was calibrated against. These are the chips the
 *  console header carries so the funnel below reads as measured against
 *  something, not as arbitrary percentages. */
const ROLE_REQUIREMENTS = ['Go', 'Distributed systems', 'Owned prod at scale', 'IC5+']

/** Stage 01 — the cohort itself, compressed to a band of initials. Opacity
 *  encodes the verdict; the four warm marks are the ones a human still needs
 *  to look at. Everyone else is dimmed, not deleted. */
const CANDIDATE_BAND = [
  { initials: 'RK', state: 'review' },
  { initials: 'HN', state: 'out' },
  { initials: 'AO', state: 'review' },
  { initials: 'PV', state: 'held' },
  { initials: 'MD', state: 'review' },
  { initials: 'SL', state: 'out' },
  { initials: 'JT', state: 'out' },
  { initials: 'CB', state: 'held' },
  { initials: 'EW', state: 'out' },
  { initials: 'NV', state: 'review' },
  { initials: 'LM', state: 'out' },
  { initials: 'GK', state: 'out' },
  { initials: 'DS', state: 'held' },
  { initials: 'FA', state: 'out' },
] as const

const BAND_STATE = {
  review: 'border-mkt-accent/50 bg-mkt-accent-bg text-mkt-accent-text',
  held: 'border-mkt-border bg-mkt-subtle text-mkt-fg-secondary',
  out: 'border-mkt-border-subtle bg-mkt-canvas text-mkt-fg-tertiary opacity-45',
} as const

const FEED_TONE = {
  pass: 'text-mkt-focus-high',
  fail: 'text-mkt-fg-tertiary',
  hold: 'text-mkt-focus-legible',
} as const

/** Stage 02 — the competencies the role was calibrated on, each with the
 *  verification state Hirevo could actually support from evidence. */
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

/**
 * A carry-mark: the count that crosses a section seam, stated where it
 * crosses. Three of these turn the whitespace between the stages into the
 * pauses of one countdown — the memo's trail, stretched over the page.
 * Deliberately tiny; a short copper rule and a number, nothing more.
 */
function CarrySeam({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="h-10 w-px bg-mkt-prism-cyan/60" aria-hidden="true" />
      <span className="mt-2.5 rounded-[0.25rem] border border-mkt-border-subtle bg-mkt-canvas px-2.5 py-1 font-mkt-mono text-[11px] tracking-wide text-mkt-fg-secondary">
        {label}
      </span>
      <span className="mt-2.5 h-4 w-px bg-mkt-prism-cyan/40" aria-hidden="true" />
    </div>
  )
}

export function Frame03Pipeline() {
  return (
    <div className="w-full bg-mkt-canvas">
      {/* ---------------------------------------------------------------- */}
      {/* THE DECISION PIPELINE                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate mx-auto flex w-full max-w-[1440px] flex-col items-center overflow-hidden px-6 py-24 md:px-12 md:py-32">
        {/* Scatter on the left, rows right of center, one ringed mark at the
            far edge — the section's own claim, drawn once, behind it. */}
        <EditorialBackdrop variant="stages" />
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
                <path d="M 50 64 L 950 64" fill="none" stroke="var(--mkt-border)" strokeWidth="1" />
                {/* The learning loop, drawn as travelling dashes — the one
                    thing on the rail that is genuinely continuous. */}
                <path
                  className="mkt-flow"
                  d="M 950 64 C 950 120, 50 120, 50 64"
                  fill="none"
                  stroke="var(--mkt-border-strong)"
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
                        ? `mb-2 h-4 w-[2px] bg-gradient-to-b from-mkt-prism-violet to-mkt-prism-cyan ${stage.opacity}`
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

        {/* The thread leaves this section carrying what triage kept. */}
        <Reveal delay={200} className="mt-16">
          <CarrySeam label="30 carried forward" />
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 01 — TRIAGE                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-16 px-6 py-24 md:px-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="order-2 flex max-w-xl flex-col gap-6 lg:order-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-sm text-mkt-fg-tertiary"
              aria-hidden="true"
            >
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
          <div className="relative">
            {/* The rest of the pile, still physically present behind the
                console — depth, not decoration: triage sits on top of 250
                sheets, and the composition should say so. */}
            <div
              className="pointer-events-none absolute -top-4 -right-4 bottom-8 left-8 hidden rotate-[1.6deg] rounded-mkt-xl border border-mkt-border-subtle bg-mkt-raised/80 lg:block"
              aria-hidden="true"
            >
              <div className="space-y-3 p-6 opacity-40 blur-[2px]">
                {[82, 64, 91, 55, 73].map((w, i) => (
                  <div key={i} className="h-2 rounded-full bg-mkt-border" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>

            <div className="mkt-lift relative overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-raised shadow-[var(--mkt-shadow-card-raised)]">
            <div className="mkt-grid-light pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

            {/* Console header */}
            <div className="relative flex items-center justify-between border-b border-mkt-border-subtle bg-mkt-subtle/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="mkt-live-dot h-1.5 w-1.5 rounded-full bg-mkt-focus-high" />
                <span className="mkt-data text-mkt-fg-secondary">
                  Hirevo Triage · Senior Backend Engineer
                </span>
              </div>
              <span className="mkt-data text-mkt-fg-tertiary">
                250 inbound
              </span>
            </div>

            {/* What this run was calibrated against — the bar the funnel
                below is measuring candidates over. */}
            <div className="relative flex flex-wrap items-center gap-1.5 border-b border-mkt-border-subtle px-5 py-2.5">
              <span className="mr-1 mkt-label-sm text-mkt-fg-tertiary">
                Calibrated on
              </span>
              {ROLE_REQUIREMENTS.map((req) => (
                <span
                  key={req}
                  className="rounded-[0.25rem] border border-mkt-border-subtle bg-mkt-subtle px-2 py-0.5 mkt-data text-mkt-fg-secondary"
                >
                  {req}
                </span>
              ))}
            </div>

            <div className="relative space-y-6 p-5 md:p-6">
              {/* The funnel: three widths you can compare at a glance. */}
              <div className="space-y-3">
                {[
                  { label: 'Applicants read', value: 250, pct: 100, tone: 'bg-mkt-border-strong' },
                  { label: 'Met the bar', value: 88, pct: 35, tone: 'bg-mkt-focus-sharp' },
                  { label: 'Viable for this role', value: 30, pct: 12, tone: 'bg-mkt-focus-high' },
                  { label: 'Need a human decision', value: 4, pct: 3, tone: 'bg-mkt-accent' },
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

              {/* The cohort itself, as a band of initials: dimmed means
                  reasoned out, warm means a human still looks. */}
              <div className="flex flex-wrap items-center gap-1.5">
                {CANDIDATE_BAND.map((candidate) => (
                  <span
                    key={candidate.initials}
                    className={`flex h-7 w-7 items-center justify-center rounded-full border font-mkt-mono text-[10px] ${BAND_STATE[candidate.state]}`}
                  >
                    {candidate.initials}
                  </span>
                ))}
                <span className="ml-1 mkt-data text-mkt-fg-tertiary">
                  +236 · each with a reason
                </span>
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
                        className={`w-20 shrink-0 ${FEED_TONE[entry.tone as keyof typeof FEED_TONE]}`}
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
          </div>
        </Reveal>

        {/* What survives triage, handed to the next stage. The explicit
            order matters: the siblings carry order-1/order-2 at lg, and an
            unordered grid item would sort BEFORE them — the seam must stay
            the section's last word. */}
        <Reveal delay={120} className="order-3 mt-2 lg:col-span-2">
          <CarrySeam label="12 to deep review" />
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 02 — DEEP REVIEW                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate w-full overflow-hidden bg-mkt-subtle">
        {/* The close read: margin rules, annotation ticks, one passage that
            mattered — the mood of the verification console beside it. */}
        <EditorialBackdrop variant="evidence" />
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-16 px-6 py-24 md:px-12 lg:grid-cols-2 lg:gap-20">
          <Reveal className="order-1">
            <div className="mkt-lift relative overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-raised shadow-[var(--mkt-shadow-card-raised)]">
              <div className="mkt-prism-edge-bottom flex items-center justify-between bg-mkt-canvas px-5 py-4">
                <div className="flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-sm text-mkt-prism-blue"
                    aria-hidden="true"
                  >
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
                    “Led the re-platforming of the order pipeline to an
                    event-driven architecture serving 40k req/s, cutting p99
                    latency from 900ms to 120ms.”
                  </blockquote>
                  <figcaption className="mt-3 flex flex-wrap items-center gap-2 mkt-data text-mkt-fg-tertiary">
                    <span className="inline-flex items-center gap-1 rounded-[0.25rem] border border-mkt-border-subtle px-1.5 py-0.5">
                      Source
                      <span className="material-symbols-outlined text-[12px]" aria-hidden="true">
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
              <span
                className="material-symbols-outlined text-sm text-mkt-fg-tertiary"
                aria-hidden="true"
              >
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

            {/* The trace, drawn once: how any number in the panel opposite
                can be walked back to the sentence it came from. This is the
                differentiator, so it gets a diagram, not bullet points. */}
            <div className="mt-2 border-t border-mkt-border pt-6">
              <p className="mb-4 mkt-label text-mkt-fg-tertiary">
                Every number traces back
              </p>
              <ol className="relative">
                {(
                  [
                    ['Claim', '“Led the re-platforming… 40k req/s”', 'the sentence on the résumé'],
                    ['Source span', 'Résumé · page 2 · role 2 of 5', 'where it was said'],
                    ['Competency', 'System architecture · Validated', 'what it supports'],
                    ['Confidence', '88 · shown, never rounded up', 'how much weight it holds'],
                  ] as const
                ).map(([step, detail, gloss], i, steps) => (
                  <li key={step} className="relative flex gap-4 pb-5 last:pb-0">
                    {/* The copper thread the whole product hangs from. */}
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          i === steps.length - 1 ? 'bg-mkt-accent' : 'border border-mkt-prism-cyan bg-mkt-canvas'
                        }`}
                        aria-hidden="true"
                      />
                      {i < steps.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-mkt-prism-cyan/50" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-3">
                        <span className="font-mkt-label text-base font-medium text-mkt-fg">
                          {step}
                        </span>
                        <span className="mkt-data text-mkt-fg-tertiary">{gloss}</span>
                      </div>
                      <p className="mt-0.5 mkt-data text-mkt-fg-secondary">{detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>

        {/* The four the evidence could not separate — a person decides. */}
        <Reveal delay={120} className="pb-16">
          <CarrySeam label="4 to decide" />
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 03 — DECIDE                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-16 px-6 py-24 md:px-12 lg:grid-cols-2 lg:gap-20">
        <Reveal className="order-2 flex max-w-xl flex-col gap-6 lg:order-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-sm text-mkt-fg-tertiary"
              aria-hidden="true"
            >
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
            you’d regret.
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
          <div className="mkt-lift overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-raised shadow-[var(--mkt-shadow-card-raised)]">
            {/* The compression the memo stands on — the whole pipeline,
                restated as five numbers ending in this document. */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-mkt-border-subtle bg-mkt-subtle/60 px-5 py-2.5 font-mkt-mono text-[11px] text-mkt-fg-tertiary md:px-6">
              {[
                ['250', 'read'],
                ['30', 'triaged'],
                ['12', 'reviewed'],
                ['4', 'compared'],
                ['1', 'decision'],
              ].map(([count, stage], i) => (
                <span key={stage} className="flex shrink-0 items-center gap-2">
                  {i > 0 && (
                    <span className="text-mkt-prism-cyan" aria-hidden="true">
                      →
                    </span>
                  )}
                  <span>
                    <span className={i === 4 ? 'text-mkt-accent-text' : 'text-mkt-fg'}>{count}</span>{' '}
                    {stage}
                  </span>
                </span>
              ))}
            </div>

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
                <span className="rounded-[0.25rem] bg-mkt-accent-bg px-2 py-1 mkt-label-sm text-mkt-accent-text">
                  Hirevo
                </span>
              </div>

              {/* The four still standing, scored — the two who don't make
                  the memo stay visible, dimmed rather than deleted. */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {(
                  [
                    ['AO', 91, 'Primary', true],
                    ['MD', 82, 'Alternate', true],
                    ['RK', 77, '', false],
                    ['PV', 64, '', false],
                  ] as const
                ).map(([initials, score, role, kept]) => (
                  <span
                    key={initials}
                    className={`flex items-center gap-2 rounded-[0.25rem] border px-2 py-1 mkt-data ${
                      kept
                        ? 'border-mkt-accent/40 bg-mkt-accent-bg text-mkt-fg'
                        : 'border-mkt-border-subtle text-mkt-fg-tertiary opacity-60'
                    }`}
                  >
                    <span className="font-mkt-mono">{initials}</span>
                    <span className="font-mkt-mono">{score}</span>
                    {role && <span className="text-mkt-accent-text">{role}</span>}
                  </span>
                ))}
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
                  <span
                    className="material-symbols-outlined text-[14px] text-mkt-success"
                    aria-hidden="true"
                  >
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
