'use client'

import { Counter, Reveal } from './motion'

/**
 * Frame 2 — `hirelens_marketing_the_philosophy_frame_2`.
 *
 * Four sections: social proof, the Deep Ink "Stakes" interstitial, the
 * philosophy manifesto, and the quiet ATS contrast.
 *
 * Frame 2 carries its own scale, distinct from frame 1:
 *   display-xl 4rem/1.1 (-0.03em) · display-md 2.5rem/1.2 (-0.02em)
 *   body-lg 1.125rem/1.75rem · container-max 1200px · manifesto 680px
 *
 * Note frame 2's `ink` is #121414 (not the #0B0D0D used by frames 4–5); the
 * Stakes band is deliberately the lighter of the two inks.
 */

const CUSTOMER_LOGOS = [
  { src: '/marketing/logo-01.png', alt: 'Vertex', className: '' },
  { src: '/marketing/logo-02.png', alt: 'Nexus', className: 'hidden sm:block' },
  { src: '/marketing/logo-03.png', alt: 'Omni', className: '' },
  { src: '/marketing/logo-04.png', alt: 'Meridian', className: 'hidden md:block' },
]

/** The outcome numbers behind the pull quote. A testimonial with one metric
 *  reads as a line someone was talked into; four make it a result. */
const CUSTOMER_RESULTS = [
  { value: 38, prefix: '−', suffix: '%', label: 'Time to decision' },
  { value: 4.1, decimals: 1, suffix: '×', label: 'More of the pile reviewed' },
  { value: 100, suffix: '%', label: 'Decisions with evidence' },
  { value: 0, label: 'Regretted hires, 2 qtrs' },
]

/** The Stakes band: the arithmetic of one wrong senior hire, so the claim in
 *  the headline is something the reader can check rather than absorb. */
const MISHIRE_COST = [
  { label: 'Salary written off', value: '~30%', detail: 'of first-year comp' },
  { label: 'Ramp lost', value: '5–8 mo', detail: 'before the gap is visible' },
  { label: 'Backfill cycle', value: '11 wks', detail: 'to run the search again' },
  { label: 'Team velocity', value: '−18%', detail: 'while the seat is open' },
]

/** The ATS contrast, asked as five questions of both columns. The three
 *  original lines are preserved verbatim as the first three dimensions. */
const ATS_CONTRAST = [
  { dimension: 'What it holds', old: 'Stores every candidate', hirelens: 'Surfaces the few who matter' },
  { dimension: 'What it is', old: 'A searchable database', hirelens: 'A decision instrument' },
  { dimension: 'Who does the work', old: 'You go digging', hirelens: 'It brings them to you' },
  { dimension: 'What you get back', old: 'A keyword match score', hirelens: 'Evidence, risk, and what you would regret' },
  { dimension: 'What it leaves behind', old: 'A status change', hirelens: 'A logged, reversible decision with its reasoning' },
]

/** Margin notes for the manifesto — the principle each paragraph is arguing
 *  for, set in the left rail so the section can be read at two speeds. */
const MANIFESTO_NOTES = ['The problem', 'The instrument', 'The result']

const MANIFESTO = [
  'The modern talent pipeline is choked with noise. Resumes are optimized for parsers, not for truth. Searching for signal in a sea of keywords guarantees you will miss the outliers.',
  'We designed HireLens as an instrument of clarity, not a warehouse for data. It does not measure how many candidates you have. It measures how closely they align with the actual work.',
  'By applying deep semantic understanding to unstructured career trajectories, we elevate the few who matter. The result is a calmer, more decisive hiring process.',
]

export function Frame02Philosophy() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* SOCIAL PROOF                                                      */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="customers"
        className="flex w-full flex-col items-center bg-mkt-canvas py-32"
      >
        <div className="mb-16 h-px w-full bg-mkt-border-subtle" />

        <Reveal className="mb-20 flex max-w-[1200px] justify-center gap-12 px-6 opacity-60 grayscale md:gap-24">
          {CUSTOMER_LOGOS.map((logo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={logo.src}
              src={logo.src}
              alt={logo.alt}
              className={`h-6 object-contain ${logo.className}`}
            />
          ))}
        </Reveal>

        <Reveal delay={80} className="flex max-w-3xl flex-col items-center px-6 text-center">
          <p className="mb-8 text-balance font-mkt-display text-[2.5rem] leading-[1.2] font-light tracking-[-0.02em] text-mkt-fg">
            &ldquo;We stopped losing our best candidates in the pile.&rdquo;
          </p>
          <div className="flex items-center gap-4">
            <p className="mkt-body text-mkt-fg-secondary">
              Head of Talent, Vertex
            </p>
            <div className="h-1 w-1 rounded-full bg-mkt-border" />
            <p className="mkt-data tracking-tight text-mkt-fg">
              −38% time-to-decision
            </p>
          </div>
        </Reveal>

        {/* What the quote is standing on. */}
        <Reveal delay={140} className="mt-16 w-full max-w-[1200px] px-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-mkt-lg border border-mkt-border-subtle bg-mkt-border-subtle md:grid-cols-4">
            {CUSTOMER_RESULTS.map((result) => (
              <div
                key={result.label}
                className="mkt-lift bg-mkt-canvas p-6 text-center md:p-8"
              >
                <dd className="font-mkt-mono text-3xl leading-none text-mkt-fg md:text-4xl">
                  <Counter
                    to={result.value}
                    prefix={result.prefix}
                    suffix={result.suffix}
                    decimals={result.decimals ?? 0}
                  />
                </dd>
                <dt className="mt-3 mkt-label text-mkt-fg-tertiary">
                  {result.label}
                </dt>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="mt-24 h-px w-full bg-mkt-border-subtle" />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* THE STAKES (dark interstitial)                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative w-full overflow-hidden bg-mkt-dark-bg py-32 text-mkt-canvas md:py-40">
        <div className="mkt-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="mkt-vignette-dark pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-end gap-16 px-6 md:px-12 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal className="flex flex-col items-start">
            <p className="mb-12 mkt-label text-mkt-fg-tertiary">
              The Stakes
            </p>
            <h2 className="mb-12 max-w-4xl text-balance font-mkt-display text-[2.75rem] leading-tight font-light tracking-[-0.03em] md:text-[4rem]">
              The cost of a wrong hire isn&rsquo;t a bad quarter.
              <br />
              <span className="text-mkt-muted">It&rsquo;s a lost year.</span>
            </h2>
            <p className="max-w-xl mkt-data leading-relaxed text-mkt-fg-secondary">
              A mis-hire costs ~30% of first-year salary — and the momentum you
              can&rsquo;t get back.
            </p>
          </Reveal>

          {/* The ledger of that lost year, itemised. The headline asserts a
              cost; this is where the reader gets to audit it. */}
          <Reveal delay={120}>
            <div className="rounded-mkt-xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-sm md:p-7">
              <div className="mb-5 flex items-center justify-between border-b border-white/[0.08] pb-4">
                <span className="mkt-label text-mkt-dark-outline">
                  One senior mis-hire
                </span>
                <span className="mkt-data text-mkt-dark-fg-variant">
                  Industry benchmark
                </span>
              </div>

              <dl className="space-y-4">
                {MISHIRE_COST.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-baseline justify-between gap-4 border-b border-white/[0.05] pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <dt className="font-mkt-label text-base text-mkt-dark-fg">
                        {item.label}
                      </dt>
                      <p className="mkt-data text-mkt-dark-outline">
                        {item.detail}
                      </p>
                    </div>
                    <dd className="shrink-0 font-mkt-mono text-xl text-[#e0a06b]">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-5 border-t border-white/[0.08] pt-4 mkt-data leading-relaxed text-mkt-dark-outline">
                None of it shows up in the quarter you made the decision.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* PRODUCT PHILOSOPHY                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="w-full bg-mkt-canvas py-32">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 md:px-12">
          <Reveal>
            <h2 className="mb-16 max-w-3xl text-center text-balance font-mkt-display text-[2.5rem] leading-[1.2] font-light tracking-[-0.02em] text-mkt-fg">
              Recruiting isn&rsquo;t a volume problem.
              <br />
              It&rsquo;s a focus problem.
            </h2>
          </Reveal>

          {/* The manifesto keeps its 680px measure; each paragraph now carries
              a margin note naming the principle it argues for, which is what
              turns a wall of prose into something scannable. */}
          <div className="flex max-w-[900px] flex-col gap-10">
            {MANIFESTO.map((paragraph, i) => (
              <Reveal
                key={paragraph.slice(0, 32)}
                delay={i * 90}
                className="grid grid-cols-1 gap-2 md:grid-cols-[140px_minmax(0,680px)] md:gap-8"
              >
                <p className="pt-1 mkt-label text-mkt-fg-tertiary md:text-right">
                  {MANIFESTO_NOTES[i]}
                </p>
                <p className="mkt-body font-light text-mkt-fg-secondary">
                  {paragraph}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* THE QUIET ATS CONTRAST                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="w-full border-t border-mkt-border-subtle bg-mkt-canvas py-32">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12">
          <h3 className="mb-20 text-center font-mkt-display text-2xl font-light text-mkt-fg">
            An ATS remembers candidates.{' '}
            <span className="text-mkt-accent">HireLens</span> helps you choose
            one.
          </h3>

          {/* A row-by-row contrast rather than two floating lists: the same
              question asked of both columns, so the difference is legible
              across the row instead of having to be held in memory. */}
          <Reveal className="mx-auto max-w-4xl overflow-hidden rounded-mkt-xl border border-mkt-border-subtle">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-x-4 border-b border-mkt-border bg-mkt-subtle px-5 py-3 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] md:px-8">
              <span className="hidden mkt-label text-mkt-fg-tertiary md:block">
                &nbsp;
              </span>
              <span className="mkt-label text-mkt-fg-tertiary">
                The Old Way
              </span>
              <span className="mkt-label text-mkt-accent-text">
                HireLens
              </span>
            </div>

            {ATS_CONTRAST.map((row, i) => (
              <div
                key={row.dimension}
                className={`group grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-start gap-x-4 gap-y-1 px-5 py-4 transition-colors duration-300 hover:bg-mkt-subtle/40 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1fr)] md:px-8 ${
                  i > 0 ? 'border-t border-mkt-border-subtle' : ''
                }`}
              >
                <span className="col-span-2 mkt-label text-mkt-fg-tertiary md:col-span-1 md:pt-0.5">
                  {row.dimension}
                </span>
                <span className="flex items-start gap-2 mkt-body-sm font-light text-mkt-fg-secondary">
                  <span
                    className="material-symbols-outlined mt-px text-[15px] text-mkt-border-strong"
                    aria-hidden="true"
                  >
                    remove
                  </span>
                  {row.old}
                </span>
                <span className="flex items-start gap-2 mkt-body-sm text-mkt-fg">
                  <span
                    className="material-symbols-outlined mt-px text-[15px] text-mkt-accent-text"
                    aria-hidden="true"
                  >
                    check
                  </span>
                  {row.hirelens}
                </span>
              </div>
            ))}

            <div className="mkt-prism-hairline h-px w-full opacity-70" />
          </Reveal>
        </div>
      </section>
    </>
  )
}
