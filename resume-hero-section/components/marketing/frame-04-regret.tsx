/**
 * Frame 4 — `hirelens_marketing_the_regret_climax_frame_4`.
 *
 * The emotional peak: the Deep Ink regret-analysis section (with the breathing
 * aurora behind it and the comparison panel floating on top), the three AI
 * tenets, and the enterprise trust strip.
 *
 * Frame 4 uses a 1280px container with 16/32px side margins, and the deepest
 * ink (#0B0D0D) rather than frame 2's #121414.
 */

const TRUST_MARKS = ['SOC 2 Type II', 'SSO / SAML', 'Audit trail', 'Data residency']

export function Frame04Regret() {
  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* REGRET ANALYSIS                                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-t border-mkt-border-strong bg-mkt-ink px-4 py-32 text-mkt-canvas">
        <div className="mkt-aurora" />

        <div className="relative z-10 mx-auto max-w-[1280px]">
          <div className="mx-auto mb-24 max-w-4xl text-center">
            <h2 className="mb-8 font-mkt-display text-4xl leading-tight font-light tracking-tight text-white md:text-6xl md:leading-none lg:text-7xl">
              Every tool tells you who&rsquo;s strongest.
              <br />
              Only HireLens tells you what you&rsquo;d regret.
            </h2>
            <p className="font-mkt-display text-xl italic text-mkt-fg-tertiary">
              The question no other tool asks.
            </p>
          </div>

          {/* Product frame */}
          <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-mkt-xl border border-mkt-border bg-mkt-canvas text-mkt-fg shadow-sm">
            <div className="mkt-prism-border-top h-0 w-full" />

            <div className="flex items-center justify-between border-b border-mkt-border-subtle bg-mkt-subtle/50 px-8 py-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-mkt-fg-secondary">
                  compare_arrows
                </span>
                <h3 className="text-sm font-medium tracking-wide">
                  Regret Analysis: Sarah vs Marcus
                </h3>
              </div>
              <span className="material-symbols-outlined text-sm text-mkt-fg-tertiary">
                more_horiz
              </span>
            </div>

            <div className="flex flex-col gap-8 p-8 md:flex-row">
              {/* Strengths alignment */}
              <div className="flex-1 space-y-6">
                <div>
                  <h4 className="mb-3 font-mkt-label text-xs uppercase tracking-wider text-mkt-fg-secondary">
                    Strengths Alignment
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-[0.375rem] border border-mkt-border-subtle bg-mkt-muted/30 p-3">
                      <span className="text-sm font-medium">Sarah</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mkt-mono text-xs text-mkt-focus-sharp">
                          82 Sharp
                        </span>
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-mkt-border-subtle">
                          <div className="h-full w-[82%] bg-mkt-focus-sharp" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-[0.375rem] border border-mkt-border-subtle bg-mkt-muted/30 p-3">
                      <span className="text-sm font-medium">Marcus</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mkt-mono text-xs text-mkt-focus-high">
                          88 Focus
                        </span>
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-mkt-border-subtle">
                          <div className="h-full w-[88%] bg-mkt-focus-high" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden w-px bg-mkt-border-subtle md:block" />

              {/* Opportunity cost */}
              <div className="flex-1 space-y-6">
                <div>
                  <h4 className="mb-3 font-mkt-label text-xs uppercase tracking-wider text-mkt-fg-secondary">
                    Opportunity Cost
                  </h4>
                  <div className="mkt-prism-border-left rounded-r-[0.375rem] bg-mkt-ai-bg p-4">
                    <p className="mb-3 text-sm leading-relaxed text-mkt-fg-secondary">
                      Selecting Marcus sacrifices Sarah&rsquo;s deep domain
                      expertise in early-stage GTM motion. The cost is slower
                      time-to-market in Q3.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-mkt-fg-tertiary">
                      <span className="material-symbols-outlined text-[16px]">
                        info
                      </span>
                      <span>AI Confidence Line:</span>
                      <span className="font-mkt-mono text-mkt-focus-soft">
                        52 Soft
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* AI DIFFERENTIATION                                                */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-b border-mkt-border-subtle bg-mkt-canvas px-4 py-32">
        <div className="mx-auto max-w-[1280px]">
          <div className="mx-auto mb-20 max-w-3xl text-center">
            <h2 className="font-mkt-display text-4xl leading-tight font-light text-mkt-fg md:text-5xl md:leading-none">
              Not a chatbot bolted onto an ATS.
              <br />
              Intelligence built into the decision.
            </h2>
          </div>

          <div className="mx-auto flex max-w-4xl flex-col">
            {/* Tenet 1 — the prism mark */}
            <div className="flex flex-col items-start gap-6 border-t border-mkt-border-subtle py-8 md:flex-row md:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-mkt-lg border border-mkt-border bg-mkt-canvas shadow-sm">
                <span className="material-symbols-outlined mkt-prism-text">
                  auto_awesome
                </span>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-medium text-mkt-fg">
                  Evidence, not opinions
                </h3>
                <p className="text-mkt-fg-secondary">
                  Every claim opens to its source. No hallucinated summaries.
                </p>
              </div>
            </div>

            {/* Tenet 2 — the source chip */}
            <div className="flex flex-col items-start gap-6 border-t border-mkt-border-subtle py-8 md:flex-row md:items-center">
              <div className="mkt-prism-border-left flex items-center gap-2 rounded-[0.375rem] bg-mkt-ai-bg px-3 py-1.5 text-xs font-medium text-mkt-fg-secondary">
                Source
                <span className="material-symbols-outlined text-[14px]">
                  arrow_outward
                </span>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-medium text-mkt-fg">
                  It admits doubt
                </h3>
                <p className="text-mkt-fg-secondary">
                  Low confidence is shown, calmly, never hidden behind false
                  certainty.
                </p>
              </div>
            </div>

            {/* Tenet 3 — the bare hairline */}
            <div className="flex flex-col items-start gap-6 border-t border-mkt-border-subtle py-8 md:flex-row md:items-center">
              <div className="mkt-prism-hairline h-px w-12" />
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-medium text-mkt-fg">
                  You decide, always
                </h3>
                <p className="text-mkt-fg-secondary">
                  HireLens recommends; you approve; everything&rsquo;s
                  reversible and logged.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* ENTERPRISE TRUST                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section id="security" className="bg-mkt-canvas px-4 py-24">
        <div className="mx-auto max-w-[1280px] text-center">
          <h2 className="mb-12 font-mkt-display text-2xl text-mkt-fg-secondary md:text-3xl">
            Built for teams that can&rsquo;t afford to be wrong — or to leak.
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 font-mkt-label text-sm uppercase tracking-widest text-mkt-fg-tertiary">
            {TRUST_MARKS.map((mark, i) => (
              <span key={mark} className="contents">
                {i > 0 && (
                  <span className="h-1 w-1 rounded-full bg-mkt-border-strong" />
                )}
                <span>{mark}</span>
              </span>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 font-mkt-mono text-xs text-mkt-fg-tertiary">
            <span className="h-px w-4 bg-mkt-border-strong" />
            Your data trains only your own calibration.
            <span className="h-px w-4 bg-mkt-border-strong" />
          </div>
        </div>
      </section>
    </>
  )
}
