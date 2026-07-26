/**
 * Frame 3 — `hirelens_marketing_the_decision_pipeline_frame_3`.
 *
 * The pipeline rail (seven stages with a dashed return path closing the loop)
 * followed by three alternating stage scenes, each pairing an editorial column
 * with a simulated product frame.
 *
 * Frame 3 uses a 1440px container with 24/48px side margins and stock Tailwind
 * type sizes rather than a bespoke scale.
 */

/** Rail stages. The three AI-owned stages carry the prism tick; the rest are
 *  plain hairlines, and their tick opacity ramps as the pipeline narrows. */
const PIPELINE_STAGES = [
  { label: 'Arrive', prism: false, opacity: '' },
  { label: 'Triage', prism: true, opacity: 'opacity-50' },
  { label: 'Deep Review', prism: true, opacity: 'opacity-70' },
  { label: 'Decide', prism: true, opacity: 'opacity-90' },
  { label: 'Approve', prism: false, opacity: '' },
  { label: 'Ledger', prism: false, opacity: '' },
  { label: 'Outcome', prism: false, opacity: '' },
]

export function Frame03Pipeline() {
  return (
    <div className="w-full bg-mkt-canvas">
      {/* ---------------------------------------------------------------- */}
      {/* THE DECISION PIPELINE                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto flex w-full max-w-[1440px] flex-col items-center px-6 py-32 md:px-12 md:py-48">
        <div className="mb-24 flex w-full justify-center">
          <div className="relative flex h-32 w-full max-w-5xl items-center justify-between">
            {/* The loop path: a solid forward rail and a dashed return */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              viewBox="0 0 1000 128"
              aria-hidden="true"
            >
              <path d="M 50 64 L 950 64" fill="none" stroke="#DCE1E0" strokeWidth="1" />
              <path
                d="M 950 64 C 950 120, 50 120, 50 64"
                fill="none"
                stroke="#E9EDEC"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            </svg>

            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.label}
                className="relative z-10 flex flex-col items-center"
              >
                <div
                  className={
                    stage.prism
                      ? `mb-2 h-4 w-[2px] bg-gradient-to-b from-[#6E5CF0] to-[#2FB8C6] ${stage.opacity}`
                      : 'mb-2 h-4 w-px bg-mkt-border-strong'
                  }
                />
                <span className="font-mkt-mono text-[10px] uppercase tracking-widest text-mkt-fg-secondary">
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <h2 className="max-w-4xl text-center font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none lg:text-6xl">
          One instrument, from the whole pile to the right decision — and back,
          learning each time.
        </h2>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 01 — TRIAGE                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-24 px-6 py-32 md:px-12 lg:grid-cols-2">
        <div className="order-2 flex max-w-xl flex-col gap-6 lg:order-1">
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-mkt-fg-tertiary">
              filter_list
            </span>
            <span className="font-mkt-mono text-[10px] uppercase tracking-widest text-mkt-fg-tertiary">
              Stage 01 — Triage
            </span>
          </div>
          <h3 className="font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
            Clear hundreds.
            <br />
            Miss no one.
          </h3>
          <p className="max-w-md font-mkt-body text-lg leading-relaxed text-mkt-fg-secondary">
            AI-driven compression surfaces signal from noise instantly.
            Calibrated to your baseline, it identifies the viable subset without
            subjective bias.
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-mkt-xl border border-mkt-border-subtle bg-mkt-subtle p-8 md:aspect-[4/3]">
            <div className="w-full max-w-sm rounded-mkt-lg border border-mkt-border bg-mkt-canvas p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="mb-4 flex items-center justify-between border-b border-mkt-border-subtle pb-4">
                <span className="font-mkt-mono text-xs text-mkt-fg-secondary">
                  Pipeline Inbound
                </span>
                <span className="font-mkt-mono text-xs text-mkt-fg">
                  250 total
                </span>
              </div>
              <div className="space-y-3">
                <div className="h-1 overflow-hidden rounded-full bg-mkt-border-subtle">
                  <div className="h-full w-[12%] bg-mkt-focus-high" />
                </div>
                <div className="flex justify-between font-mkt-mono text-[10px]">
                  <span className="text-mkt-fg-secondary">Viable candidates</span>
                  <span className="text-mkt-focus-high">30 (12%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 02 — DEEP REVIEW                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="w-full bg-mkt-subtle">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-24 px-6 py-32 md:px-12 lg:grid-cols-2">
          <div className="order-1">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-canvas p-8 md:aspect-[4/3]">
              <div className="mkt-prism-edge-left w-full max-w-md rounded-r-mkt-lg border border-l-0 border-mkt-border-subtle bg-mkt-ai-bg p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#4C8FE0]">
                      temp_preferences_custom
                    </span>
                    <span className="font-mkt-label text-sm font-medium text-mkt-fg">
                      Competency Verification
                    </span>
                  </div>
                  <span className="font-mkt-mono text-xs text-mkt-fg-secondary">
                    Resolved 4 of 6
                  </span>
                </div>

                <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-mkt-border-subtle">
                  <div className="mkt-prism-hairline h-full w-[66%]" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-mkt-border-subtle pb-2">
                    <span className="font-mkt-body text-sm text-mkt-fg-secondary">
                      System Architecture
                    </span>
                    <span className="rounded-[0.25rem] bg-mkt-focus-high/10 px-2 py-1 font-mkt-mono text-xs text-mkt-focus-high">
                      88 Validated
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-mkt-border-subtle pb-2">
                    <span className="font-mkt-body text-sm text-mkt-fg-secondary">
                      Team Leadership
                    </span>
                    <span className="rounded-[0.25rem] bg-mkt-focus-sharp/10 px-2 py-1 font-mkt-mono text-xs text-mkt-focus-sharp">
                      74 Partial
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-2 flex max-w-xl flex-col gap-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-mkt-fg-tertiary">
                search_insights
              </span>
              <span className="font-mkt-mono text-[10px] uppercase tracking-widest text-mkt-fg-tertiary">
                Stage 02 — Deep Review
              </span>
            </div>
            <h3 className="font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
              Confidence you
              <br />
              can defend.
            </h3>
            <p className="max-w-md font-mkt-body text-lg leading-relaxed text-mkt-fg-secondary">
              Every assertion backed by extracted evidence. The system maps raw
              unstructured data against your specific requirements, quantifying
              fit objectively.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* STAGE 03 — DECIDE                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-24 px-6 py-32 md:px-12 lg:grid-cols-2">
        <div className="order-2 flex max-w-xl flex-col gap-6 lg:order-1">
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-mkt-fg-tertiary">
              gavel
            </span>
            <span className="font-mkt-mono text-[10px] uppercase tracking-widest text-mkt-fg-tertiary">
              Stage 03 — Decide
            </span>
          </div>
          <h3 className="font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
            Choose, and
            <br />
            know why.
          </h3>
          <p className="max-w-md font-mkt-body text-lg leading-relaxed text-mkt-fg-secondary">
            Synthesized, defensible recommendations delivered in a high-fidelity
            memo. It highlights strengths, isolates risks, and tells you what
            you&rsquo;d regret.
          </p>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-mkt-xl border border-mkt-border-subtle bg-mkt-subtle p-8 md:aspect-[4/3]">
            <div className="w-full max-w-lg overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-canvas shadow-[0_8px_32px_rgba(0,0,0,0.03)]">
              <div className="mkt-prism-edge-bottom bg-mkt-canvas p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h4 className="mb-1 font-mkt-display text-xl text-mkt-fg">
                      Recommendation Memo
                    </h4>
                    <p className="font-mkt-mono text-xs text-mkt-fg-secondary">
                      Generated for Role ID: 884-A
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-xl text-mkt-accent">
                    auto_awesome
                  </span>
                </div>
                <div className="rounded-mkt-lg bg-mkt-muted p-4">
                  <span className="mb-2 block font-mkt-mono text-[10px] uppercase text-mkt-fg-tertiary">
                    Primary Risk Factor
                  </span>
                  <p className="font-mkt-body text-sm text-mkt-fg">
                    Candidate demonstrates lower tenure averages in senior roles
                    compared to baseline, presenting a potential retention risk
                    post-18 months.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
