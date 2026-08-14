import Link from 'next/link'

import { CompressionEngine } from './compression-engine'
import { BlurReveal, ConstellationBackground, MaskReveal } from './fx'
import { HeroWorkspace } from './hero-workspace'
import { Reveal } from './motion'
import { ProductVideo } from './product-video'

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
        {/* ---------------------------------------------------------------- */}
        {/* BACKGROUND STACK                                                  */}
        {/*   -z-30  ambient film                                             */}
        {/*   -z-20  scrim        <- makes the type legible over it           */}
        {/*   -z-10  node field                                               */}
        {/*    z-10  content                                                  */}
        {/* ---------------------------------------------------------------- */}

        {/* The film. `cover` on a full-bleed box, so the framing is whatever
            the viewport gives it — there is no composition to protect here,
            because everything that matters is drawn on top. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-30">
          <ProductVideo
            src="/hero/hero-ambient.mp4"
            webm="/hero/hero-ambient.webm"
            poster="/hero/hero-ambient-poster.webp"
            width={1920}
            height={1074}
            fit="cover"
            priority
            label=""
          />
        </div>

        {/* THE SCRIM IS NOT TASTE, IT IS A MEASUREMENT.
            The footage peaks at Y=226/255 — near-white cloud — and those
            highlights sweep through the LEFT half of the frame, which is
            exactly where the headline and body copy sit. Body text at
            #9ea4b0 needs its composited background at or below 64 grey to
            hold 4.5:1, which over a 226 pixel means an effective alpha of at
            least 0.77.

            Two layers, multiplied: a flat 0.62 everywhere, plus a
            left-weighted wash held near full strength to 45% and dying out by
            78%. The wash must stay strong that far across because the text
            column runs to 51% of the viewport — an earlier version faded from
            35% and measured 2.94:1 at the right end of the proof strip, which
            looks fine and fails. Worst case at 55% is now 0.784 effective,
            compositing a 226 highlight to 61 grey: 4.75:1 for #9ea4b0.

            The vertical pass seats the fixed nav, which would otherwise sit on
            open sky, and darkens the last 24% so the section does not butt
            into the light band below on a bright frame. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 bg-[#0E1013]/62"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(14,16,19,0.72)_0%,rgba(14,16,19,0.62)_45%,rgba(14,16,19,0)_78%),linear-gradient(180deg,rgba(14,16,19,0.72)_0%,rgba(14,16,19,0)_24%,rgba(14,16,19,0)_76%,rgba(14,16,19,0.55)_100%)]"
        />

        {/* The node field, now the third layer rather than the only one. Cut
            from 0.55 to 0.3: with the film carrying the atmosphere, the
            original strength reads as debris over the picture rather than as
            depth behind the type. */}
        <ConstellationBackground intensity={0.3} />

        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-6 md:px-20">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Content */}
            <div className="flex flex-col gap-6 lg:col-span-5">
              {/* 72/76. Linear and Vercel both cap their hero at 64px; Stripe
                  runs 38.6. Newsreader at 300 carries less optical mass than a
                  510-weight sans, so 72 sits level with a 64px Linear headline
                  rather than above it. At 120px the two authored lines wrapped
                  to three and the block alone was 330px — 2.6x Linear's. */}
              {/* Two sentences, set as two stanzas. The first is what every
                  competitor can say; the second is what only this product can.
                  The line break is the argument — the eye lands on "regret"
                  because it starts a line of its own.

                  Newsreader at 300 carries less optical mass than a 510 sans,
                  so 68px here sits level with a 60px Linear headline rather
                  than shouting over it. The second stanza is the same size and
                  full-strength white while the first is recessed: the contrast
                  does the emphasis, so neither line needs bold or colour. */}
              {/* 64 -> 50. The headline stops being the largest object on the
                  screen so the working surface can be. A hero whose type
                  dominates says "read our positioning"; a hero whose product
                  dominates says "this is what you would be using". */}
              <h1 className="font-mkt-display text-[34px] leading-[40px] font-light tracking-[-0.02em] md:text-[50px] md:leading-[56px] md:tracking-[-0.025em]">
                <span className="mkt-fade-in-up block text-mkt-dark-fg-variant">
                  Every tool tells you
                  <br className="hidden md:block" /> who’s strongest.
                </span>
                <span className="mkt-fade-in-up mkt-delay-100 mt-2 block text-mkt-dark-fg md:mt-3">
                  HireLens tells you
                  <br className="hidden md:block" /> who you’d regret.
                </span>
              </h1>

              {/* 60ch, not 2xl. A hero paragraph that runs the full column is
                  read as a block of text rather than as a sentence. */}
              <p className="mkt-fade-in-up mkt-delay-200 max-w-[60ch] text-[17px] leading-[28px] text-mkt-dark-fg-variant md:text-[18px] md:leading-[30px]">
                HireLens reads every résumé in full and names what a ranking
                hides.{' '}
                <span className="text-mkt-dark-fg">
                  Every claim opens to the line it came from.
                </span>
              </p>

              {/* Inter, sentence case, 4px radius, flat fills (V2 §4, §12).
                  These were mono UPPERCASE on a violet block. One primary per
                  view: the filled control is the only terracotta on the screen,
                  which is what makes it read as the thing to do. */}
              <div className="mkt-fade-in-up mkt-delay-300 flex flex-wrap items-center gap-3">
                <Link
                  href="/auth/signup"
                  className="rounded-[4px] bg-mkt-primary-container px-5 py-2.5 text-[15px] font-medium leading-6 text-white transition-colors duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)] hover:bg-mkt-inverse-primary"
                >
                  Request access
                </Link>
                <a
                  href="#how-it-works"
                  className="rounded-[4px] border border-mkt-dark-outline-variant px-5 py-2.5 text-[15px] font-medium leading-6 text-mkt-dark-fg transition-colors duration-[var(--hl-dur-base)] ease-[var(--hl-ease-out)] hover:border-mkt-dark-outline hover:bg-white/[0.04]"
                >
                  See how it reads a résumé
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
              {/* Three checkable properties of the product, not an invented
                  customer list. Inter rather than mono uppercase: this is prose
                  about behaviour, not data. Kept at tertiary weight so it reads
                  as a footnote to the CTAs rather than competing with them. */}
              <div className="mkt-fade-in-up mkt-delay-400 pt-10">
                {/* --mkt-dark-outline (#606a7c) is a BORDER token, and it was
                    being used for 13.5px text. Against the section ground it
                    measures 3.39:1 — under AA for normal text before the film
                    was ever added. --mkt-dark-fg-variant is 7.37:1 and is the
                    token that exists for recessed prose. */}
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13.5px] leading-5 text-mkt-dark-fg-variant">
                  <span>Reads every résumé, not the top twenty</span>
                  <span aria-hidden="true" className="opacity-50">·</span>
                  <span>Every claim traced to its source</span>
                  <span aria-hidden="true" className="opacity-50">·</span>
                  <span>Reversible for 30 days</span>
                </p>
              </div>
            </div>

            {/* The product, still. The film behind this section is atmosphere,
                not evidence — it contains no HireLens UI — so the claim that
                the product works is still carried by this card: real scores,
                a risk derived from the résumé's own dates, and the two lines
                it was read from. When a screen recording of the product
                exists, it belongs HERE, and <ProductVideo> is ready for it. */}
            <div className="lg:col-span-7">
              {/* No TiltCard here. A tilt on a 424px card is a material
                  property; the same tilt on a 700px working surface skews a
                  dozen rows of live text, and the far edge stops being
                  readable. The surface earns attention by working, which is
                  the whole brief — it does not need a perspective trick. */}
              <HeroWorkspace />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* COMPRESSION PREVIEW                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative bg-mkt-inverse-surface py-32 md:py-40">
        <div className="mx-auto max-w-[1440px] px-6 md:px-20">
          <div className="mb-14 flex flex-col items-center gap-6 text-center">
            {/* Mask reveal rather than a fade: the heading is display type on
                an inverse band, so it can carry a line-by-line entrance that
                would be too much for body copy. */}
            <MaskReveal
              as="h2"
              className="mx-auto max-w-3xl font-mkt-display text-[32px] leading-[40px] text-mkt-dark-bg md:text-[48px] md:leading-[56px]"
            >
              Watch a day of hiring resolve to the decisions that matter.
            </MaskReveal>

            {/* A three-beat legend for the panel below, so the eye knows what
                it is reading before the motion starts. Blur-to-focus, and
                deliberately behind the heading: the legend is read second. */}
            <BlurReveal
              as="ol"
              delay={0.22}
              blur={7}
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 mkt-label text-mkt-dark-bg/50"
            >
              <li>Intake</li>
              <li aria-hidden="true" className="text-mkt-dark-bg/25">
                &rarr;
              </li>
              <li>Compression</li>
              <li aria-hidden="true" className="text-mkt-dark-bg/25">
                &rarr;
              </li>
              <li>Signal</li>
            </BlurReveal>
          </div>

          <Reveal delay={80}>
            <CompressionEngine />
          </Reveal>
        </div>
      </section>
    </>
  )
}
