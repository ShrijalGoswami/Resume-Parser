import { ArrowRight } from 'lucide-react'
import { AnchorLink } from '../anchor-link'

const PRISM = 'linear-gradient(180deg, #6E5CF0, #4C8FE0, #2FB8C6)'

/** Illustrative product mock — a day of applicants resolving to a few key decisions. */
function DayResolveWindow() {
  const decisions = [
    { name: 'S. Rahman', tag: 'Leadership risk', note: 'Technically sound, but historical team attrition is high.', muted: false },
    { name: 'M. Davis', tag: 'Undiscovered', note: 'Non-traditional background, but matches core requirements precisely.', muted: false },
    { name: 'A. Patel', tag: 'Standard', note: '', muted: true },
  ]
  return (
    <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border border-mkt-border shadow-[0_24px_60px_-24px_rgba(11,13,13,0.25)] md:grid-cols-2">
      {/* The pile */}
      <div className="bg-mkt-ink p-6">
        <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-ink-muted">250 applicants</p>
        <div className="mt-5 flex flex-col gap-2.5" aria-hidden>
          {[92, 74, 84, 66, 88, 70, 80, 62, 78].map((w, i) => (
            <span key={i} className="h-2 rounded-full bg-white/8" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      {/* The few who matter */}
      <div className="relative bg-mkt-paper p-6">
        <p className="text-right font-hl-mono text-[10px] uppercase tracking-widest text-mkt-fg-subtle">4 key decisions</p>
        <span className="absolute -left-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-mkt-iris/40 bg-mkt-paper px-2.5 py-1 font-hl-mono text-[10px] uppercase tracking-widest text-mkt-iris-text md:inline-flex">
          Compress
        </span>
        <div className="mt-4 flex flex-col gap-3">
          {decisions.map((d) => (
            <div
              key={d.name}
              className="rounded-lg border border-mkt-border-subtle p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-hl-mono text-sm text-mkt-fg">{d.name}</span>
                <span
                  className={
                    d.muted
                      ? 'font-hl-mono text-[10px] uppercase tracking-wide text-mkt-fg-subtle'
                      : 'rounded bg-mkt-paper-raised px-1.5 py-0.5 font-hl-mono text-[10px] uppercase tracking-wide text-mkt-fg-muted'
                  }
                >
                  {d.tag}
                </span>
              </div>
              {d.note ? <p className="mt-1.5 text-[13px] text-mkt-fg-muted">{d.note}</p> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <>
      <section className="relative overflow-hidden bg-mkt-ink text-mkt-ink-fg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(48% 40% at 78% 22%, #5B5BD6, transparent 70%)', opacity: 0.1 }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-40">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <h1 className="hl-display-hero">Your judgment, on every candidate.</h1>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-mkt-ink-muted">
                HireLens reads the whole pile, brings the few who matter into focus, and tells you
                what you’d regret — so your best judgment reaches everyone, not just the top of the
                stack.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <AnchorLink
                  to="methodology"
                  className="inline-flex items-center gap-2 rounded-md bg-mkt-iris px-5 py-3 font-hl-mono text-[11px] uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                >
                  See it think <ArrowRight className="size-4" aria-hidden />
                </AnchorLink>
                <AnchorLink
                  to="pricing"
                  className="rounded-md border border-mkt-ink-border px-5 py-3 font-hl-mono text-[11px] uppercase tracking-widest text-mkt-ink-fg/80 transition-colors hover:text-mkt-ink-fg"
                >
                  Book a demo
                </AnchorLink>
              </div>
              <p className="mt-12 font-hl-mono text-[11px] uppercase tracking-widest text-mkt-ink-muted">
                Built for teams hiring at scale
              </p>
            </div>

            <div className="relative lg:pl-8">
              <div className="relative overflow-hidden rounded-xl border border-mkt-ink-border bg-mkt-ink-raised p-5">
                <span aria-hidden className="absolute inset-y-0 left-0 w-0.5" style={{ background: PRISM }} />
                <div className="flex items-center justify-between gap-2">
                  <span className="font-hl-mono text-sm text-mkt-ink-fg">J. Chen</span>
                  <span className="rounded bg-mkt-iris/20 px-2 py-0.5 font-hl-mono text-[11px] tracking-wide text-[#c1c1ff]">
                    98% match
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-mkt-ink-muted">
                  Exceptional systems-architecture background. Flag: short tenure at previous role.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-20 flex flex-col items-center gap-2" aria-hidden>
            <span className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-ink-muted">Scroll</span>
            <span className="h-10 w-px bg-mkt-ink-border" />
          </div>
        </div>
      </section>

      <section className="bg-mkt-paper">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="hl-display-lg mx-auto max-w-3xl text-center text-mkt-fg">
            Watch a day of hiring resolve to the decisions that matter.
          </h2>
          <div className="mt-14">
            <DayResolveWindow />
          </div>
        </div>
      </section>
    </>
  )
}
