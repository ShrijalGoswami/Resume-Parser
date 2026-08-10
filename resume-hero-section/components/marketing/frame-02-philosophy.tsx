'use client'

import { Reveal } from './motion'
import { EditorialBackdrop } from './fx/editorial-backdrops'

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
 * Note frame 2's `ink` is --mkt-dark-bg (not the deeper --mkt-ink of frames 4–5); the
 * Stakes band is deliberately the lighter of the two inks.
 */

/**
 * WHAT THIS SECTION USED TO BE, AND WHY IT IS NOT THAT ANY MORE.
 *
 * It carried four customer logos (Vertex, Nexus, Omni, Meridian — as real PNG
 * files), a quote attributed to a "Head of Talent, Vertex", and four animated
 * outcome counters: −38% time-to-decision, 4.1× more of the pile reviewed, 100%
 * of decisions with evidence, and zero regretted hires over two quarters.
 *
 * Not one of those companies is a customer. Not one of those numbers was
 * measured. HireLens has three recruiters across two real organizations and has
 * never processed a payment, so the entire band was an invented endorsement —
 * a deceptive-endorsement exposure under the FTC guides and, for the market
 * these prices are set in, under the CCPA 2019 misleading-advertisement
 * provisions.
 *
 * The section keeps its `#customers` id (the nav and two CTAs target it) and
 * its shape: a statement, then a four-up grid supporting it. What changed is
 * that every figure in the grid is now a PROPERTY OF THE ANALYSIS — true of
 * every run, checkable by anyone with an account, and derived from how the
 * product actually works rather than from a customer we do not have.
 *
 * NOTHING GOES BACK IN HERE without a named customer who has agreed in writing
 * to be quoted, and a number somebody actually measured.
 */

/** What the instrument guarantees on every run. Each is a design property of
 *  the product, not an outcome claimed on someone's behalf. */
const ANALYSIS_PROPERTIES = [
  {
    value: 'Every',
    label: 'Résumé read in full',
    detail: 'No keyword pre-filter decides who gets looked at.',
  },
  {
    value: 'Every',
    label: 'Claim linked to its source',
    detail: 'Each statement opens to the passage it came from.',
  },
  {
    value: 'Both',
    label: 'Directions of regret priced',
    detail: 'What you lose by choosing either candidate, not just the winner.',
  },
  {
    value: '30 days',
    label: 'Every decision reversible',
    detail: 'Logged, attributable, and reopenable.',
  },
]

/** Order matches ANALYSIS_PROPERTIES: read-in-full, claim-to-source,
 *  both-directions, reversible-window. */
const PROOF_KINDS = ['read', 'source', 'regret', 'reverse'] as const

/**
 * The small drawn proof under each guarantee — the principle restated in the
 * product's own notation (lines read, a claim tied to its span, regret priced
 * both ways, a decision that can come back). Decorative to a screen reader;
 * the prose above each one carries the meaning.
 */
function PrincipleProof({ kind }: { kind: (typeof PROOF_KINDS)[number] }) {
  const border = 'var(--mkt-border-strong)'
  const ink = 'var(--mkt-fg-tertiary)'
  const copper = '#C48B71'
  const terracotta = 'var(--mkt-accent)'
  const olive = '#8FA678'
  return (
    <svg
      className="h-12 w-full"
      viewBox="0 0 220 48"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden="true"
    >
      {kind === 'read' && (
        <>
          {/* A page, every line swept — none skipped. */}
          <rect x="1" y="1" width="64" height="46" rx="3" fill="none" stroke={border} />
          {[9, 17, 25, 33, 41].map((y, i) => (
            <line key={y} x1="8" y1={y} x2={i === 4 ? 40 : 58} y2={y} stroke={ink} strokeOpacity="0.5" />
          ))}
          {/* The read head, past the last line. */}
          <line x1="75" y1="1" x2="75" y2="47" stroke={copper} strokeOpacity="0.6" />
          {[9, 17, 25, 33, 41].map((y) => (
            <circle key={y} cx="86" cy={y} r="1.7" fill={copper} fillOpacity="0.75" />
          ))}
          <text x="98" y="28" fill={ink} fontSize="9" fontFamily="var(--mkt-font-mono)">
            5/5 lines
          </text>
        </>
      )}
      {kind === 'source' && (
        <>
          {/* The claim… */}
          <rect x="1" y="8" width="76" height="14" rx="3" fill="none" stroke={border} />
          <line x1="8" y1="15" x2="70" y2="15" stroke={ink} strokeOpacity="0.5" />
          {/* …and the span it hangs from, joined by one copper thread. */}
          <path d="M 40 22 C 40 38, 120 12, 138 26" fill="none" stroke={copper} strokeOpacity="0.7" />
          <circle cx="138" cy="26" r="2" fill={copper} />
          <rect x="142" y="18" width="76" height="16" rx="3" fill={copper} fillOpacity="0.1" stroke={copper} strokeOpacity="0.45" />
          <line x1="149" y1="26" x2="210" y2="26" stroke={copper} strokeOpacity="0.6" />
        </>
      )}
      {kind === 'regret' && (
        <>
          {/* One axis, cost priced in both directions off it. */}
          <line x1="110" y1="4" x2="110" y2="44" stroke={border} />
          <rect x="34" y="10" width="76" height="8" rx="2" fill={olive} fillOpacity="0.5" />
          <rect x="110" y="30" width="58" height="8" rx="2" fill={terracotta} fillOpacity="0.5" />
          <text x="34" y="30" fill={ink} fontSize="9" fontFamily="var(--mkt-font-mono)">
            pick A
          </text>
          <text x="174" y="26" fill={ink} fontSize="9" fontFamily="var(--mkt-font-mono)">
            pick B
          </text>
        </>
      )}
      {kind === 'reverse' && (
        <>
          {/* A decision on a timeline — and the way back, still open. */}
          <line x1="4" y1="30" x2="216" y2="30" stroke={border} />
          {[4, 46, 88, 130, 172, 214].map((x) => (
            <line key={x} x1={x} y1="27" x2={x} y2="33" stroke={ink} strokeOpacity="0.5" />
          ))}
          <circle cx="88" cy="30" r="3.5" fill={terracotta} fillOpacity="0.85" />
          <path d="M 88 22 C 88 8, 20 8, 12 22" fill="none" stroke={copper} strokeOpacity="0.7" strokeDasharray="3 3" />
          <path d="M 15 15 L 12 22 L 19 21" fill="none" stroke={copper} strokeOpacity="0.7" />
          <text x="150" y="18" fill={ink} fontSize="9" fontFamily="var(--mkt-font-mono)">
            day 30
          </text>
        </>
      )}
    </svg>
  )
}

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

/**
 * The Focus Thread — the manifesto's thesis as one drawing. 250 hairline
 * ticks (the pile) thinning and dimming down the column until a single
 * terracotta mark remains: the memo's 250→…→1 trail rotated vertical and
 * slowed to reading speed. Deterministic integer math only — this renders on
 * the server and the client must agree to the last bit.
 */
const THREAD_TICKS = Array.from({ length: 250 }, (_, i) => {
  const t = i / 249
  // Spacing tightens toward the top (the pile is a mass) and opens as it
  // resolves; scatter converges onto the axis as order emerges. Chaos at the
  // top of the column, alignment at the bottom.
  const y = 12 + 556 * Math.pow(t, 1.35)
  const scatter = ((((i * 7919) % 105) - 52) / 52) * 52 * Math.pow(1 - t, 1.5)
  const half = 8 + 5 * (1 - t)
  return {
    y,
    x1: 80 + scatter - half,
    x2: 80 + scatter + half,
    opacity: 0.07 + 0.13 * (1 - t),
  }
})

/** Captions beside the thread, top → bottom, echoing the three paragraphs. */
const THREAD_CAPTIONS = ['250 arrive', 'the few who matter', 'one decision']

function FocusThread() {
  return (
    <div className="relative h-full min-h-[420px]" aria-hidden="true">
      <svg
        className="absolute inset-y-0 left-0 h-full w-32"
        viewBox="0 0 160 600"
        preserveAspectRatio="none"
      >
        {THREAD_TICKS.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1}
            y1={tick.y}
            x2={tick.x2}
            y2={tick.y}
            stroke="var(--mkt-fg)"
            strokeOpacity={tick.opacity}
            strokeWidth={1}
          />
        ))}
        {/* The decision: the one mark that keeps its full weight. */}
        <line x1={62} y1={578} x2={98} y2={578} stroke="var(--mkt-accent)" strokeOpacity={0.9} strokeWidth={2.5} />
        <circle cx={80} cy={578} r={7} fill="none" stroke="var(--mkt-accent)" strokeOpacity={0.35} strokeWidth={1} />
      </svg>

      {/* Captions ride the thread at the heights of the three paragraphs. */}
      {THREAD_CAPTIONS.map((caption, i) => (
        <span
          key={caption}
          className="absolute left-32 flex items-center gap-2 whitespace-nowrap mkt-data text-mkt-fg-tertiary"
          style={{ top: `${[6, 48, 92][i]}%` }}
        >
          <span className="h-px w-5 bg-mkt-prism-cyan" />
          {caption}
        </span>
      ))}
    </div>
  )
}

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
        className="relative isolate w-full overflow-hidden bg-mkt-canvas py-28"
      >
        {/* The pile: volume resolving into order, lit where it resolves. */}
        <EditorialBackdrop variant="pile" />
        <div className="mb-20 h-px w-full bg-mkt-border-subtle" />

        {/* Asymmetric spread: the statement reads down the left column while
            the four guarantees stack beside it — one composition, not a
            heading floating above a row of cards. */}
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-start gap-14 px-6 md:px-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Reveal className="flex flex-col lg:sticky lg:top-28">
            <p className="mb-6 mkt-label text-mkt-fg-tertiary">
              What every run guarantees
            </p>
            <p className="mb-6 text-balance font-mkt-display text-[2.5rem] leading-[1.15] font-light tracking-[-0.02em] text-mkt-fg">
              We would rather show you the instrument than tell you about it.
            </p>
            <p className="max-w-md mkt-body text-mkt-fg-secondary">
              HireLens is early, and we are not going to dress that up with logos we have not
              earned. What follows is what the analysis does on every run — check it yourself on
              two résumés, free, without a card.
            </p>
            {/* The registration line: how to read the grid beside this. */}
            <p className="mt-10 flex items-center gap-3 mkt-data text-mkt-fg-tertiary">
              <span className="h-px w-8 bg-mkt-prism-cyan" aria-hidden="true" />
              Four properties of the analysis, not four claims about customers
            </p>
          </Reveal>

          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-mkt-lg border border-mkt-border-subtle bg-mkt-border-subtle sm:grid-cols-2">
            {ANALYSIS_PROPERTIES.map((property, i) => (
              <Reveal
                key={property.label}
                delay={100 + i * 80}
                className="mkt-lift flex flex-col bg-mkt-canvas p-6 md:p-7"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <dd className="font-mkt-mono text-3xl leading-none text-mkt-fg">
                    {property.value}
                  </dd>
                  <span className="mkt-label-sm text-mkt-fg-tertiary">0{i + 1}</span>
                </div>
                <dt className="mt-3 font-mkt-label text-base font-medium text-mkt-fg">
                  {property.label}
                </dt>
                <p className="mt-1.5 flex-1 mkt-body-sm text-mkt-fg-tertiary">{property.detail}</p>
                {/* The proof, drawn: each principle gets a small diagram in
                    the product's own notation rather than more prose. */}
                <div className="mt-5 border-t border-mkt-border-subtle pt-4">
                  <PrincipleProof kind={PROOF_KINDS[i]} />
                </div>
              </Reveal>
            ))}
          </dl>
        </div>

        <div className="mt-24 h-px w-full bg-mkt-border-subtle" />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* THE STAKES (dark interstitial)                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative w-full overflow-hidden bg-mkt-dark-bg py-32 text-mkt-canvas md:py-32">
        {/* End of a long day: one pool of lamp light, the rest falling off.
            Replaces the engineering grid — the stakes are human, not
            technical. */}
        <EditorialBackdrop variant="desk" zBase />
        <div className="mkt-vignette-dark pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-end gap-16 px-6 md:px-12 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal className="flex flex-col items-start">
            <p className="mb-12 mkt-label text-mkt-fg-tertiary">
              The Stakes
            </p>
            <h2 className="mb-12 max-w-4xl text-balance font-mkt-display text-[2.25rem] leading-tight font-light tracking-[-0.03em] md:text-[3rem]">
              The cost of a wrong hire isn’t a bad quarter.
              <br />
              <span className="text-mkt-muted">It’s a lost year.</span>
            </h2>
            <p className="max-w-xl mkt-data leading-relaxed text-mkt-fg-secondary">
              A mis-hire costs ~30% of first-year salary — and the momentum you
              can’t get back.
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
                    <dd className="shrink-0 font-mkt-mono text-xl text-[#ffb184]">
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
      <section className="relative isolate w-full overflow-hidden bg-mkt-canvas py-32">
        <EditorialBackdrop variant="paper" />
        <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 md:px-12">
          <Reveal>
            <h2 className="mb-16 max-w-3xl text-center text-balance font-mkt-display text-[2.5rem] leading-[1.2] font-light tracking-[-0.02em] text-mkt-fg">
              Recruiting isn’t a volume problem.
              <br />
              It’s a focus problem.
            </h2>
          </Reveal>

          {/* The manifesto keeps its 680px measure; each paragraph now carries
              a margin note naming the principle it argues for, which is what
              turns a wall of prose into something scannable. The Focus Thread
              rides the right flank — the same argument, drawn once. */}
          <div className="grid w-full max-w-[900px] grid-cols-1 lg:max-w-[1100px] lg:grid-cols-[minmax(0,900px)_minmax(180px,1fr)] lg:gap-16">
            <div className="flex flex-col gap-10">
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

            <Reveal delay={200} className="hidden lg:block">
              <FocusThread />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* THE QUIET ATS CONTRAST                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="w-full border-t border-mkt-border-subtle bg-mkt-canvas py-28">
        {/* The contrast as a centerpiece: the claim reads down a narrow left
            column, the ledger of differences carries the width beside it. */}
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-14 px-6 md:px-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <Reveal className="flex flex-col lg:sticky lg:top-28">
            <p className="mb-6 mkt-label text-mkt-fg-tertiary">
              The category difference
            </p>
            <h3 className="mb-6 text-balance font-mkt-display text-[2rem] leading-[1.2] font-light tracking-[-0.02em] text-mkt-fg">
              An ATS remembers candidates.{' '}
              <span className="text-mkt-accent">HireLens</span> helps you
              choose one.
            </h3>
            <p className="max-w-sm mkt-body-sm text-mkt-fg-secondary">
              Five questions, asked of both. An ATS answers them as a system of
              record. HireLens answers them as an instrument you decide with.
            </p>
            <p className="mt-10 flex items-center gap-3 mkt-data text-mkt-fg-tertiary">
              <span className="h-px w-8 bg-mkt-prism-cyan" aria-hidden="true" />
              Read each row left to right
            </p>
          </Reveal>

          <div className="overflow-hidden rounded-mkt-xl border border-mkt-border-subtle shadow-[var(--mkt-shadow-card-resting)]">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-x-4 border-b border-mkt-border bg-mkt-subtle px-5 py-3 md:grid-cols-[130px_minmax(0,1fr)_minmax(0,1.05fr)] md:px-7">
              <span className="hidden mkt-label text-mkt-fg-tertiary md:block">
                &nbsp;
              </span>
              <span className="mkt-label text-mkt-fg-tertiary">
                The Old Way
              </span>
              <span className="flex items-center gap-2 mkt-label text-mkt-accent-text">
                <span className="h-3 w-[2px] bg-mkt-accent" aria-hidden="true" />
                HireLens
              </span>
            </div>

            {ATS_CONTRAST.map((row, i) => (
              <Reveal
                key={row.dimension}
                delay={80 + i * 70}
                className={`group grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-stretch gap-x-4 gap-y-1 px-5 py-0 transition-colors duration-300 hover:bg-mkt-subtle/40 md:grid-cols-[130px_minmax(0,1fr)_minmax(0,1.05fr)] md:px-7 ${
                  i > 0 ? 'border-t border-mkt-border-subtle' : ''
                }`}
              >
                <span className="col-span-2 pt-4 mkt-label text-mkt-fg-tertiary md:col-span-1 md:py-5">
                  {row.dimension}
                </span>
                <span className="flex items-start gap-2 py-1 mkt-body-sm font-light text-mkt-fg-secondary md:py-5">
                  <span
                    className="material-symbols-outlined mt-px text-[15px] text-mkt-border-strong"
                    aria-hidden="true"
                  >
                    remove
                  </span>
                  {row.old}
                </span>
                {/* The HireLens column carries the warmth: a copper rule and
                    a faint tint that runs the full height of every row. */}
                <span className="-mr-5 flex items-start gap-2 border-l-2 border-mkt-accent/30 bg-mkt-accent-bg/50 py-3 pr-5 pl-4 mkt-body-sm text-mkt-fg transition-colors duration-300 group-hover:border-mkt-accent/60 md:-mr-7 md:py-5 md:pr-7">
                  <span
                    className="material-symbols-outlined mt-px text-[15px] text-mkt-accent-text"
                    aria-hidden="true"
                  >
                    check
                  </span>
                  {row.hirelens}
                </span>
              </Reveal>
            ))}

            <div className="flex items-center justify-between border-t border-mkt-border-subtle bg-mkt-subtle/60 px-5 py-3 mkt-data text-mkt-fg-tertiary md:px-7">
              <span>Same five questions · two kinds of tool</span>
              <span className="text-mkt-accent-text">
                The last two rows are the product
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
