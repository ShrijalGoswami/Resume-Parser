'use client'

import { Counter, Reveal, useInView } from './motion'

/**
 * The Compression Engine — frame 1's centrepiece visualisation.
 *
 * This is the page's answer to "what is the AI actually doing?". It replaces
 * the frame's original placeholder panel (two columns of grey bars either side
 * of a divider) with the real shape of the work, read left to right:
 *
 *   INTAKE        a continuously arriving applicant stream — file format,
 *                 tenure, extracted skills, and the triage verdict per card
 *   COMPRESSION   the five passes that turn that stream into evidence, each
 *                 node carrying its own throughput
 *   SIGNAL        the handful of decisions that come out, resolving one by
 *                 one with evidence, risk, confidence and reasoning state
 *
 * Every number on the panel is internally consistent: 250 applicants in,
 * 30 viable out (12%), 4 that need a human — the same arithmetic the Triage
 * stage panel in frame 3 quotes.
 *
 * Motion is CSS-only and composited. The intake stream pauses on hover so a
 * card that catches the eye can actually be read.
 */

/** The intake stream. Rendered twice inside the marquee track for a seamless
 *  loop, so keep this list short enough that the repeat isn't obvious but long
 *  enough to fill the column — nine reads well at the panel's height. */
const INTAKE = [
  {
    initials: 'RK',
    name: 'R. Kaur',
    role: 'Staff Backend Engineer',
    format: 'PDF',
    years: '9 yrs',
    tags: ['Go', 'Distributed systems'],
    verdict: 'advanced',
  },
  {
    initials: 'TM',
    name: 'T. Møller',
    role: 'Platform Engineer',
    format: 'DOCX',
    years: '6 yrs',
    tags: ['Kubernetes', 'Terraform'],
    verdict: 'advanced',
  },
  {
    initials: 'JD',
    name: 'J. Delacroix',
    role: 'Frontend Engineer',
    format: 'PDF',
    years: '3 yrs',
    tags: ['React', 'Design systems'],
    verdict: 'filtered',
  },
  {
    initials: 'AO',
    name: 'A. Okonkwo',
    role: 'Data Engineer',
    format: 'PDF',
    years: '7 yrs',
    tags: ['Spark', 'Airflow'],
    verdict: 'advanced',
  },
  {
    initials: 'LS',
    name: 'L. Silva',
    role: 'Engineering Manager',
    format: 'DOCX',
    years: '11 yrs',
    tags: ['Team leadership', 'Hiring'],
    verdict: 'held',
  },
  {
    initials: 'MB',
    name: 'M. Bianchi',
    role: 'Site Reliability Engineer',
    format: 'PDF',
    years: '5 yrs',
    tags: ['Observability', 'Incident response'],
    verdict: 'advanced',
  },
  {
    initials: 'HN',
    name: 'H. Nakamura',
    role: 'Junior Developer',
    format: 'PDF',
    years: '1 yr',
    tags: ['TypeScript'],
    verdict: 'filtered',
  },
  {
    initials: 'PV',
    name: 'P. Varga',
    role: 'Security Engineer',
    format: 'DOCX',
    years: '8 yrs',
    tags: ['Threat modelling', 'AppSec'],
    verdict: 'held',
  },
  {
    initials: 'CE',
    name: 'C. Eze',
    role: 'Machine Learning Engineer',
    format: 'PDF',
    years: '6 yrs',
    tags: ['PyTorch', 'Evaluation'],
    verdict: 'advanced',
  },
] as const

/** Per-verdict presentation. Verdict is carried by label as well as colour —
 *  the chip text is the accessible signal, the tint is the fast one. */
const VERDICT_STYLE = {
  advanced: {
    label: 'Advanced',
    chip: 'border-[#66d9ff]/40 bg-[#66d9ff]/10 text-[#7fe2ff]',
    card: 'border-white/10 bg-white/[0.04]',
    body: 'opacity-100',
  },
  held: {
    label: 'Held',
    chip: 'border-[#b9aeff]/30 bg-[#b9aeff]/10 text-[#b9aeff]',
    card: 'border-white/10 bg-white/[0.03]',
    body: 'opacity-100',
  },
  filtered: {
    label: 'Filtered',
    chip: 'border-white/15 bg-white/[0.04] text-mkt-dark-outline',
    card: 'border-white/[0.06] bg-transparent',
    body: 'opacity-45',
  },
} as const

/** The five compression passes. `throughput` is what that pass produced from
 *  the 250-applicant intake; `pct` drives the node's width meter, which is how
 *  the column reads as narrowing rather than as five equal rows. */
const PASSES = [
  { label: 'Skill extraction', throughput: '2,914 skills', pct: 100 },
  { label: 'Entity recognition', throughput: '18,402 entities', pct: 84 },
  { label: 'Experience parsing', throughput: '1,106 roles', pct: 62 },
  { label: 'Evidence generation', throughput: '612 citations', pct: 38 },
  { label: 'Shortlist', throughput: '30 viable', pct: 12 },
] as const

/** What comes out the far side. Each card answers the four questions the
 *  recruiter actually has before opening a profile. */
const SIGNAL = [
  {
    name: 'S. Rahman',
    role: 'Staff Backend Engineer',
    verdict: 'Leadership risk',
    verdictTone: 'risk',
    evidence: 14,
    risks: 2,
    confidence: 88,
    confidenceLabel: 'Focus',
    note: 'Technically sound, but historical team attrition rates are high.',
  },
  {
    name: 'M. Davis',
    role: 'Platform Engineer',
    verdict: 'Undiscovered',
    verdictTone: 'find',
    evidence: 11,
    risks: 0,
    confidence: 82,
    confidenceLabel: 'Sharp',
    note: 'Non-traditional background but perfectly matches core skill requirements.',
  },
  {
    name: 'A. Okonkwo',
    role: 'Data Engineer',
    verdict: 'Strong match',
    verdictTone: 'strong',
    evidence: 17,
    risks: 1,
    confidence: 91,
    confidenceLabel: 'Focus',
    note: 'Owned the ingestion path at comparable scale for three years.',
  },
  {
    name: 'A. Patel',
    role: 'Frontend Engineer',
    verdict: 'Needs a human',
    verdictTone: 'open',
    evidence: 6,
    risks: 1,
    confidence: 52,
    confidenceLabel: 'Soft',
    note: 'Evidence is thin on the two requirements that matter most here.',
  },
] as const

const VERDICT_TONE = {
  risk: 'border-[#ff9052]/40 bg-[#ff9052]/10 text-[#ffb184]',
  find: 'border-[#66d9ff]/40 bg-[#66d9ff]/10 text-[#7fe2ff]',
  strong: 'border-[#3ddc97]/40 bg-[#3ddc97]/10 text-[#7ce9b8]',
  open: 'border-white/15 bg-white/[0.05] text-mkt-dark-outline',
} as const

/** Header/footer readouts. Kept as data so the two strips stay symmetrical. */
const READOUTS = [
  { label: 'Parsed', value: 250, suffix: '' },
  { label: 'Evidence spans', value: 612, suffix: '' },
  { label: 'Viable', value: 30, suffix: '' },
  { label: 'Need a human', value: 4, suffix: '' },
]

function IntakeCard({ item }: { item: (typeof INTAKE)[number] }) {
  const style = VERDICT_STYLE[item.verdict]

  return (
    <div
      className={`rounded-mkt-lg border p-3 transition-colors duration-300 hover:border-white/20 ${style.card}`}
    >
      <div className={`flex items-start gap-3 ${style.body}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] mkt-data text-mkt-dark-fg-variant">
          {item.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="mkt-body-sm font-mkt-label font-medium text-mkt-dark-fg">
              {item.name}
            </span>
            <span className="shrink-0 mkt-data text-mkt-dark-outline">
              {item.format} · {item.years}
            </span>
          </div>

          <p className="truncate mkt-body-sm text-mkt-dark-fg-variant/70">
            {item.role}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-[0.25rem] border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 mkt-label-sm text-mkt-dark-fg-variant/70"
              >
                {tag}
              </span>
            ))}
            <span
              className={`ml-auto rounded-[0.25rem] border px-1.5 py-0.5 mkt-label-sm ${style.chip}`}
            >
              {style.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CompressionEngine() {
  // The signal column resolves card-by-card, but only once the panel is on
  // screen — otherwise the sequence has already played by the time it's read.
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden rounded-mkt-xl border border-mkt-dark-outline-variant/25 bg-mkt-dark-bg shadow-2xl"
    >
      {/* Instrument backdrop: engineering grid, dissolved at the edges. */}
      <div className="mkt-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="mkt-vignette-dark pointer-events-none absolute inset-0" aria-hidden="true" />

      {/* ------------------------------------------------------------------ */}
      {/* HEADER READOUT                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="mkt-live-dot h-1.5 w-1.5 rounded-full bg-[#66d9ff]" />
          <span className="mkt-label text-mkt-dark-fg-variant">
            Live · Senior Backend Engineer
          </span>
        </div>

        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {READOUTS.map((readout) => (
            <div key={readout.label} className="flex items-baseline gap-2">
              <dd className="mkt-data text-mkt-dark-fg">
                <Counter to={readout.value} />
              </dd>
              <dt className="mkt-label text-mkt-dark-outline">
                {readout.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* THE THREE COLUMNS                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_200px_minmax(0,1.2fr)]">
        {/* --- INTAKE ----------------------------------------------------- */}
        <div className="mkt-stream-host relative flex h-[360px] flex-col overflow-hidden border-b border-white/[0.07] lg:h-[640px] lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 md:px-6">
            <span className="mkt-label text-mkt-dark-outline">
              Intake
            </span>
            <span className="mkt-data text-mkt-dark-fg-variant">
              250 applicants
            </span>
          </div>

          {/* The stream. `mask-image` fades both ends so cards enter and leave
              the column rather than being clipped by its edge. */}
          <div
            className="relative flex-1 overflow-hidden px-5 md:px-6"
            style={{
              maskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 82%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to bottom, transparent 0%, black 12%, black 82%, transparent 100%)',
            }}
          >
            <div className="mkt-stream flex flex-col gap-2.5">
              {/* Two copies: the track travels exactly one copy's height, so
                  the second is in position when the first has passed. */}
              {[0, 1].map((copy) => (
                <div key={copy} className="flex flex-col gap-2.5" aria-hidden={copy === 1}>
                  {INTAKE.map((item) => (
                    <IntakeCard key={item.name} item={item} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.07] px-5 py-3 md:px-6">
            <span className="mkt-data text-mkt-dark-outline">
              Sources · Careers 118 · Referral 47 · Inbound 85
            </span>
          </div>
        </div>

        {/* --- COMPRESSION ------------------------------------------------ */}
        <div className="relative flex h-[420px] flex-col overflow-hidden border-b border-white/[0.07] lg:h-[640px] lg:border-r lg:border-b-0">
          <div className="px-5 pt-5 pb-3 text-center">
            <span className="mkt-label text-mkt-dark-outline">
              Compression
            </span>
          </div>

          {/* The spine and its travelling particles sit behind the nodes. */}
          <div className="relative flex-1 px-4 pb-4">
            <div
              className="mkt-prism-spine absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2"
              aria-hidden="true"
            />
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="mkt-particle absolute left-1/2 h-6 w-px -translate-x-1/2 bg-gradient-to-b from-transparent to-[#b9aeff]"
                style={{
                  animationDelay: `${i * 1.2}s`,
                  // Fixed px rather than a percentage: the particle is 24px
                  // tall, so a percentage travel would barely move it.
                  ['--mkt-particle-travel' as string]: '520px',
                  top: 0,
                }}
                aria-hidden="true"
              />
            ))}

            {/* The scan pass — one slow sweep of the whole column. */}
            <div
              className="mkt-scan pointer-events-none absolute inset-x-2 top-0 h-16 bg-gradient-to-b from-transparent via-[#6d5ef8]/10 to-transparent"
              aria-hidden="true"
            />

            <ol className="relative flex h-full flex-col justify-between py-2">
              {PASSES.map((pass, i) => (
                <Reveal
                  key={pass.label}
                  as="li"
                  delay={i * 120}
                  className="relative flex flex-col items-center gap-1.5"
                >
                  <span
                    className="mkt-node-pulse h-2 w-2 rounded-full border border-[#b9aeff]/60 bg-mkt-dark-bg"
                    style={{ animationDelay: `${i * 0.5}s` }}
                    aria-hidden="true"
                  />
                  <span className="mkt-body-sm font-mkt-label font-medium text-mkt-dark-fg">
                    {pass.label}
                  </span>
                  <span className="mkt-label-sm text-mkt-dark-outline">
                    {pass.throughput}
                  </span>
                  {/* Width meter: the column visibly narrows as it descends. */}
                  <span
                    className="h-px bg-gradient-to-r from-transparent via-[#6d5ef8]/70 to-transparent"
                    style={{ width: `${Math.max(pass.pct, 14)}%`, minWidth: '24px' }}
                    aria-hidden="true"
                  />
                </Reveal>
              ))}
            </ol>
          </div>
        </div>

        {/* --- SIGNAL ------------------------------------------------------ */}
        <div className="relative flex flex-col overflow-hidden bg-white/[0.02] lg:h-[640px]">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 md:px-6">
            <span className="mkt-label text-mkt-dark-outline">
              Signal
            </span>
            <span className="mkt-data text-mkt-dark-fg-variant">
              4 key decisions
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 px-5 pb-5 md:px-6">
            {SIGNAL.map((candidate, i) => (
              <div
                key={candidate.name}
                // NOT `<article>`, and that is a correctness fix rather than a
                // preference. `<article>` is HTML's strongest "standalone,
                // quotable content" signal, and these four cards are INVENTED
                // candidates in a product mock. An extractor that prioritises
                // article elements — which is most of them — surfaced
                // "S. Rahman · Staff Backend Engineer · Leadership risk" as
                // HireLens's primary content.
                //
                // That is the same failure the August truth pass removed from
                // the prose, surviving in a layer nobody reads: the site
                // stopped claiming fake customers while still marking up fake
                // people as its most machine-prominent element.
                //
                // `min-h-0` matters: without it the flex items refuse to
                // shrink below their content height and the column spills past
                // the panel's fixed 600px onto the footer strip.
                className={`mkt-lift relative min-h-0 flex-1 rounded-mkt-lg border border-white/[0.09] bg-mkt-dark-bg/80 p-4 ${
                  inView ? 'mkt-resolve' : 'opacity-0'
                }`}
                style={{ ['--mkt-resolve-delay' as string]: `${300 + i * 220}ms` }}
              >
                <div className="mkt-prism-hairline absolute inset-x-0 top-0 h-px rounded-t-mkt-lg opacity-40" />

                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-mkt-mono text-[16px] leading-tight text-mkt-dark-fg">
                      {candidate.name}
                    </h3>
                    <p className="truncate mkt-body-sm text-mkt-dark-fg-variant/60">
                      {candidate.role}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-[0.25rem] border px-2 py-0.5 mkt-label-sm ${
                      VERDICT_TONE[candidate.verdictTone]
                    }`}
                  >
                    {candidate.verdict}
                  </span>
                </div>

                <p className="mb-3 mkt-body-sm text-mkt-dark-fg-variant/75">
                  {candidate.note}
                </p>

                {/* The four questions, answered on the card itself. */}
                <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.07] pt-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="material-symbols-outlined text-[13px] text-[#7fe2ff]"
                      aria-hidden="true"
                    >
                      description
                    </span>
                    <dt className="sr-only">Evidence found</dt>
                    <dd className="mkt-data text-mkt-dark-fg-variant">
                      {candidate.evidence} evidence
                    </dd>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`material-symbols-outlined text-[13px] ${
                        candidate.risks > 0 ? 'text-[#ffb184]' : 'text-mkt-dark-outline'
                      }`}
                      aria-hidden="true"
                    >
                      {candidate.risks > 0 ? 'warning' : 'check_circle'}
                    </span>
                    <dt className="sr-only">Risks found</dt>
                    <dd className="mkt-data text-mkt-dark-fg-variant">
                      {candidate.risks} risk{candidate.risks === 1 ? '' : 's'}
                    </dd>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <dt className="mkt-data text-mkt-dark-outline">
                      {candidate.confidence} {candidate.confidenceLabel}
                    </dt>
                    <dd className="h-1 w-14 overflow-hidden rounded-full bg-white/10">
                      <span
                        className={`mkt-meter-fill block h-full ${
                          inView ? 'is-visible' : ''
                        } ${
                          candidate.confidence >= 80
                            ? 'bg-[#3ddc97]'
                            : candidate.confidence >= 65
                              ? 'bg-[#ffb84d]'
                              : 'bg-[#ff9052]'
                        }`}
                        style={{
                          width: `${candidate.confidence}%`,
                          ['--mkt-reveal-delay' as string]: `${500 + i * 220}ms`,
                        }}
                      />
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER READOUT                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-white/[0.07] px-5 py-3 md:px-8">
        <span className="mkt-label text-mkt-dark-outline">
          Every claim on this panel opens to its source
        </span>
        <span className="mkt-data text-mkt-dark-fg-variant">
          Full pass · <Counter to={6.2} decimals={1} suffix=" min" /> · 0 candidates
          discarded unseen
        </span>
      </div>
    </div>
  )
}
