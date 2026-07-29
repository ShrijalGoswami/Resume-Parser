'use client'

import { useState } from 'react'
import Link from 'next/link'

import { Counter, Reveal } from './motion'

/**
 * Frame 5 — `hirelens_marketing_the_conclusion_frame_5`.
 *
 * The close: customer story, pricing teaser, FAQ accordion, and the Deep Ink
 * final call to action.
 *
 * Frame 5 uses a max-w-7xl (1280px) container with 32px side padding. The FAQ
 * is the one genuinely interactive element in the marketing frames — Stitch
 * ships it as inline `onclick` toggles with the first item open; that behaviour
 * is reproduced here as real React state so it stays keyboard-accessible.
 */

const PRICING_TIERS = [
  {
    name: 'Team',
    blurb: 'Essential clarity for focused hiring sprints and small teams.',
    price: 'Starts at $499',
    unit: '/mo',
    cta: 'Start with Team',
    featured: false,
    meta: 'Up to 5 open roles · 3 seats',
    // What each tier actually gives you. Without this, three cards differ only
    // by a number, which asks the reader to guess at the difference.
    features: [
      'Triage, deep review, and decision memos',
      'Evidence linked to every claim',
      'Shared decision ledger',
      'Email support',
    ],
  },
  {
    name: 'Business',
    blurb: 'Advanced AI calibration for growing organizations.',
    price: 'Starts at $999',
    unit: '/mo',
    cta: 'Start with Business',
    featured: true,
    meta: 'Unlimited roles · 15 seats',
    features: [
      'Everything in Team',
      'Calibration tuned to your own hires',
      'Regret analysis across shortlists',
      'ATS integration · SSO / SAML',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    blurb: 'Custom modeling and dedicated strategic support.',
    price: 'Custom',
    unit: ' terms',
    cta: 'Talk to us',
    featured: false,
    meta: 'Unlimited roles and seats',
    features: [
      'Everything in Business',
      'Custom competency modelling',
      'Data residency · your region',
      'Audit export and retention controls',
      'Named integration partner',
    ],
  },
]

/** The customer story's outcome, told as the sequence it happened in. A quote
 *  says it worked; the timeline says when, and at what cost. */
const STORY_TIMELINE = [
  { day: 'Day 0', event: '412 applicants across 2 roles', tone: 'neutral' },
  { day: 'Day 1', event: '38 viable · every exclusion reasoned', tone: 'neutral' },
  { day: 'Day 4', event: '9 deep reviews, evidence attached', tone: 'neutral' },
  { day: 'Day 9', event: 'Both offers signed · 0 regretted', tone: 'good' },
]

/** The last beat of the story: the decision, kept. */
const LEDGER_ENTRIES = [
  { time: '14:02', actor: 'K. Osei', action: 'Approved A. Okonkwo · Role 884-A' },
  { time: '14:02', actor: 'HireLens', action: 'Memo, evidence, and alternates sealed' },
  { time: '14:03', actor: 'Ledger', action: 'Entry written · reversible 30 days' },
]

const FAQS = [
  {
    question: 'Is HireLens an ATS?',
    answer:
      'No. HireLens is an intelligence layer that sits on top of your existing Applicant Tracking System. We integrate with major ATS platforms to provide scoring, calibration, and insights without forcing you to migrate your core data infrastructure.',
  },
  {
    question: 'Does it replace my recruiters?',
    answer:
      'HireLens acts as a highly capable assistant, not a replacement. It handles the high-volume data processing and initial calibration, freeing your recruiters to focus on relationship building, negotiation, and strategic alignment.',
  },
  {
    question: 'How do you handle bias?',
    answer:
      'Our models are continuously audited for bias. We focus on skill-based evaluation and intentionally obscure demographic identifiers during the initial screening phases to ensure a fair calibration process.',
  },
  {
    question: 'How is my data used?',
    answer:
      'Your data remains yours. We do not use your proprietary candidate data to train our global models without explicit consent. Security and privacy are foundational to the HireLens architecture.',
  },
  {
    question: 'How hard is migration?',
    answer:
      'Since we integrate with your existing systems, implementation is typically completed within a few days, not months. Our enterprise tier includes dedicated integration support.',
  },
]

export function Frame05Conclusion() {
  // Stitch ships frame 5 with the first inquiry already expanded.
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* CUSTOMER STORY                                                    */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-7xl border-b border-mkt-subtle bg-mkt-canvas px-8 py-32">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="mb-8 font-mkt-display text-4xl leading-tight text-mkt-fg md:text-5xl md:leading-none lg:text-6xl">
              &ldquo;HireLens changed which hires we&rsquo;re proud of, not just
              how fast we made them.&rdquo;
            </h2>

            <div className="flex items-start gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/marketing/portrait-sarah-jenkins.png"
                alt="Sarah Jenkins, VP of Engineering"
                className="h-16 w-16 rounded-full object-cover grayscale"
              />
              <div>
                <p className="mb-4 mkt-body-lg text-mkt-fg-secondary">
                  Before HireLens, our engineering recruitment was a volume
                  game. We prioritized speed over alignment. The AI didn&rsquo;t
                  just filter resumes; it highlighted the nuances we were
                  missing. We shifted from reacting to applications to designing
                  our teams.
                </p>
                <p className="font-mkt-label text-base font-medium text-mkt-fg">
                  Sarah Jenkins, VP of Engineering
                </p>
                <div className="mt-2 mkt-data text-mkt-fg-tertiary">
                  <span className="font-medium text-mkt-fg">2 roles</span>{' '}
                  -&gt; filled in 9 days,{' '}
                  <span className="font-medium text-mkt-fg">0 regretted</span>.
                </div>
              </div>
            </div>

            <div className="mt-12">
              <Link
                href="/auth/signup"
                // `py-1` is hit area only — the link was 20px tall, under the
                // 24px WCAG 2.5.8 minimum for a standalone target on touch.
                className="-my-1 inline-flex items-center py-1 mkt-body-sm font-medium text-mkt-accent-text transition-opacity hover:opacity-80"
              >
                Read more stories
                <span className="material-symbols-outlined ml-1 text-[16px]">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative aspect-[3/4] overflow-hidden rounded-mkt-lg border border-mkt-subtle">
              <div className="absolute inset-0 flex items-center justify-center bg-mkt-subtle/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/marketing/atrium.png"
                  alt=""
                  className="h-full w-full object-cover opacity-80 grayscale"
                />
              </div>

              {/* The story's arithmetic, floated over the image so the column
                  carries the result and not just the atmosphere. */}
              <div className="absolute inset-x-4 bottom-4 rounded-mkt-lg border border-white/15 bg-mkt-ink/85 p-5 backdrop-blur-md">
                <div className="mb-4 flex items-baseline justify-between border-b border-white/10 pb-3">
                  <span className="mkt-label text-white/50">
                    Two roles, start to signed
                  </span>
                  <span className="mkt-data text-white">
                    <Counter to={9} suffix=" days" />
                  </span>
                </div>

                <ol className="space-y-2.5">
                  {STORY_TIMELINE.map((step) => (
                    <li key={step.day} className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                          step.tone === 'good' ? 'bg-mkt-focus-sharp' : 'bg-white/35'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="w-11 shrink-0 mkt-data text-white/45">
                        {step.day}
                      </span>
                      <span
                        className={`mkt-body-sm ${
                          step.tone === 'good' ? 'text-white' : 'text-white/70'
                        }`}
                      >
                        {step.event}
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
        className="mx-auto max-w-7xl border-b border-mkt-subtle bg-mkt-canvas px-8 py-32"
      >
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-mkt-display text-3xl text-mkt-fg">
            Transparent access.
          </h2>
          <p className="font-mkt-body text-mkt-fg-secondary">
            Designed for teams that value precision over noise.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PRICING_TIERS.map((tier, i) => (
            <Reveal
              key={tier.name}
              delay={i * 90}
              className={`mkt-lift relative flex flex-col overflow-hidden rounded-mkt-lg border bg-mkt-canvas p-8 ${
                tier.featured
                  ? 'border-mkt-border-strong shadow-[0_8px_40px_rgba(11,13,13,0.05)]'
                  : 'border-mkt-border'
              }`}
            >
              {tier.featured && (
                <div className="mkt-prism-hairline absolute top-0 right-0 left-0 h-px" />
              )}

              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="mkt-body-lg font-medium text-mkt-fg">
                  {tier.name}
                </h3>
                {tier.featured && (
                  <span className="rounded-[0.25rem] bg-mkt-accent-bg px-2 py-0.5 mkt-label text-mkt-accent-text">
                    Most teams
                  </span>
                )}
              </div>

              <p className="mb-6 mkt-body-sm text-mkt-fg-secondary">
                {tier.blurb}
              </p>

              <div className="mb-6 border-b border-mkt-border-subtle pb-6">
                <div className="font-mkt-mono text-xl text-mkt-fg">
                  {tier.price}
                  <span className="text-base text-mkt-fg-tertiary">{tier.unit}</span>
                </div>
                <p className="mt-1 mkt-data text-mkt-fg-tertiary">
                  {tier.meta}
                </p>
              </div>

              <ul className="mb-8 flex-grow space-y-2.5">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span
                      className="material-symbols-outlined mt-px text-[15px] text-mkt-accent-text"
                      aria-hidden="true"
                    >
                      check
                    </span>
                    <span className="mkt-body-sm text-mkt-fg-secondary">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/signup"
                className={
                  tier.featured
                    ? 'w-full rounded-[0.25rem] bg-mkt-fg py-2.5 text-center text-base font-medium text-mkt-canvas transition-opacity hover:opacity-90'
                    : 'w-full rounded-[0.25rem] border border-mkt-border py-2.5 text-center text-base font-medium text-mkt-fg transition-colors hover:bg-mkt-subtle'
                }
              >
                {tier.cta}
              </Link>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/auth/signup"
            // `py-1` is hit area only — see the note on the CTA above.
            className="-my-1 inline-flex items-center py-1 mkt-body-sm text-mkt-fg-tertiary transition-colors hover:text-mkt-fg"
          >
            See full pricing
            <span className="material-symbols-outlined ml-1 text-[16px]">
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
                  <span className="material-symbols-outlined text-mkt-fg-tertiary">
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
        <div className="mkt-grid-dark pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
        <div className="mkt-vignette-dark pointer-events-none absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-4xl px-8 text-center">
          <Reveal>
            <h2 className="mb-10 font-mkt-display text-5xl tracking-tight text-mkt-canvas md:text-7xl">
              Bring every hire into focus.
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Link
                href="/auth/signup"
                className="w-full rounded-mkt-lg bg-mkt-accent px-8 py-4 text-center mkt-body font-medium text-white shadow-[0_0_0_2px_rgba(91,91,214,0)] transition-all hover:shadow-[0_0_0_2px_rgba(91,91,214,0.5)] sm:w-auto"
              >
                Start with HireLens
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
