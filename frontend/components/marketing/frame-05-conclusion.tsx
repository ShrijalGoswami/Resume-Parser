'use client'

import { useState } from 'react'
import Link from 'next/link'

import { Reveal } from './motion'
import { EditorialBackdrop } from './fx/editorial-backdrops'
import {
  CORE_PLAN_KEYS,
  FEATURES,
  FEATURE_KEYS,
  LIMITS,
  PLAN_LABELS,
  RESUME_WINDOW,
  isUnlimited,
} from '@/components/hirelens/lib/entitlements/catalog'
import {
  FEATURED_PLAN,
  PLAN_POSITIONING,
  formatPrice,
  isQuoted,
  priceSuffix,
} from '@/lib/pricing'
import { useCurrencyPreference } from './pricing/use-currency-preference'

/**
 * Frame 5 — `hirelens_marketing_the_conclusion_frame_5`.
 *
 * The close: customer story, pricing teaser, FAQ accordion, and the Deep Ink
 * final call to action.
 *
 * Frame 5 uses a max-w-[1280px] (1280px) container with 32px side padding. The FAQ
 * is the one genuinely interactive element in the marketing frames — Stitch
 * ships it as inline `onclick` toggles with the first item open; that behaviour
 * is reproduced here as real React state so it stays keyboard-accessible.
 */

/**
 * The homepage pricing band is DERIVED, not written.
 *
 * It used to name a "Team" tier at $499 and a "Business" tier at $999 — three
 * tiers, hand-written features, and no relationship to what the product
 * actually sells or enforces. Since monetization shipped, the real matrix is
 * four plans in the entitlement catalog, and the prices live in `lib/pricing`.
 * A marketing page quoting tiers that do not exist is not a stale detail; it is
 * the first thing a visitor reads and the last thing they will forgive.
 *
 * This band is a teaser: the plan, the price, the headline limit, and the tier
 * it builds on. The full comparison is `/pricing`.
 */

/**
 * THE STORY THIS SECTION USED TO TELL WAS NOT TRUE.
 *
 * It ran a named testimonial — "Sarah Jenkins, VP of Engineering", with a
 * photographic portrait — over a timeline claiming 412 applicants across two
 * roles resolved to two signed offers and zero regretted hires in nine days.
 * There is no such customer, no such engagement and no such result. Attaching a
 * stock portrait to an invented person and a fabricated outcome is the single
 * most damaging thing that was on this site.
 *
 * The section keeps its shape — a claim on the left, the arithmetic on the
 * right — because the shape is good. What it now describes is THE PATH THE
 * PRODUCT PUTS YOU ON, written in the second person and in the conditional, so
 * it reads as what happens when you use it rather than as something that
 * already happened to somebody else.
 *
 * When a real customer agrees in writing to be named, this is where they go,
 * with numbers someone measured.
 */

/** The lifecycle of one decision, as the ledger keeps it — including the
 *  part no other tool shows: the decision coming back, and surviving.
 *  Illustrative of the product's flow (same fictional role and approver used
 *  across the page), attributed to no real customer. */
const STORY_LEDGER = [
  { at: '14:02', actor: 'K. Osei', event: 'Approved A. Okonkwo · Role 884-A', tone: 'neutral' },
  { at: '14:02', actor: 'Hirevo', event: 'Memo, evidence and alternates sealed', tone: 'neutral' },
  { at: 'Day 12', actor: 'K. Osei', event: 'Decision reopened — new reference signal', tone: 'reopened' },
  { at: 'Day 12', actor: 'Hirevo', event: 'Evidence re-run · alternate re-compared', tone: 'neutral' },
  { at: 'Day 13', actor: 'K. Osei', event: 'Re-decided: A. Okonkwo confirmed', tone: 'good' },
]

/** The last beat of the story: the decision, kept. */
const LEDGER_ENTRIES = [
  { time: '14:02', actor: 'K. Osei', action: 'Approved A. Okonkwo · Role 884-A' },
  { time: '14:02', actor: 'Hirevo', action: 'Memo, evidence, and alternates sealed' },
  { time: '14:03', actor: 'Ledger', action: 'Entry written · reversible 30 days' },
]

/**
 * EVERY ANSWER HERE HAD TO BE REWRITTEN, and it is worth recording why.
 *
 * The previous set claimed: that we "integrate with major ATS platforms"
 * (integrations are an unbuilt Pro capability — there are none); that "our
 * models are continuously audited for bias" and that we "intentionally obscure
 * demographic identifiers during the initial screening phases" (no bias audit
 * has ever been performed and no redaction stage exists in the pipeline); and
 * that migration "is typically completed within a few days" with "dedicated
 * integration support" (nothing to migrate to, nobody assigned).
 *
 * The bias one is the most serious. A published bias audit is a REGULATED
 * artefact for hiring technology — NYC Local Law 144 requires an annual one for
 * automated employment decision tools, and the EU AI Act classifies CV
 * screening as high-risk. Claiming an audit you have not performed is worse
 * than performing none, because it is the claim a regulator can act on.
 *
 * The privacy answer also contradicted the /pricing FAQ, which says flatly that
 * customer data is never used to train anything for anyone else. The version
 * here hedged with "without explicit consent", implying a consent mechanism
 * that does not exist. The two pages now give the same answer, and it is the
 * stricter one.
 *
 * The test for an answer on this page: could a customer hold us to it tomorrow?
 */
const FAQS = [
  {
    question: 'Is Hirevo an ATS?',
    answer:
      'No, and it does not replace one. Hirevo is a decision layer: you bring résumés for a role, it reads all of them, and it gives you evidence, risk and what each choice would cost you. Today you upload résumés directly — there are no ATS integrations yet, so it runs alongside whatever you already use rather than plugging into it. Integrations are on the roadmap and are not something you have today.',
  },
  {
    question: 'Does it replace my recruiters?',
    answer:
      'No. It reads the pile so a recruiter does not have to, and it attaches evidence to every claim it makes — but it recommends and a person decides. Our terms require a human to review any decision that materially affects a candidate, and the product records who made each call and on what basis.',
  },
  {
    question: 'How do you handle bias?',
    answer:
      'Honestly: we have not completed a formal bias audit, and we will not claim one until we have. What we do today is structural. Every score opens to the passage of the résumé it came from, so a judgement you disagree with can be traced rather than taken on faith; low confidence is shown rather than rounded up; and nothing is auto-rejected — the tool ranks, a person decides, and the decision is logged with its reasoning. If you are subject to an audit requirement such as NYC Local Law 144, talk to us before you deploy rather than after.',
  },
  {
    question: 'How is my data used?',
    answer:
      'To serve your organization and nothing else. Your résumés, decisions and notes are never used to train models that serve anyone but you, we do not sell personal data, and there is no advertising or third-party tracking on any signed-in page. Data is stored in Singapore; résumé text is sent to a US inference provider to produce the analysis. The full list of who touches your data is in our Privacy Policy.',
  },
  {
    question: 'What does it take to get started?',
    answer:
      'An account, a job description and some résumés. There is nothing to install, no data migration and no implementation project, because there is nothing to integrate with yet. Every new organization gets two full analyses free, without a card, which is enough to tell whether the output is worth anything to you.',
  },
]

export function Frame05Conclusion() {
  // Stitch ships frame 5 with the first inquiry already expanded.
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  // The same currency preference `/pricing` uses, including a choice made
  // there on an earlier visit — the homepage must never quote a different
  // currency than the page it links to.
  const [currency] = useCurrencyPreference()

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* CUSTOMER STORY                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate mx-auto max-w-[1280px] overflow-hidden border-b border-mkt-subtle bg-mkt-canvas px-8 py-32">
        {/* Morning light through a tall window: the work under control. */}
        <EditorialBackdrop variant="daylight" />
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="mb-8 font-mkt-display text-4xl leading-tight text-mkt-fg md:text-5xl md:leading-none">
              Change which hires you’re proud of, not just how fast you
              make them.
            </h2>

            <div>
              <p className="mb-4 mkt-body-lg text-mkt-fg-secondary">
                Most engineering recruitment is a volume game: speed over alignment, and the
                outliers lost somewhere in the middle of the stack. Hirevo does not just
                filter résumés — it surfaces the nuance you would have missed, attaches the
                evidence for every claim it makes, and prices what each choice costs you. The
                shift is from reacting to applications to designing a team.
              </p>
              <p className="mkt-body-sm text-mkt-fg-tertiary">
                Two résumés, free, no card. That is enough to see whether any of this is true.
              </p>
            </div>

            <div className="mt-12">
              <Link
                href="/pricing"
                // `py-1` is hit area only — the link was 20px tall, under the
                // 24px WCAG 2.5.8 minimum for a standalone target on touch.
                className="-my-1 inline-flex items-center py-1 mkt-body-sm font-medium text-mkt-accent-text transition-opacity hover:opacity-80"
              >
                {/* Was "Read more stories" pointing at /auth/signup — a label
                    promising content and delivering a registration wall. There
                    are no stories to read; there is a plan comparison, so the
                    link now says what it does. */}
                See what each plan includes
                {/* Decorative. The ligature is text content, so without this
                    the link reads "Compare every planarrow_forward" to a
                    screen reader and to every text extractor. */}
                <span className="material-symbols-outlined ml-1 text-[16px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative aspect-[3/4] overflow-hidden rounded-mkt-lg border border-mkt-subtle">
              <div className="absolute inset-0 flex items-center justify-center bg-mkt-subtle/50">
                {/* Warm-graded into the hero's world: charcoal shadows,
                    copper-warm highlights — no longer the cold grayscale
                    stock atrium that could belong to any company. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/marketing/atrium.png"
                  alt=""
                  className="h-full w-full object-cover opacity-90"
                  style={{
                    filter:
                      'grayscale(1) sepia(0.42) hue-rotate(-14deg) saturate(1.15) brightness(0.88) contrast(1.06)',
                  }}
                />
                {/* The hero's light, borrowed: warmth falling from the upper
                    left, ink gathering at the base for the card to sit on. */}
                <div
                  className="absolute inset-0"
                  aria-hidden="true"
                  style={{
                    background: [
                      'radial-gradient(90% 60% at 18% 8%, rgba(196, 139, 113, 0.22), transparent 70%)',
                      'linear-gradient(180deg, rgba(18, 20, 23, 0.05) 30%, rgba(13, 16, 19, 0.62) 100%)',
                    ].join(', '),
                  }}
                />
              </div>

              {/* The ledger itself, floated over the image: one decision's
                  whole life — made, sealed, reopened, and re-decided. */}
              <div className="absolute inset-x-4 bottom-4 rounded-mkt-lg border border-white/15 bg-mkt-ink/85 p-5 backdrop-blur-md">
                <div className="mb-4 flex items-baseline justify-between border-b border-white/10 pb-3">
                  <span className="whitespace-nowrap mkt-label text-white/50">Decision ledger</span>
                  <span className="mkt-data text-white/70">Reversible 30 days</span>
                </div>

                <ol className="space-y-2.5">
                  {STORY_LEDGER.map((entry) => (
                    <li key={`${entry.at}-${entry.event}`} className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                          entry.tone === 'good'
                            ? 'bg-mkt-focus-sharp'
                            : entry.tone === 'reopened'
                              ? 'bg-mkt-dark-primary'
                              : 'bg-white/35'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="w-14 shrink-0 whitespace-nowrap mkt-data text-white/45">
                        {entry.at}
                      </span>
                      <span
                        className={`mkt-body-sm ${
                          entry.tone === 'good'
                            ? 'text-white'
                            : entry.tone === 'reopened'
                              ? 'text-[#dfb39e]'
                              : 'text-white/70'
                        }`}
                      >
                        {entry.event}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* PRICING TEASER                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section
        id="pricing"
        className="mx-auto max-w-[1280px] border-b border-mkt-subtle bg-mkt-canvas px-8 py-32"
      >
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-mkt-display text-3xl text-mkt-fg">
            Transparent access.
          </h2>
          <p className="font-mkt-body text-mkt-fg-secondary">
            Designed for teams that value precision over noise.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {CORE_PLAN_KEYS.map((plan, i) => {
            const featured = plan === FEATURED_PLAN
            // Previous rung of the LADDER — the one-time trials are not part of
            // the "everything in X, plus:" chain (see pricing/plan-cards.tsx).
            const previous = CORE_PLAN_KEYS[i - 1]
            const resumes = LIMITS[plan].resumes
            const seats = LIMITS[plan].members
            return (
              <Reveal
                key={plan}
                delay={i * 80}
                // Kept identical to the /pricing cards (pricing/plan-cards.tsx)
                // — the same four plans rendered two ways is the seam a visitor
                // notices when they click through from here.
                className={`mkt-lift relative flex flex-col overflow-hidden rounded-mkt-lg border bg-mkt-raised p-7 ${
                  featured
                    ? 'border-mkt-border-strong shadow-[var(--mkt-shadow-card-raised)]'
                    : 'border-mkt-border shadow-[var(--mkt-shadow-card-resting)]'
                }`}
              >
                {featured && (
                  <div className="mkt-prism-hairline absolute top-0 right-0 left-0 h-px" />
                )}

                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <h3 className="mkt-body-lg font-medium text-mkt-fg">{PLAN_LABELS[plan]}</h3>
                  {featured && (
                    <span className="shrink-0 rounded-[0.25rem] bg-mkt-accent-bg px-2 py-0.5 mkt-label text-mkt-accent-text">
                      Most teams
                    </span>
                  )}
                </div>

                {/* 4.5rem, matching pricing/plan-cards.tsx — NOT 2.75rem.
                    This band and the /pricing cards render the same four
                    strings from PLAN_POSITIONING, and at the 4-up width three
                    of the four wrap to three lines while Plus wraps to two. At
                    2.75rem the reserve cleared only two lines, so Plus's price,
                    rule and feature list all sat ~21px above its neighbours and
                    the row read as misaligned. /pricing was fixed and this copy
                    of the same card was not. `mkt-body-sm` is 15/24, so three
                    lines is 72px = 4.5rem. Re-measure both if the copy grows. */}
                <p className="mb-6 min-h-[4.5rem] mkt-body-sm text-mkt-fg-secondary">
                  {PLAN_POSITIONING[plan]}
                </p>

                <div className="mb-6 border-b border-mkt-border-subtle pb-6">
                  <div className="flex items-baseline gap-1 font-mkt-mono text-xl text-mkt-fg">
                    {formatPrice(plan, currency)}
                    <span className="text-base text-mkt-fg-tertiary">
                      {priceSuffix(plan, currency)}
                    </span>
                  </div>
                  <p className="mt-1.5 mkt-data text-mkt-fg-tertiary">
                    {isUnlimited(resumes)
                      ? 'Unlimited résumés'
                      : RESUME_WINDOW[plan] === 'month'
                        ? `${resumes} résumés / month`
                        : `${resumes} résumés to try`}
                    {' · '}
                    {isUnlimited(seats) ? 'Unlimited seats' : `${seats} seat${seats === 1 ? '' : 's'}`}
                  </p>
                </div>

                <ul className="mb-8 flex-grow space-y-2.5">
                  {previous && (
                    <li className="mkt-body-sm text-mkt-fg-secondary">
                      Everything in {PLAN_LABELS[previous]}, plus:
                    </li>
                  )}
                  {FEATURE_KEYS.map((key) => FEATURES[key])
                    .filter((f) => f.minPlan === plan)
                    .slice(0, 4)
                    .map((feature) => (
                      <li key={feature.key} className="flex items-start gap-2">
                        <span
                          className="material-symbols-outlined mt-px text-[15px] text-mkt-accent-text"
                          aria-hidden="true"
                        >
                          check
                        </span>
                        <span className="mkt-body-sm text-mkt-fg-secondary">{feature.label}</span>
                      </li>
                    ))}
                </ul>

                <Link
                  href="/pricing"
                  className={
                    featured
                      ? 'w-full rounded-[0.25rem] bg-mkt-fg py-2.5 text-center text-base font-medium text-mkt-canvas transition-opacity hover:opacity-90'
                      : 'w-full rounded-[0.25rem] border border-mkt-border py-2.5 text-center text-base font-medium text-mkt-fg transition-colors hover:bg-mkt-subtle'
                  }
                >
                  {isQuoted(plan) ? 'Talk to sales' : `See ${PLAN_LABELS[plan]}`}
                </Link>
              </Reveal>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/pricing"
            // `py-1` is hit area only — see the note on the CTA above.
            className="-my-1 inline-flex items-center py-1 mkt-body-sm text-mkt-fg-tertiary transition-colors hover:text-mkt-fg"
          >
            Compare every plan
            <span className="material-symbols-outlined ml-1 text-[16px]" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* FAQ                                                               */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-3xl bg-mkt-canvas px-8 py-32">
        <h2 className="mb-12 text-center font-mkt-display text-3xl text-mkt-fg">
          Common inquiries
        </h2>
        <div className="border-t border-mkt-border">
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i
            return (
              <div key={faq.question} className="border-b border-mkt-border py-6">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="mkt-body-lg font-medium text-mkt-fg">
                    {faq.question}
                  </span>
                  {/* The button already announces its state via
                      `aria-expanded`; the ligature would append a literal
                      "add" to every question. */}
                  <span
                    className="material-symbols-outlined text-mkt-fg-tertiary"
                    aria-hidden="true"
                  >
                    {isOpen ? 'remove' : 'add'}
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-4 pr-12 mkt-body-sm leading-relaxed text-mkt-fg-secondary">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* CLOSING                                                           */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden bg-mkt-ink py-32 md:py-40">
        <div className="mkt-aurora" />
        {/* Full circle: the hero's weather settled into a warm horizon. The
            engineering grid is gone — the page closes on light, not lines. */}
        <EditorialBackdrop variant="horizon" zBase />
        <div className="mkt-vignette-dark pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-4xl px-8 text-center">
          <Reveal>
            <h2 className="mb-10 font-mkt-display text-4xl tracking-tight text-mkt-canvas md:text-5xl">
              Bring every hire into focus.
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Link
                href="/auth/signup"
                className="w-full rounded-mkt-lg bg-mkt-accent px-8 py-4 text-center mkt-body font-medium text-white shadow-[0_0_0_2px_rgba(91,91,214,0)] transition-all hover:shadow-[0_0_0_2px_rgba(91,91,214,0.5)] sm:w-auto"
              >
                Start with Hirevo
              </Link>
              <a
                href="#customers"
                className="w-full rounded-mkt-lg border border-mkt-subtle px-8 py-4 text-center mkt-body font-medium text-mkt-canvas transition-colors hover:bg-mkt-canvas/5 sm:w-auto"
              >
                Book a demo
              </a>
            </div>
          </Reveal>

          {/* The last beat of the journey the page has been telling: the
              decision, once made, is kept — and can be reopened. */}
          <Reveal delay={160} className="mt-16">
            <div className="mx-auto max-w-xl overflow-hidden rounded-mkt-lg border border-white/[0.09] bg-white/[0.02] text-left backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
                <span className="inline-flex items-center gap-2 mkt-label text-white/45">
                  <span className="mkt-live-dot h-1 w-1 rounded-full bg-mkt-focus-sharp" />
                  Decision ledger
                </span>
                <span className="mkt-data text-white/35">
                  Today
                </span>
              </div>

              <ol className="divide-y divide-white/[0.06]">
                {LEDGER_ENTRIES.map((entry) => (
                  <li
                    key={entry.action}
                    className="flex items-center gap-3 px-5 py-2.5 mkt-data"
                  >
                    <span className="shrink-0 text-white/35">{entry.time}</span>
                    <span className="w-16 shrink-0 truncate text-white/70">
                      {entry.actor}
                    </span>
                    <span className="truncate text-white/50">{entry.action}</span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
