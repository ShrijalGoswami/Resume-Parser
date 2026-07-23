import * as React from 'react'

/* --- Illustrative product mocks (representative UI, not real data) ---------- */

function MockShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-mkt-border-subtle bg-mkt-paper-raised p-5">{children}</div>
  )
}

function MockLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-fg-subtle">{children}</p>
  )
}

function InboxMock() {
  return (
    <MockShell>
      <MockLabel>Decision Inbox</MockLabel>
      <p className="mt-3 font-[family-name:var(--font-fraunces)] text-lg text-mkt-fg">
        Three decisions need you this morning.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <div className="h-9 rounded-lg border border-mkt-border-subtle bg-mkt-paper" />
        <div className="h-9 rounded-lg border border-mkt-border-subtle bg-mkt-paper opacity-60" />
      </div>
    </MockShell>
  )
}

function TriageMock() {
  return (
    <MockShell>
      <div className="flex items-center justify-between">
        <MockLabel>Pipeline inbound</MockLabel>
        <span className="font-hl-mono text-xs tabular-nums text-mkt-fg-muted">250 total</span>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-mkt-border">
        <span className="block h-full w-[12%] rounded-full" style={{ background: '#2E9E86' }} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-hl-mono text-[11px] uppercase tracking-wide text-mkt-fg-subtle">
          Viable candidates
        </span>
        <span className="font-hl-mono text-xs tabular-nums text-mkt-fg">30</span>
      </div>
    </MockShell>
  )
}

function DeepReviewMock() {
  const rows: [string, number, string, string][] = [
    ['System Architecture', 88, 'Validated', '#2E9E86'],
    ['Team Leadership', 74, 'Partial', '#B78514'],
  ]
  return (
    <MockShell>
      <MockLabel>Competency verification</MockLabel>
      <div className="mt-4 flex flex-col gap-3">
        {rows.map(([label, score, state, color]) => (
          <div key={label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-mkt-fg">{label}</span>
              <span className="font-hl-mono text-[11px]" style={{ color }}>
                {score} · {state}
              </span>
            </div>
            <span className="h-1 w-full overflow-hidden rounded-full bg-mkt-border">
              <span className="block h-full rounded-full" style={{ width: `${score}%`, background: color }} />
            </span>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

function DecisionMock() {
  return (
    <MockShell>
      <MockLabel>Recommendation memo</MockLabel>
      <p className="mt-3 text-[14px] font-medium text-mkt-fg">Recommend continuing.</p>
      <p className="mt-1 text-[13px] leading-relaxed text-mkt-fg-muted">
        Strong technical case; one open question on leadership.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-hl-mono text-[10px] uppercase tracking-wide" style={{ background: 'rgba(46,158,134,0.1)', color: '#2E9E86' }}>
        High confidence
      </span>
    </MockShell>
  )
}

function LedgerMock() {
  const rows = [
    ['Oct 24', 'Offer', 'Approved'],
    ['Oct 23', 'Advance', 'Approved'],
    ['Oct 21', 'Reject', 'Recorded'],
  ]
  return (
    <MockShell>
      <MockLabel>Decision ledger</MockLabel>
      <div className="mt-3 flex flex-col divide-y divide-mkt-border-subtle font-hl-mono text-[11px]">
        {rows.map(([date, decision, state]) => (
          <div key={date} className="flex items-center justify-between py-2">
            <span className="tabular-nums text-mkt-fg-subtle">{date}</span>
            <span className="text-mkt-fg">{decision}</span>
            <span className="text-mkt-fg-muted">{state}</span>
          </div>
        ))}
      </div>
    </MockShell>
  )
}

/* --- The real product journey (mirrors the authenticated experience) -------- */

interface Stage {
  /** The exact product feature name — the same mental model as after sign-in. */
  feature: string
  title: string
  /** What is happening + why it matters. */
  body: string
  /** The decision that becomes easier. */
  easier: string
  mock: React.ReactNode
}

const STAGES: Stage[] = [
  {
    feature: 'Inbox',
    title: 'The day arrives already sorted.',
    body: 'You open a briefing, not a queue — what changed overnight and the few decisions that genuinely need you. The noise is already handled, so your attention starts where it matters.',
    easier: 'Knowing what to work on first.',
    mock: <InboxMock />,
  },
  {
    feature: 'Triage',
    title: 'Clear hundreds. Miss no one.',
    body: 'The pile compresses into clear accepts, clear rejects, and the contested middle. Obvious calls are confirmed in bulk; the ambiguous few are set aside for you — nothing strong slips through.',
    easier: 'Trusting a bulk decision without fear of missing an outlier.',
    mock: <TriageMock />,
  },
  {
    feature: 'Deep Review',
    title: 'Confidence you can defend.',
    body: 'The Dossier reads a candidate as evidence, not a score. Every claim opens to its source — strengths, open questions, and what needs a closer look — so your read is grounded, not impressionistic.',
    easier: 'Defending a call to a hiring committee.',
    mock: <DeepReviewMock />,
  },
  {
    feature: 'Decision Intelligence',
    title: 'Choose, and know why.',
    body: 'A concise memo states the recommendation, the evidence behind it, and its confidence — neutrally when it is unsure. You approve or override; the AI never decides for you.',
    easier: 'Committing to a recommendation you actually trust.',
    mock: <DecisionMock />,
  },
  {
    feature: 'Decision Ledger',
    title: 'A permanent record.',
    body: 'Every decision is written down as it stood — the recommendation, the evidence, the confidence, the call. An immutable audit journal you can return to, exactly as it was.',
    easier: 'Answering “why did we hire them?” months later.',
    mock: <LedgerMock />,
  },
]

function StageBlock({ stage, index }: { stage: Stage; index: number }) {
  const reverse = index % 2 === 1
  return (
    <div className="grid items-center gap-8 py-14 lg:grid-cols-2 lg:gap-16">
      <div className={reverse ? 'lg:order-2' : ''}>
        <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-iris-text">
          {String(index + 1).padStart(2, '0')} · {stage.feature}
        </p>
        <h3 className="hl-display-md mt-3 text-mkt-fg">{stage.title}</h3>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-mkt-fg-muted">{stage.body}</p>
        <p className="mt-4 max-w-md border-l-2 border-mkt-border pl-3 text-[14px] text-mkt-fg">
          <span className="text-mkt-fg-subtle">What gets easier — </span>
          {stage.easier}
        </p>
      </div>
      <div className={reverse ? 'lg:order-1' : ''}>{stage.mock}</div>
    </div>
  )
}

/**
 * The Decision Pipeline — the transition from philosophy to product. An editorial
 * journey (not a workflow diagram) showing how judgment becomes progressively
 * more informed, using the real product feature names. "Improve" is honestly
 * marked as a future capability (Learning is deferred).
 */
export function Pipeline() {
  return (
    <section id="methodology" className="scroll-mt-16 bg-mkt-paper">
      <div className="mx-auto max-w-5xl px-6 py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-hl-mono text-[10px] uppercase tracking-widest text-mkt-fg-subtle">
            The pipeline
          </p>
          <h2 className="hl-display-lg mt-6 text-mkt-fg">
            One instrument, from the whole pile to the right decision.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-mkt-fg-muted">
            The same five steps you’ll use after signing in — judgment made progressively more
            informed at each one.
          </p>
        </div>

        <div className="mt-12 divide-y divide-mkt-border-subtle">
          {STAGES.map((stage, index) => (
            <StageBlock key={stage.feature} stage={stage} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
