'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The hero's product surface: HireLens triaging a role, above the fold.
 *
 * THIS IS NOT A MARKETING ILLUSTRATION OF THE PRODUCT. Every label, threshold,
 * shortcut and rule below is lifted from the shipping application, so that the
 * hero and the app cannot drift apart:
 *
 *   Focus scale        components/hirelens/lib/focus-scale.ts
 *     In focus >= 85 · Sharp >= 70 · Legible >= 55 · Soft >= 40 · Out of focus
 *   Pile thresholds    workspace/triage/triage-grouping.ts
 *     ACCEPT_MIN_SCORE 70 · REJECT_MAX_SCORE 55
 *   "AI unsure"        triage-grouping.isContradiction — a positive
 *                      recommendation under 70, or a reject at/above 55
 *   Queue header       "Needs you · N remaining"
 *   Actions            Advance A · Reject R · Shortlist S · Deeper D
 *   Verdict order      domain/ai-answer — Answer, Sources, Confidence,
 *                      Reasoning (collapsed), Actions
 *
 * WHY THE FOCUS SCALE IS THE BRAND. Every other hiring tool reports a
 * percentage: "98% match". HireLens grades legibility instead — In focus,
 * Sharp, Legible, Soft, Out of focus — because the product's claim is about how
 * clearly it can see a candidate, not how much it likes them. It is the one
 * piece of this interface that could not belong to any other product, which
 * makes it the thing to put in the hero. Crop the logo and the word "Legible"
 * next to a person's name still says HireLens.
 *
 * ON THE NUMBERS. The active candidate carries the real scores this backend
 * returned for that résumé (fit 68, ATS 71). The rest of the queue is
 * illustrative, but bounded by what the product has actually been observed to
 * produce: nothing reaches the "In focus" band, because across twelve real
 * candidates it never did. A hero full of 95%-green rows would be a nicer
 * picture and a lie — and the compressed, mostly-Legible spread shown here is
 * the more persuasive claim anyway, because it is what a tool that does not
 * flatter looks like.
 */

/* ------------------------------------------------------------------ */
/* Focus scale                                                         */
/* ------------------------------------------------------------------ */

/**
 * Dark-theme focus-scale colours, inlined rather than read from `--hl-score-*`.
 * Those custom properties are defined on `:root` and `.dark`; the marketing
 * layout is neither, so referencing the variables here would resolve to the
 * LIGHT palette (#955F00 amber, #C63434 red) on a near-black hero. These are
 * the dark values from globals.css, which are also the set with enforced
 * greyscale separation, so the bands stay distinguishable without colour.
 */
const BANDS = [
  { min: 85, label: 'In focus', color: '#8FA678' },
  { min: 70, label: 'Sharp', color: '#7F8C7A' },
  { min: 55, label: 'Legible', color: '#A87A32' },
  { min: 40, label: 'Soft', color: '#8A6A55' },
  { min: -Infinity, label: 'Out of focus', color: '#6B5450' },
] as const

function focusBand(score: number) {
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]
}

/** triage-grouping.ts */
const ACCEPT_MIN_SCORE = 70
const REJECT_MAX_SCORE = 55

/* ------------------------------------------------------------------ */
/* The role                                                            */
/* ------------------------------------------------------------------ */

type Candidate = {
  id: string
  name: string
  fit: number
  /** The AI's recommendation. Disagreement with `fit` is what raises "AI unsure". */
  hire: 'Hire' | 'Maybe' | 'Reject'
  note: string
  verdict: string
  matchCategory: string
  confidence: 'High' | 'Medium' | 'Low'
  risk: string
  /**
   * The move the recruiter makes. It must AGREE with the verdict above it —
   * an earlier version fired Advance on every candidate, so the surface showed
   * "Hold — missing the domain" and then advanced her anyway. A demo that
   * contradicts its own reasoning teaches the visitor that the reasoning is
   * decoration.
   */
  decision: 'Advance' | 'Reject' | 'Shortlist' | 'Deeper'
  /**
   * Verbatim résumé lines, each paired with the run the risk was read from.
   *
   * `mark` is the SUBSTRING, not a character range. The first version used
   * [start, end] offsets counted by hand, and two of the four had already
   * drifted — one highlighted "ks (2018–20" mid-word. Offsets cannot survive a
   * copy edit; a substring either matches or visibly does not.
   */
  evidence: { line: string; mark: string }[]
  reasoning: string
}

const QUEUE: Candidate[] = [
  {
    id: 'priya',
    name: 'Priya Raghunathan',
    fit: 68,
    hire: 'Hire',
    note: 'Strong payments depth, short tenure at senior level.',
    verdict: 'Recommend interview — probe scope and tenure.',
    matchCategory: 'Moderate match',
    confidence: 'Medium',
    risk: 'Tenure averages 2.1 years across senior roles, against a 2.8-year baseline for this role.',
    decision: 'Advance',
    evidence: [
      { line: 'Senior Backend Engineer, Razorpay (2021–2025)', mark: '(2021–2025)' },
      { line: 'Backend Engineer, Freshworks (2018–2021)', mark: '(2018–2021)' },
    ],
    reasoning:
      'Two senior-level tenures of 4.0 and 3.0 years read as stable in isolation, but three of the five roles on this résumé ended inside 24 months. The pattern, not any single move, is what lowers confidence.',
  },
  {
    id: 'okonkwo',
    name: 'A. Okonkwo',
    fit: 64,
    hire: 'Hire',
    note: 'Owned ingestion at comparable scale for three years.',
    matchCategory: 'Moderate match',
    verdict: 'Recommend interview — verify ownership boundary.',
    confidence: 'Medium',
    risk: 'Scope is described at team level; individual ownership is not evidenced.',
    decision: 'Shortlist',
    evidence: [
      { line: 'Data Engineer, Paystack — owned ingestion path (2022–2025)', mark: 'owned ingestion path' },
      { line: 'Reduced pipeline cost 41% across the reporting stack', mark: 'Reduced pipeline cost 41%' },
    ],
    reasoning:
      'The recommendation is positive but the fit score sits under the accept threshold of 70, so this one does not auto-sort. That disagreement is the whole reason it is in front of you.',
  },
  {
    id: 'kaur',
    name: 'R. Kaur',
    fit: 61,
    hire: 'Maybe',
    note: 'Distributed systems background, no payments exposure.',
    matchCategory: 'Moderate match',
    verdict: 'Hold — missing the domain, strong on the fundamentals.',
    confidence: 'Low',
    risk: 'No payments or billing systems appear anywhere in nine years of history.',
    decision: 'Deeper',
    evidence: [
      { line: 'Staff Backend Engineer, Zeta — distributed systems (2019–2025)', mark: 'distributed systems' },
      { line: 'Led migration of 40+ services to a shared consensus layer', mark: 'Led migration of 40+ services' },
    ],
    reasoning:
      'Every technical requirement is met except the domain. Whether that matters is a judgment about your team, not about the résumé, which is why the recommendation stops at Hold.',
  },
  {
    id: 'davis',
    name: 'M. Davis',
    // 51, not 57. The "Needs you" queue is the 55-70 middle by construction —
    // everything at or above 70 auto-accepts and everything under 55
    // auto-rejects — so a queue of four came out reading "Legible" four times
    // and the Focus scale never read as a SCALE. A 'Maybe' at 51 still lands
    // in the queue (only an explicit Reject auto-sorts below 55), and it puts
    // a second band on screen.
    fit: 51,
    hire: 'Maybe',
    note: 'Non-traditional background, matches the core skills.',
    matchCategory: 'Moderate match',
    verdict: 'Hold — non-linear path, core skills present.',
    confidence: 'Low',
    risk: 'Two unexplained gaps of 11 and 14 months since 2019.',
    decision: 'Deeper',
    evidence: [
      { line: 'Platform Engineer, contract — Mar 2023 to present', mark: 'Mar 2023 to present' },
      { line: 'Self-directed study, systems programming (2021–2022)', mark: 'Self-directed study' },
    ],
    reasoning:
      'Gaps are reported, never scored. A career break is not evidence of anything on its own, so it is surfaced for you to ask about rather than folded into the number.',
  },
]

/** Already sorted by the guard — these need no human. */
const ACCEPT_PILE = 3
const REJECT_PILE = 5
const NEAR_THE_LINE = 2

/** Past tense for the row, once the move is made. */
const DECIDED_LABEL = {
  Advance: 'ADVANCED',
  Reject: 'REJECTED',
  Shortlist: 'SHORTLISTED',
  Deeper: 'SENT DEEPER',
} as const

/** Each move gets its own colour, so four decisions do not all read as one. */
const DECISION_COLOR = {
  Advance: '#8FA678',
  Reject: '#A33A3A',
  Shortlist: '#C48B71',
  Deeper: '#7FB0B8',
} as const

/* ------------------------------------------------------------------ */
/* The loop                                                            */
/* ------------------------------------------------------------------ */

/**
 * One pass of real work: read the candidate, mark the evidence, open the
 * reasoning, decide, move on. The durations are reading speeds, not animation
 * timings — the evidence beat has to last long enough that a visitor can
 * actually read the highlighted line, which is the only reason it exists.
 */
const PHASES = [
  { name: 'read', ms: 900 },
  { name: 'evidence', ms: 2100 },
  { name: 'reasoning', ms: 2600 },
  { name: 'decide', ms: 1500 },
] as const

type PhaseName = (typeof PHASES)[number]['name']

function useTriageLoop(enabled: boolean) {
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const id = window.setTimeout(() => {
      setStep((s) => {
        const next = s + 1
        if (next >= PHASES.length) {
          setIndex((i) => (i + 1) % QUEUE.length)
          return 0
        }
        return next
      })
    }, PHASES[step].ms)
    return () => window.clearTimeout(id)
  }, [enabled, step, index])

  return { index, phase: PHASES[step].name as PhaseName }
}

/* ------------------------------------------------------------------ */
/* Parts                                                               */
/* ------------------------------------------------------------------ */

/** A number, a bar, and a word. Never colour alone — the product's rule. */
function ScoreReadout({ score, wide }: { score: number; wide?: boolean }) {
  const band = focusBand(score)
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span
        className={`font-mkt-mono tabular-nums text-mkt-dark-fg ${
          wide ? 'text-[15px] leading-5' : 'text-[13px] leading-4'
        }`}
      >
        {score}
      </span>
      <span
        className={`hidden overflow-hidden rounded-full bg-white/[0.09] sm:block ${
          wide ? 'h-1.5 w-24' : 'h-1 w-14'
        }`}
      >
        <span
          className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ width: `${score}%`, backgroundColor: band.color }}
        />
      </span>
      <span
        className="font-mkt-mono text-[10.5px] leading-4 tracking-[0.04em]"
        style={{ color: band.color }}
      >
        {band.label}
      </span>
    </span>
  )
}

/** Résumé line with the read span marked. The wipe is the act of reading. */
function EvidenceLine({
  line,
  mark,
  shown,
  delay,
}: {
  line: string
  mark: string
  shown: boolean
  delay: number
}) {
  // A substring that does not occur is a content bug, not a render bug: fall
  // back to marking nothing rather than to marking the wrong words.
  const start = line.indexOf(mark)
  const end = start < 0 ? 0 : start + mark.length
  const from = start < 0 ? 0 : start

  return (
    <li className="text-[12px] leading-[19px] text-mkt-dark-fg-variant">
      {line.slice(0, from)}
      <span
        className="rounded-[2px] bg-no-repeat px-0.5 text-mkt-dark-fg transition-[background-size] duration-[600ms] ease-[cubic-bezier(0.2,0,0,1)]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(196,139,113,0.34), rgba(196,139,113,0.34))',
          backgroundSize: shown ? '100% 100%' : '0% 100%',
          transitionDelay: `${delay}ms`,
        }}
      >
        {line.slice(from, end)}
      </span>
      {line.slice(end)}
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Surface                                                             */
/* ------------------------------------------------------------------ */

export function HeroWorkspace() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [running, setRunning] = useState(false)

  // The loop runs only while the surface is on screen, in a visible document,
  // and motion is welcome. Under reduced motion it never starts, which leaves
  // the first candidate rendered at its 'reasoning' state — evidence marked,
  // panel open — so the still frame shows the most of the product, not the
  // least.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let onScreen = false
    const sync = () =>
      setRunning(
        onScreen && !motion.matches && document.visibilityState === 'visible',
      )

    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            ([e]) => {
              onScreen = e.isIntersecting
              sync()
            },
            { threshold: 0.2 },
          )
        : null
    observer?.observe(el)
    if (!observer) {
      onScreen = true
      sync()
    }

    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', sync)
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', sync)
    }
  }, [])

  const { index, phase } = useTriageLoop(running)
  const active = QUEUE[index]

  const evidenceShown = phase !== 'read'
  const reasoningOpen = phase === 'reasoning' || phase === 'decide'
  const decided = phase === 'decide'

  // A positive recommendation under the accept threshold, or a reject at or
  // above the reject threshold. The guard that keeps it out of a pile.
  const unsure =
    (active.hire === 'Hire' && active.fit < ACCEPT_MIN_SCORE) ||
    (active.hire === 'Reject' && active.fit >= REJECT_MAX_SCORE) ||
    active.hire === 'Maybe'

  return (
    <div ref={hostRef} className="mkt-fade-in-up mkt-delay-200">
      <figure className="m-0 overflow-hidden rounded-[10px] border border-white/[0.1] bg-[#15181C] shadow-[0_28px_70px_-28px_rgba(0,0,0,0.85)]">
        {/* Role bar. The product always names the role a decision belongs to —
            a score with no role attached is not a judgment about anything. */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
          <span className="flex items-center gap-2 font-mkt-mono text-[10.5px] leading-4 tracking-[0.06em] text-mkt-dark-fg-variant">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-[#B85C38]"
            />
            SENIOR BACKEND ENGINEER
          </span>
          {/* "612 EVIDENCE SPANS" was here, carried over from the compression
              panel. Span-level citation is a V1.1 deferral — this backend does
              not produce it — so the hero would have been advertising a
              feature that does not exist. These two numbers are the ones the
              surface below actually demonstrates, and they add up: 4 in the
              queue, 3 + 5 in the piles. */}
          <span className="font-mkt-mono text-[10.5px] leading-4 tabular-nums text-mkt-dark-outline">
            12 CANDIDATES · 8 SORTED WITHOUT YOU
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
          {/* ---------------------------------------------------------- */}
          {/* THE QUEUE                                                   */}
          {/* ---------------------------------------------------------- */}
          <div className="border-b border-white/[0.07] md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-2.5 font-mkt-mono text-[10.5px] leading-4 tracking-[0.06em] text-mkt-dark-fg-variant">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[#B85C38]" />
              NEEDS YOU
              <span className="tabular-nums text-mkt-dark-outline">
                · {QUEUE.length - (decided ? 1 : 0)} REMAINING
              </span>
            </div>

            <ul className="divide-y divide-white/[0.05]">
              {QUEUE.map((c, i) => {
                const isActive = i === index
                return (
                  <li
                    key={c.id}
                    className={`flex items-center gap-2.5 px-4 py-2.5 transition-colors duration-300 ${
                      isActive ? 'bg-white/[0.045]' : ''
                    } ${isActive && decided ? 'opacity-45' : ''}`}
                  >
                    {/* The focus marker: the app's 2px accent rule on the
                        active row, not a highlight fill. */}
                    <span
                      aria-hidden="true"
                      className={`h-6 w-0.5 shrink-0 rounded-full transition-colors duration-300 ${
                        isActive ? 'bg-[#C48B71]' : 'bg-transparent'
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] leading-5 text-mkt-dark-fg">
                      {c.name}
                    </span>
                    {isActive && decided ? (
                      <span
                        className="font-mkt-mono text-[10.5px] leading-4 tracking-[0.04em]"
                        style={{ color: DECISION_COLOR[c.decision] }}
                      >
                        {DECIDED_LABEL[c.decision]}
                      </span>
                    ) : (
                      <ScoreReadout score={c.fit} />
                    )}
                  </li>
                )
              })}
            </ul>

            {/* The piles: what the guard already sorted, and did not ask you
                about. This is the product's actual proposition — the queue
                above is short because these two are not in it. */}
            <div className="space-y-1.5 border-t border-white/[0.07] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] leading-4 text-mkt-dark-fg-variant">
                  Review &amp; accept{' '}
                  <span className="font-mkt-mono tabular-nums text-mkt-dark-outline">
                    · {ACCEPT_PILE}
                  </span>
                </span>
                <span className="font-mkt-mono text-[10px] leading-4 text-mkt-dark-outline">
                  FIT ≥ {ACCEPT_MIN_SCORE}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11.5px] leading-4 text-mkt-dark-fg-variant">
                  Review &amp; reject{' '}
                  <span className="font-mkt-mono tabular-nums text-mkt-dark-outline">
                    · {REJECT_PILE}
                  </span>
                </span>
                <span className="font-mkt-mono text-[10px] leading-4 text-mkt-dark-outline">
                  FIT &lt; {REJECT_MAX_SCORE}
                </span>
              </div>
              <p className="flex items-center gap-1.5 pt-0.5 font-mkt-mono text-[10px] leading-4 tracking-[0.04em] text-[#D9A441]">
                <span aria-hidden="true" className="size-1 rounded-full bg-[#D9A441]" />
                {NEAR_THE_LINE} NEAR THE LINE
              </p>
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* THE READ                                                    */}
          {/* ---------------------------------------------------------- */}
          <div className="flex flex-col px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-medium leading-6 text-mkt-dark-fg">
                  {active.name}
                </h3>
                <p className="mt-0.5 text-[11.5px] leading-4 text-mkt-dark-outline">
                  {active.matchCategory} · Stage · Screening
                </p>
              </div>
              {unsure ? (
                <span className="shrink-0 rounded-[3px] bg-white/[0.07] px-1.5 py-0.5 font-mkt-mono text-[9.5px] leading-4 tracking-[0.05em] text-mkt-dark-fg-variant">
                  AI UNSURE
                </span>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.07] pt-3">
              <ScoreReadout score={active.fit} wide />
              <span className="font-mkt-mono text-[10.5px] leading-4 tracking-[0.04em] text-mkt-dark-outline">
                ATS 71
              </span>
            </div>

            {/* THE VERDICT — the app's fixed contract order:
                Answer → Sources → Confidence → Reasoning → Actions. */}
            <div className="mt-3.5 border-t border-white/[0.07] pt-3.5">
              <p className="font-mkt-mono text-[10px] leading-4 tracking-[0.06em] text-mkt-dark-outline">
                THE VERDICT
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[19px] text-mkt-dark-fg">
                {active.verdict}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-mkt-dark-outline">
                {/* "PAGE 1" implied a page-anchored citation the product
                    cannot yet produce. The résumé record is real; the page
                    offset is not. */}
                <span className="font-mkt-mono tracking-[0.04em]">FROM RÉSUMÉ</span>
                <span aria-hidden="true">·</span>
                <span
                  className="inline-flex items-center gap-1"
                  style={{ color: active.confidence === 'High' ? '#8FA678' : '#D9A441' }}
                >
                  <span
                    aria-hidden="true"
                    className="size-1 rounded-full"
                    style={{
                      backgroundColor:
                        active.confidence === 'High' ? '#8FA678' : '#D9A441',
                    }}
                  />
                  {active.confidence} confidence
                </span>
              </p>
            </div>

            {/* RISK + the lines it was read from. The copper rule marks
                system-generated content (Design System V2 §16). */}
            <div className="mt-3.5 border-l-2 border-l-[#C48B71] pl-3">
              <p className="font-mkt-mono text-[10px] leading-4 tracking-[0.06em] text-mkt-dark-outline">
                RISK
              </p>
              <p className="mt-1 text-[12px] leading-[18px] text-mkt-dark-fg">
                {active.risk}
              </p>
            </div>

            <div className="mt-3">
              <p className="font-mkt-mono text-[10px] leading-4 tracking-[0.06em] text-mkt-dark-outline">
                EVIDENCE
              </p>
              <ul className="mt-1.5 space-y-1">
                {active.evidence.map((e, i) => (
                  <EvidenceLine
                    key={e.line}
                    line={e.line}
                    mark={e.mark}
                    shown={evidenceShown}
                    delay={i * 220}
                  />
                ))}
              </ul>
            </div>

            {/* The reasoning panel, collapsed by default exactly as it is in
                the app. Animating grid-template-rows rather than height is
                what lets it open to its content's real size without a
                measured pixel value. */}
            <div
              className="mt-3 grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.2,0,0,1)]"
              style={{
                gridTemplateRows: reasoningOpen ? '1fr' : '0fr',
                opacity: reasoningOpen ? 1 : 0,
              }}
            >
              <div className="overflow-hidden">
                <div className="rounded-[4px] bg-white/[0.035] px-3 py-2.5">
                  <p className="font-mkt-mono text-[10px] leading-4 tracking-[0.06em] text-mkt-dark-outline">
                    REASONING
                  </p>
                  <p className="mt-1 text-[11.5px] leading-[18px] text-mkt-dark-fg-variant">
                    {active.reasoning}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The decision bar. Real actions, real shortcuts. The product's claim
            is that the recruiter decides, so the surface ends on their move
            rather than on the machine's. */}
        <div className="flex items-center gap-1.5 border-t border-white/[0.07] bg-white/[0.02] px-4 py-2.5">
          {(
            [
              { label: 'Advance', key: 'A' },
              { label: 'Reject', key: 'R' },
              { label: 'Shortlist', key: 'S' },
              { label: 'Deeper', key: 'D' },
            ] as const
          ).map((action) => {
            // Advance is the resting primary — one filled control per surface.
            // On the decide beat the fill moves to whichever move this
            // candidate's verdict actually calls for.
            const chosen = decided && action.label === active.decision
            const resting = !decided && action.label === 'Advance'
            return (
              <span
                key={action.label}
                className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-[11.5px] leading-5 transition-colors duration-300 ${
                  chosen || resting ? '' : 'text-mkt-dark-fg-variant'
                }`}
                style={
                  chosen
                    ? { backgroundColor: DECISION_COLOR[action.label], color: '#15181C' }
                    : resting
                      ? { backgroundColor: '#B85C38', color: '#fff' }
                      : undefined
                }
              >
                {action.label}
                <span
                  className={`font-mkt-mono text-[9.5px] leading-none ${
                    chosen || resting ? 'opacity-70' : 'text-mkt-dark-outline'
                  }`}
                >
                  {action.key}
                </span>
              </span>
            )
          })}
        </div>
      </figure>
    </div>
  )
}
