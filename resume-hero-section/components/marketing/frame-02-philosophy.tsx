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

        <div className="mb-24 flex max-w-[1200px] justify-center gap-12 px-6 opacity-60 grayscale md:gap-24">
          {CUSTOMER_LOGOS.map((logo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={logo.src}
              src={logo.src}
              alt={logo.alt}
              className={`h-6 object-contain ${logo.className}`}
            />
          ))}
        </div>

        <div className="flex max-w-3xl flex-col items-center px-6 text-center">
          <p className="mb-8 text-balance font-mkt-display text-[2.5rem] leading-[1.2] font-light tracking-[-0.02em] text-mkt-fg">
            &ldquo;We stopped losing our best candidates in the pile.&rdquo;
          </p>
          <div className="flex items-center gap-4">
            <p className="font-mkt-body text-sm text-mkt-fg-secondary">
              Head of Talent, Vertex
            </p>
            <div className="h-1 w-1 rounded-full bg-mkt-border" />
            <p className="font-mkt-mono text-sm tracking-tight text-mkt-fg">
              −38% time-to-decision
            </p>
          </div>
        </div>

        <div className="mt-32 h-px w-full bg-mkt-border-subtle" />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* THE STAKES (dark interstitial)                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative w-full bg-mkt-dark-bg py-40 text-mkt-canvas">
        <div className="relative z-10 mx-auto flex max-w-[1200px] flex-col items-start px-6 md:px-12">
          <p className="mb-12 font-mkt-mono text-xs uppercase tracking-widest text-mkt-fg-tertiary">
            The Stakes
          </p>
          <h2 className="mb-12 max-w-4xl text-balance font-mkt-display text-[4rem] leading-tight font-light tracking-[-0.03em]">
            The cost of a wrong hire isn&rsquo;t a bad quarter.
            <br />
            <span className="text-mkt-muted">It&rsquo;s a lost year.</span>
          </h2>
          <p className="max-w-xl font-mkt-mono text-sm leading-relaxed text-mkt-fg-secondary">
            A mis-hire costs ~30% of first-year salary — and the momentum you
            can&rsquo;t get back.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* PRODUCT PHILOSOPHY                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="w-full bg-mkt-canvas py-40">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 text-center md:px-12">
          <h2 className="mb-16 max-w-3xl text-balance font-mkt-display text-[2.5rem] leading-[1.2] font-light tracking-[-0.02em] text-mkt-fg">
            Recruiting isn&rsquo;t a volume problem.
            <br />
            It&rsquo;s a focus problem.
          </h2>
          <div className="flex max-w-[680px] flex-col gap-8 text-left font-mkt-body text-[1.125rem] leading-[1.75rem] font-light text-mkt-fg-secondary">
            {MANIFESTO.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
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

          <div className="mx-auto flex max-w-4xl flex-col items-stretch justify-center overflow-hidden rounded-mkt-xl border border-mkt-border-subtle md:flex-row">
            {/* The old way */}
            <div className="flex flex-1 flex-col items-center justify-center bg-mkt-subtle p-12 text-center">
              <p className="mb-8 font-mkt-mono text-xs uppercase tracking-widest text-mkt-fg-tertiary">
                The Old Way
              </p>
              <ul className="space-y-4 font-mkt-body font-light text-mkt-fg-secondary">
                <li>Stores every candidate</li>
                <li>A searchable database</li>
                <li>You go digging</li>
              </ul>
            </div>

            <div className="hidden w-px bg-mkt-border md:block" />
            <div className="h-px w-full bg-mkt-border md:hidden" />

            {/* HireLens */}
            <div className="group relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-mkt-canvas p-12 text-center">
              <div className="mkt-prism-hairline absolute top-0 right-0 left-0 h-[2px] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
              <p className="mb-8 font-mkt-mono text-xs uppercase tracking-widest text-mkt-accent-text">
                HireLens
              </p>
              <ul className="space-y-4 font-mkt-body font-light text-mkt-fg">
                <li>Surfaces the few who matter</li>
                <li>A decision instrument</li>
                <li>It brings them to you</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
