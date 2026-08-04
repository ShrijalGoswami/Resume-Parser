import Link from 'next/link'

import { CompressionEngine } from './compression-engine'
import { HeroShader } from './hero-shader'
import { Reveal } from './motion'

/**
 * Frame 1 — `hirelens_marketing_hero_frame_1`.
 *
 * Two sections: the Deep Ink hero (display-xl headline, 8-of-12 column, with
 * the floating candidate card in the remaining 4) and the Compression Preview
 * on the inverse-surface band beneath it.
 *
 * Type scale (frame 1's own tailwind config, which differs from frames 2–5):
 *   display-xl        120 / 110, -0.04em, 300
 *   display-xl-mobile  64 /  68, -0.02em, 300
 *   headline-lg        48 /  56, 400
 *   headline-lg-mobile 32 /  40, 400
 *   body-lg            18 /  28, 400
 *   body-sm            14 /  22, 400
 *   data-value         24 /  32, 400   (JetBrains Mono)
 *   data-label         12 /  16, 500   (JetBrains Mono, 0.05em)
 */

/** The unresolved pile behind the hero's candidate card. Each row is a real
 *  applicant reduced to what you can tell about them before HireLens reads
 *  them — a name you can't rank and a role you can't verify. They sit blurred
 *  and dim so the one resolved card in front carries all the focus. */
const HERO_PILE = [
  { name: 'R. Kaur', meta: 'PDF · 9 yrs', width: 'w-full' },
  { name: 'T. Møller', meta: 'DOCX · 6 yrs', width: 'w-11/12' },
  { name: 'A. Okonkwo', meta: 'PDF · 7 yrs', width: 'w-full' },
  { name: 'L. Silva', meta: 'DOCX · 11 yrs', width: 'w-10/12' },
  { name: 'M. Bianchi', meta: 'PDF · 5 yrs', width: 'w-full' },
  { name: 'P. Varga', meta: 'DOCX · 8 yrs', width: 'w-11/12' },
]

/** The three numbers under the hero's resolved card — the whole product in one
 *  line: everything read, evidence attached, nothing dropped unseen. */
const HERO_READOUT = [
  { value: '250', label: 'Read' },
  { value: '612', label: 'Evidence' },
  { value: '0', label: 'Unseen' },
]

export function Frame01Hero() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* HERO                                                              */}
      {/* ---------------------------------------------------------------- */}
      {/* `isolate` matters: the shader overlay blends with `mix-blend-screen`.
          Stitch gets its dark backdrop from a dark <body>; here the section owns
          its ink background, so without an isolated stacking context the blend
          would composite against the page's white canvas and wash the hero out
          to grey. */}
      {/* pt-20 clears the 72px fixed nav and no more. pt-32 was clearing a
          105px nav *and* fighting `justify-center`, pushing the hero to 132vh
          so the CTAs sat below the fold on a 639px laptop viewport. Stripe,
          Linear, Vercel and Cursor all fit hero + social proof inside 100vh. */}
      <section
        id="product"
        /* pt-20 (80px) is a floor, not a preference: the nav is fixed at 72px
           and the hero is `justify-center`, so anything less slides the
           headline under the bar. Bottom padding carries the reduction. */
        className="mkt-min-vh relative isolate flex flex-col justify-center overflow-hidden bg-mkt-dark-bg pt-24 pb-16"
      >
        <HeroShader />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 md:px-20">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Content */}
            <div className="flex flex-col gap-8 lg:col-span-8">
              {/* 72/76. Linear and Vercel both cap their hero at 64px; Stripe
                  runs 38.6. Newsreader at 300 carries less optical mass than a
                  510-weight sans, so 72 sits level with a 64px Linear headline
                  rather than above it. At 120px the two authored lines wrapped
                  to three and the block alone was 330px — 2.6x Linear's. */}
              <h1 className="mkt-fade-in-up font-mkt-display text-[44px] leading-[48px] font-light tracking-[-0.02em] text-mkt-dark-fg md:text-[72px] md:leading-[76px] md:tracking-[-0.03em]">
                Your judgment,
                <br />
                on every candidate.
              </h1>

              <p className="mkt-fade-in-up mkt-delay-100 max-w-2xl mkt-body-lg text-mkt-dark-fg-variant">
                HireLens reads the whole pile, brings the few who matter into
                focus, and tells you what you&rsquo;d regret — so your best
                judgment reaches everyone, not just the top of the stack.
              </p>

              <div className="mkt-fade-in-up mkt-delay-200 flex flex-wrap items-center gap-6">
                <Link
                  href="/auth/signup"
                  className="group flex items-center gap-2 bg-mkt-primary-container px-7 py-3 mkt-data font-medium uppercase tracking-widest text-white transition-colors duration-300 hover:bg-mkt-inverse-primary"
                >
                  See it think
                  {/* `aria-hidden` because the ligature IS the text content.
                      Without it this link's accessible name — and the text
                      every crawler and LLM extracts — reads
                      "See it thinkarrow_forward". */}
                  <span
                    className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                </Link>
                <a
                  href="#customers"
                  className="border border-mkt-dark-outline-variant px-7 py-3 mkt-data font-medium uppercase tracking-widest text-mkt-dark-fg transition-colors duration-300 hover:border-mkt-dark-fg"
                >
                  Book a demo
                </a>
              </div>

              {/* WHAT THIS LINE MAY SAY.
                  It read "Trusted by teams hiring at scale · Vertex · Nexus ·
                  Omni". None of those three companies exists as a customer —
                  HireLens has no reference customers at all yet — so the line
                  was an invented endorsement in the most prominent position on
                  the site.

                  The slot is kept because the hero needs a third beat under the
                  CTAs, but it now states a property of the PRODUCT, which is
                  checkable, rather than a claim about who uses it, which was
                  not. Nothing goes back in here until there is a customer who
                  has agreed in writing to be named. */}
              <div className="mkt-fade-in-up mkt-delay-300 pt-12">
                <p className="mkt-data font-medium uppercase tracking-widest text-mkt-dark-fg-variant opacity-60">
                  {/* The spaces around each separator are significant — the
                      frame has them either side of the `mx-2` dot. */}
                  Every claim opens to its evidence{' '}
                  <span className="mx-2">·</span> Every decision reversible{' '}
                  <span className="mx-2">·</span> Nothing left unread
                </p>
              </div>
            </div>

            {/* Abstract visual — the pile resolving into one card */}
            <div className="relative hidden h-full min-h-[520px] lg:col-span-4 lg:block">
              {/* The unread pile: legible enough to register as people, blurred
                  enough that you can't act on any of them. */}
              <div className="absolute inset-0 flex flex-col justify-center gap-3 opacity-30 blur-[3px]">
                {HERO_PILE.map((row) => (
                  <div
                    key={row.name}
                    className={`flex items-center justify-between gap-3 rounded-[0.25rem] border border-white/[0.06] bg-mkt-dark-surface-variant/60 px-3 py-2.5 ${row.width}`}
                  >
                    <span className="mkt-body-sm font-mkt-label text-mkt-dark-fg/70">
                      {row.name}
                    </span>
                    <span className="mkt-data text-mkt-dark-fg/40">
                      {row.meta}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mkt-float absolute top-1/2 z-20 w-full -translate-y-1/2">
                <div className="mkt-iris-hairline mb-4 w-full" />
                <div className="mkt-glass-panel border-l-4 border-l-mkt-primary-container p-6">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="font-mkt-mono text-[24px] leading-8 text-mkt-dark-fg">
                      J. Chen
                    </span>
                    <span className="rounded-[0.25rem] bg-mkt-primary-container/10 px-2 py-1 mkt-data font-medium tracking-[0.05em] text-mkt-primary-container">
                      98% MATCH
                    </span>
                  </div>
                  <p className="mkt-body-sm text-mkt-dark-fg-variant">
                    Exceptional systems architecture background. Flags: Short
                    tenure at previous role.
                  </p>

                  {/* What sits under every claim: the evidence, and the fact
                      that nobody in the pile went unread to produce it. */}
                  <dl className="mt-5 flex items-center justify-between border-t border-white/[0.08] pt-4">
                    {HERO_READOUT.map((stat) => (
                      <div key={stat.label} className="flex flex-col gap-1">
                        <dd className="font-mkt-mono text-[16px] leading-none text-mkt-dark-fg">
                          {stat.value}
                        </dd>
                        <dt className="mkt-label-sm text-mkt-dark-outline">
                          {stat.label}
                        </dt>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 animate-pulse flex-col items-center gap-2 opacity-50">
            <span className="mkt-data font-medium uppercase tracking-widest text-mkt-dark-fg">
              Scroll
            </span>
            <div className="h-12 w-px bg-mkt-dark-fg" />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* COMPRESSION PREVIEW                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-mkt-inverse-surface py-32 md:py-40">
        <div className="mx-auto max-w-[1440px] px-6 md:px-20">
          <Reveal className="mb-14 flex flex-col items-center gap-6 text-center">
            <h2 className="mx-auto max-w-3xl font-mkt-display text-[32px] leading-[40px] text-mkt-dark-bg md:text-[48px] md:leading-[56px]">
              Watch a day of hiring resolve to the decisions that matter.
            </h2>

            {/* A three-beat legend for the panel below, so the eye knows what
                it is reading before the motion starts. */}
            <ol className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mkt-label text-mkt-dark-bg/50">
              <li>Intake</li>
              <li aria-hidden="true" className="text-mkt-dark-bg/25">
                &rarr;
              </li>
              <li>Compression</li>
              <li aria-hidden="true" className="text-mkt-dark-bg/25">
                &rarr;
              </li>
              <li>Signal</li>
            </ol>
          </Reveal>

          <Reveal delay={80}>
            <CompressionEngine />
          </Reveal>
        </div>
      </section>
    </>
  )
}
