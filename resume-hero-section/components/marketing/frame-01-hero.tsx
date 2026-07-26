import Link from 'next/link'

import { HeroShader } from './hero-shader'

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

/** Widths of the blurred "noise" rows behind the hero's candidate card. */
const HERO_NOISE_ROWS = ['w-3/4', 'w-full', 'w-5/6', 'w-4/5', 'w-full']

/** The 250-applicant pile in the compression preview's left half. */
const PILE_ROWS = [
  'w-full',
  'w-11/12',
  'w-full',
  'w-4/5',
  'w-full',
  'w-9/12',
  'w-full',
  'w-11/12',
  'w-full',
  'w-4/5',
  'w-full',
  'w-9/12',
  'w-full',
  'w-4/5',
  'w-full',
  'w-9/12',
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
      <section
        id="product"
        className="relative isolate flex min-h-screen flex-col justify-center overflow-hidden bg-mkt-dark-bg pt-32 pb-16"
      >
        <HeroShader />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 md:px-20">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Content */}
            <div className="flex flex-col gap-8 lg:col-span-8">
              <h1 className="mkt-fade-in-up font-mkt-display text-[64px] leading-[68px] font-light tracking-[-0.02em] text-mkt-dark-fg md:text-[120px] md:leading-[110px] md:tracking-[-0.04em]">
                Your judgment,
                <br />
                on every candidate.
              </h1>

              <p className="mkt-fade-in-up mkt-delay-100 max-w-2xl font-mkt-body text-[18px] leading-[28px] text-mkt-dark-fg-variant">
                HireLens reads the whole pile, brings the few who matter into
                focus, and tells you what you&rsquo;d regret — so your best
                judgment reaches everyone, not just the top of the stack.
              </p>

              <div className="mkt-fade-in-up mkt-delay-200 flex flex-wrap items-center gap-6">
                <Link
                  href="/auth/signup"
                  className="group flex items-center gap-2 bg-mkt-primary-container px-8 py-4 font-mkt-mono text-[12px] leading-4 font-medium uppercase tracking-widest text-white transition-colors duration-300 hover:bg-mkt-inverse-primary"
                >
                  See it think
                  <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
                <a
                  href="#customers"
                  className="border border-mkt-dark-outline-variant px-8 py-4 font-mkt-mono text-[12px] leading-4 font-medium uppercase tracking-widest text-mkt-dark-fg transition-colors duration-300 hover:border-mkt-dark-fg"
                >
                  Book a demo
                </a>
              </div>

              <div className="mkt-fade-in-up mkt-delay-300 pt-12">
                <p className="font-mkt-mono text-[12px] leading-4 font-medium uppercase tracking-widest text-mkt-dark-fg-variant opacity-60">
                  {/* The spaces around each separator are significant — the
                      frame has them either side of the `mx-2` dot. */}
                  Trusted by teams hiring at scale{' '}
                  <span className="mx-2">·</span> Vertex{' '}
                  <span className="mx-2">·</span> Nexus{' '}
                  <span className="mx-2">·</span> Omni
                </p>
              </div>
            </div>

            {/* Abstract visual — the pile resolving into one card */}
            <div className="relative hidden h-full min-h-[500px] lg:col-span-4 lg:block">
              <div className="absolute inset-0 flex flex-col justify-center gap-4 opacity-30 blur-sm">
                {HERO_NOISE_ROWS.map((width, i) => (
                  <div
                    key={i}
                    className={`h-8 rounded-[0.25rem] bg-mkt-dark-surface-variant ${width}`}
                  />
                ))}
              </div>

              <div className="absolute top-1/2 z-20 w-full -translate-y-1/2">
                <div className="mkt-iris-hairline mb-4 w-full" />
                <div className="mkt-glass-panel border-l-4 border-l-mkt-primary-container p-6">
                  <div className="mb-2 flex items-start justify-between">
                    <span className="font-mkt-mono text-[24px] leading-8 text-mkt-dark-fg">
                      J. Chen
                    </span>
                    <span className="rounded-[0.25rem] bg-mkt-primary-container/10 px-2 py-1 font-mkt-mono text-[12px] leading-4 font-medium tracking-[0.05em] text-mkt-primary-container">
                      98% MATCH
                    </span>
                  </div>
                  <p className="font-mkt-body text-[14px] leading-[22px] text-mkt-dark-fg-variant">
                    Exceptional systems architecture background. Flags: Short
                    tenure at previous role.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 animate-pulse flex-col items-center gap-2 opacity-50">
            <span className="font-mkt-mono text-[12px] leading-4 font-medium uppercase tracking-widest text-mkt-dark-fg">
              Scroll
            </span>
            <div className="h-12 w-px bg-mkt-dark-fg" />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* COMPRESSION PREVIEW                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-mkt-inverse-surface py-40">
        <div className="mx-auto max-w-[1440px] px-6 md:px-20">
          <div className="mb-24 text-center">
            <h2 className="mx-auto max-w-3xl font-mkt-display text-[32px] leading-[40px] text-mkt-dark-bg md:text-[48px] md:leading-[56px]">
              Watch a day of hiring resolve to the decisions that matter.
            </h2>
          </div>

          <div className="relative flex h-[600px] w-full overflow-hidden rounded-mkt-xl border border-mkt-dark-outline-variant/20 bg-mkt-dark-bg shadow-2xl">
            {/* Left: the pile */}
            <div className="relative flex h-full w-1/2 flex-col gap-2 overflow-hidden border-r border-mkt-dark-outline-variant/30 p-8 opacity-50">
              <div className="absolute top-4 left-8 z-10 font-mkt-mono text-[12px] leading-4 font-medium tracking-[0.05em] text-mkt-dark-fg-variant">
                250 APPLICANTS
              </div>
              <div className="mt-12 flex flex-col gap-3">
                {PILE_ROWS.map((width, i) => (
                  <div
                    key={i}
                    className={`h-4 rounded-[0.25rem] bg-mkt-dark-surface-variant/50 ${width}`}
                  />
                ))}
              </div>
            </div>

            {/* Center: the prism */}
            <div className="absolute top-0 left-1/2 z-20 flex h-full -translate-x-1/2 flex-col items-center">
              <div className="mkt-iris-hairline-vertical h-full" />
              <div className="absolute top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-full border border-mkt-primary-container bg-mkt-dark-bg px-3 py-2 font-mkt-mono text-[12px] leading-4 font-medium tracking-[0.05em] text-mkt-primary-container">
                <span className="material-symbols-outlined text-sm">
                  filter_list
                </span>
                COMPRESS
              </div>
            </div>

            {/* Right: the signal */}
            <div className="relative flex h-full w-1/2 flex-col gap-6 overflow-hidden bg-mkt-canvas p-8">
              <div className="absolute top-4 right-8 z-10 font-mkt-mono text-[12px] leading-4 font-medium tracking-[0.05em] text-mkt-dark-surface-variant">
                4 KEY DECISIONS
              </div>
              <div className="mt-12 flex flex-col gap-4">
                <div className="relative border border-mkt-dark-outline-variant/10 bg-white p-6 shadow-sm">
                  <div className="mkt-iris-hairline absolute top-0 left-0 w-full opacity-50" />
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mkt-mono text-[24px] leading-8 text-mkt-dark-bg">
                      S. Rahman
                    </span>
                    <span className="rounded-[0.25rem] bg-mkt-primary-container/10 px-2 py-1 font-mkt-mono text-[12px] leading-4 font-medium tracking-[0.05em] text-mkt-primary-container">
                      LEADERSHIP RISK
                    </span>
                  </div>
                  <p className="font-mkt-body text-[14px] leading-[22px] text-mkt-dark-surface-variant">
                    Technically sound, but historical team attrition rates are
                    high.
                  </p>
                </div>

                <div className="relative border border-mkt-dark-outline-variant/10 bg-white p-6 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mkt-mono text-[24px] leading-8 text-mkt-dark-bg">
                      M. Davis
                    </span>
                    <span className="rounded-[0.25rem] bg-mkt-tertiary-container/10 px-2 py-1 font-mkt-mono text-[12px] leading-4 font-medium tracking-[0.05em] text-mkt-tertiary-container">
                      UNDISCOVERED
                    </span>
                  </div>
                  <p className="font-mkt-body text-[14px] leading-[22px] text-mkt-dark-surface-variant">
                    Non-traditional background but perfectly matches core skill
                    requirements.
                  </p>
                </div>

                <div className="relative border border-mkt-dark-outline-variant/10 bg-white p-6 opacity-50 shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mkt-mono text-[24px] leading-8 text-mkt-dark-bg">
                      A. Patel
                    </span>
                    <span className="rounded-[0.25rem] bg-mkt-dark-outline/10 px-2 py-1 font-mkt-mono text-[12px] leading-4 font-medium tracking-[0.05em] text-mkt-dark-outline">
                      STANDARD
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
