const OLD_WAY = ['Stores every candidate', 'A searchable database', 'You go digging']
const NEW_WAY = ['Surfaces the few who matter', 'A decision instrument', 'It brings them to you']

/**
 * Philosophy — "why hiring breaks today, and how HireLens thinks differently."
 * The Stakes (dark) → recruiting is a focus problem → an ATS remembers vs
 * HireLens chooses. No fabricated metrics (the industry mis-hire cost is stated
 * qualitatively, not as an unsourced figure).
 */
export function Philosophy() {
  return (
    <section id="platform" className="scroll-mt-16">
      {/* The stakes — dark band */}
      <div className="bg-mkt-ink text-mkt-ink-fg">
        <div className="mx-auto max-w-6xl px-6 py-28">
          <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-ink-muted">
            The stakes
          </p>
          <h2 className="hl-display-lg mt-6 max-w-3xl">
            The cost of a wrong hire isn’t a bad quarter. It’s a lost year.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-mkt-ink-muted">
            A mis-hire drains a meaningful share of a first-year salary — and the team momentum you
            can’t get back.
          </p>
        </div>
      </div>

      {/* Focus, not volume — light */}
      <div className="bg-mkt-paper">
        <div className="mx-auto max-w-3xl px-6 py-28">
          <h2 className="hl-display-md text-center text-mkt-fg">
            Recruiting isn’t a volume problem.
            <br />
            It’s a focus problem.
          </h2>
          <div className="mt-10 flex flex-col gap-5 text-[15px] leading-relaxed text-mkt-fg-muted">
            <p>
              The modern talent pipeline is choked with noise. Résumés are optimized for parsers,
              not for truth. Searching for signal in a sea of keywords guarantees you’ll miss the
              outliers.
            </p>
            <p>
              We built HireLens as an instrument of clarity, not a warehouse for data. It doesn’t
              measure how many candidates you have — it measures how closely they align with the
              actual work.
            </p>
            <p>
              By applying deep semantic understanding to unstructured career trajectories, it
              elevates the few who matter, for a calmer and more decisive hiring process.
            </p>
          </div>
        </div>
      </div>

      {/* An ATS remembers vs HireLens chooses — comparison */}
      <div className="bg-mkt-paper-raised">
        <div className="mx-auto max-w-4xl px-6 py-28">
          <h2 className="hl-display-md text-center text-mkt-fg">
            An ATS remembers candidates.{' '}
            <span className="text-mkt-iris-text">HireLens</span> helps you choose one.
          </h2>
          <div className="mt-14 grid overflow-hidden rounded-2xl border border-mkt-border md:grid-cols-2">
            <div className="border-b border-mkt-border bg-mkt-paper p-8 md:border-b-0 md:border-r">
              <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-fg-subtle">
                The old way
              </p>
              <ul className="mt-5 flex flex-col gap-3 text-[15px] text-mkt-fg-muted">
                {OLD_WAY.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-mkt-paper p-8">
              <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-iris-text">
                HireLens
              </p>
              <ul className="mt-5 flex flex-col gap-3 text-[15px] text-mkt-fg">
                {NEW_WAY.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
