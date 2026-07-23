import { Sparkles, CircleHelp, UserRoundCheck } from 'lucide-react'

/** Illustrative regret-analysis mock (sample candidates, not real data). */
function RegretCard() {
  const strengths: [string, number, string, string][] = [
    ['Sarah', 82, 'Sharp', '#2E9E86'],
    ['Marcus', 88, 'Focus', '#0C7C86'],
  ]
  return (
    <div className="overflow-hidden rounded-xl border border-mkt-border bg-mkt-paper text-left shadow-[0_24px_60px_-30px_rgba(0,0,0,0.5)]">
      <div className="border-b border-mkt-border-subtle bg-mkt-paper-raised px-5 py-3">
        <span className="font-hl-mono text-[11px] uppercase tracking-wide text-mkt-fg-muted">
          Regret Analysis · Sarah vs Marcus
        </span>
      </div>
      <div className="grid md:grid-cols-2 md:divide-x md:divide-mkt-border-subtle">
        <div className="p-5">
          <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-fg-subtle">
            Strengths alignment
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {strengths.map(([name, score, band, color]) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-mkt-fg">{name}</span>
                  <span className="font-hl-mono text-[11px]" style={{ color }}>
                    {score} · {band}
                  </span>
                </div>
                <span className="h-1 w-full overflow-hidden rounded-full bg-mkt-border">
                  <span className="block h-full rounded-full" style={{ width: `${score}%`, background: color }} />
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-mkt-border-subtle p-5 md:border-t-0">
          <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-fg-subtle">
            Opportunity cost
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-mkt-fg-muted">
            Choosing Marcus trades away Sarah’s deep domain expertise in early-stage GTM — a likely
            cost in Q3 time-to-market.
          </p>
          <p className="mt-3 font-hl-mono text-[11px] text-mkt-fg-subtle">
            AI confidence line: <span style={{ color: '#C6702E' }}>52 · Soft</span>
          </p>
        </div>
      </div>
    </div>
  )
}

const PRINCIPLES = [
  {
    icon: Sparkles,
    title: 'Evidence, not opinions',
    body: 'Every claim opens to its source. No hallucinated summaries.',
  },
  {
    icon: CircleHelp,
    title: 'It admits doubt',
    body: 'Low confidence is shown, calmly — never hidden behind false certainty.',
  },
  {
    icon: UserRoundCheck,
    title: 'You decide, always',
    body: 'HireLens recommends; you approve; every decision is reversible and logged.',
  },
]

const SECURITY = ['Row-level data isolation', 'Immutable decision trail', 'Your data stays your own']

/**
 * Regret Climax & product philosophy — the differentiator ("what you'd regret"),
 * then how HireLens behaves (evidence / doubt / human control). The trust line
 * states only the real security posture — no uncertified compliance claims.
 */
export function Regret() {
  return (
    <section id="insights" className="scroll-mt-16">
      {/* The differentiator — dark */}
      <div className="bg-mkt-ink text-mkt-ink-fg">
        <div className="mx-auto max-w-6xl px-6 py-28 text-center">
          <h2 className="hl-display-lg mx-auto max-w-4xl">
            Every tool tells you who’s strongest. Only HireLens tells you what you’d regret.
          </h2>
          <p className="mt-6 font-[family-name:var(--font-fraunces)] text-lg italic text-mkt-ink-muted">
            The question no other tool asks.
          </p>
          <div className="mx-auto mt-14 max-w-2xl">
            <RegretCard />
          </div>
        </div>
      </div>

      {/* How it behaves — light */}
      <div className="bg-mkt-paper">
        <div className="mx-auto max-w-3xl px-6 py-28">
          <h2 className="hl-display-md text-center text-mkt-fg">
            Not a chatbot bolted onto an ATS. Intelligence built into the decision.
          </h2>
          <div className="mt-14 flex flex-col divide-y divide-mkt-border-subtle">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-4 py-5">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-mkt-border-subtle text-mkt-iris-text">
                  <Icon className="size-4" strokeWidth={1.8} aria-hidden />
                </span>
                <div>
                  <p className="text-[15px] font-medium text-mkt-fg">{title}</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-mkt-fg-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust — truthful posture only */}
      <div className="bg-mkt-paper-raised">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h3 className="hl-display-md text-mkt-fg">
            Built for teams that can’t afford to be wrong — or to leak.
          </h3>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-hl-mono text-[11px] uppercase tracking-widest text-mkt-fg-subtle">
            {SECURITY.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
