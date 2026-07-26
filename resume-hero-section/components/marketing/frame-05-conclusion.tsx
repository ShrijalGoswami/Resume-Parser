'use client'

import { useState } from 'react'
import Link from 'next/link'

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
  },
  {
    name: 'Business',
    blurb: 'Advanced AI calibration for growing organizations.',
    price: 'Starts at $999',
    unit: '/mo',
    cta: 'Start with Business',
    featured: true,
  },
  {
    name: 'Enterprise',
    blurb: 'Custom modeling and dedicated strategic support.',
    price: 'Custom',
    unit: ' terms',
    cta: 'Talk to us',
    featured: false,
  },
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
                <p className="mb-4 font-mkt-body text-lg leading-relaxed text-mkt-fg-secondary">
                  Before HireLens, our engineering recruitment was a volume
                  game. We prioritized speed over alignment. The AI didn&rsquo;t
                  just filter resumes; it highlighted the nuances we were
                  missing. We shifted from reacting to applications to designing
                  our teams.
                </p>
                <p className="font-mkt-label text-sm font-medium text-mkt-fg">
                  Sarah Jenkins, VP of Engineering
                </p>
                <div className="mt-2 font-mkt-mono text-xs text-mkt-fg-tertiary">
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
                className="-my-1 inline-flex items-center py-1 font-mkt-body text-sm font-medium text-mkt-accent-text transition-opacity hover:opacity-80"
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
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-mkt-lg border border-mkt-border bg-mkt-canvas p-8"
            >
              {tier.featured && (
                <div className="mkt-prism-hairline absolute top-0 right-0 left-0 h-px" />
              )}
              <h3 className="mb-2 font-mkt-body text-lg font-medium text-mkt-fg">
                {tier.name}
              </h3>
              <p className="mb-8 flex-grow font-mkt-body text-sm text-mkt-fg-secondary">
                {tier.blurb}
              </p>
              <div className="mb-8 font-mkt-mono text-xl text-mkt-fg">
                {tier.price}
                <span className="text-sm text-mkt-fg-tertiary">{tier.unit}</span>
              </div>
              <Link
                href="/auth/signup"
                className={
                  tier.featured
                    ? 'w-full rounded-[0.25rem] bg-mkt-fg py-2 text-center text-sm font-medium text-mkt-canvas transition-opacity hover:opacity-90'
                    : 'w-full rounded-[0.25rem] border border-mkt-border py-2 text-center text-sm font-medium text-mkt-fg transition-colors hover:bg-mkt-subtle'
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/auth/signup"
            // `py-1` is hit area only — see the note on the CTA above.
            className="-my-1 inline-flex items-center py-1 font-mkt-body text-sm text-mkt-fg-tertiary transition-colors hover:text-mkt-fg"
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
                  <span className="font-mkt-body text-lg font-medium text-mkt-fg">
                    {faq.question}
                  </span>
                  <span className="material-symbols-outlined text-mkt-fg-tertiary">
                    {isOpen ? 'remove' : 'add'}
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-4 pr-12 font-mkt-body text-sm leading-relaxed text-mkt-fg-secondary">
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
      <section className="relative overflow-hidden bg-mkt-ink py-40">
        <div className="relative z-10 mx-auto max-w-4xl px-8 text-center">
          <h2 className="mb-12 font-mkt-display text-5xl tracking-tight text-mkt-canvas md:text-7xl">
            Bring every hire into focus.
          </h2>
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Link
              href="/auth/signup"
              className="w-full rounded-mkt-lg bg-mkt-accent px-8 py-4 text-center font-mkt-body text-base font-medium text-white shadow-[0_0_0_2px_rgba(91,91,214,0)] transition-all hover:shadow-[0_0_0_2px_rgba(91,91,214,0.5)] sm:w-auto"
            >
              Start with HireLens
            </Link>
            <a
              href="#customers"
              className="w-full rounded-mkt-lg border border-mkt-subtle px-8 py-4 text-center font-mkt-body text-base font-medium text-mkt-canvas transition-colors hover:bg-mkt-canvas/5 sm:w-auto"
            >
              Book a demo
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
