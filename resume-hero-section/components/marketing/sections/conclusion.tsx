import Link from 'next/link'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnchorLink } from '../anchor-link'

interface Plan {
  name: string
  usd: string
  inr: string
  who: string
  cta: string
  featured?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    usd: 'US$499',
    inr: '≈ ₹42,000',
    who: 'Ideal for startups and small hiring teams.',
    cta: 'Get started',
  },
  {
    name: 'Professional',
    usd: 'US$999',
    inr: '≈ ₹84,000',
    who: 'Ideal for growing companies hiring continuously.',
    cta: 'Get started',
    featured: true,
  },
  {
    name: 'Enterprise',
    usd: 'Custom',
    inr: '',
    who: 'Ideal for organizations requiring custom workflows, security, integrations and dedicated support.',
    cta: 'Request access',
  },
]

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Why not just use an ATS?',
    a: 'An ATS stores and searches candidates; HireLens helps you choose one. It is an intelligence layer that reads the whole pile, surfaces the few who matter, and shows the evidence behind each recommendation — alongside your ATS, not instead of it.',
  },
  {
    q: 'Does HireLens replace recruiters?',
    a: 'No. HireLens does the reading and compression so recruiters spend judgment where it matters. Recommendations are offered, never imposed — a person approves every decision.',
  },
  {
    q: 'How are AI recommendations generated?',
    a: 'Each candidate is analyzed against the role to produce a fit assessment, strengths, open questions, and a recommendation with its supporting evidence and a confidence level. When confidence is low, it is shown neutrally rather than hidden.',
  },
  {
    q: 'Who makes the final hiring decision?',
    a: 'You do. HireLens recommends; you approve or override. Every decision is reversible and written to the Decision Ledger exactly as it stood.',
  },
  {
    q: 'How is candidate data protected?',
    a: 'Data is isolated per workspace with row-level security, and every decision is recorded in an immutable audit trail. Your data stays your own — it is not shared with, or used to train models for, other organizations.',
  },
]

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border p-7',
        plan.featured ? 'border-mkt-iris bg-mkt-paper shadow-[0_24px_60px_-30px_rgba(91,91,214,0.35)]' : 'border-mkt-border bg-mkt-paper',
      )}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-mkt-fg">{plan.name}</h3>
        {plan.featured ? (
          <span className="rounded-full bg-mkt-iris/12 px-2 py-0.5 font-hl-mono text-[9px] uppercase tracking-widest text-mkt-iris-text">
            Most popular
          </span>
        ) : null}
      </div>
      <p className="mt-3 min-h-10 text-[14px] leading-relaxed text-mkt-fg-muted">{plan.who}</p>
      <div className="mt-6">
        <span className="font-hl-mono text-2xl text-mkt-fg">{plan.usd}</span>
        {plan.inr ? (
          <>
            <span className="font-hl-mono text-sm text-mkt-fg-subtle">
              {plan.usd === 'Custom' ? '' : '/month'}
            </span>
            <p className="mt-1 font-hl-mono text-[12px] text-mkt-fg-subtle">{plan.inr}/month*</p>
          </>
        ) : null}
      </div>
      <Link
        href="/auth/signup"
        className={cn(
          'mt-7 rounded-md px-4 py-2.5 text-center font-hl-mono text-[11px] uppercase tracking-widest transition-colors',
          plan.featured
            ? 'bg-mkt-iris text-white hover:opacity-90'
            : 'border border-mkt-border text-mkt-fg hover:bg-mkt-paper-raised',
        )}
      >
        {plan.cta}
      </Link>
    </div>
  )
}

/**
 * Conclusion — testimonial → pricing → FAQ → CTA. Editorial to the end. Pricing
 * is real (USD + approximate INR, who-each-plan-is-for). FAQ answers genuine
 * buyer questions truthfully. Generic testimonial attribution only. The closing
 * CTA mirrors the hero: begin with judgment, end with judgment.
 */
export function Conclusion() {
  return (
    <>
      {/* Testimonial — generic attribution, no names / companies / metrics */}
      <section className="bg-mkt-paper">
        <div className="mx-auto max-w-3xl px-6 py-28 text-center">
          <blockquote className="hl-display-md text-mkt-fg">
            “HireLens changed which hires we’re proud of, not just how fast we made them.”
          </blockquote>
          <p className="mt-6 font-hl-mono text-[11px] uppercase tracking-widest text-mkt-fg-subtle">
            Head of Talent
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-16 bg-mkt-paper-raised">
        <div className="mx-auto max-w-5xl px-6 py-28">
          <div className="text-center">
            <h2 className="hl-display-md text-mkt-fg">Transparent access.</h2>
            <p className="mt-4 text-lg text-mkt-fg-muted">
              Designed for teams that value precision over noise.
            </p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
          <p className="mt-8 text-center font-hl-mono text-[11px] text-mkt-fg-subtle">
            *Approximate INR pricing. Final billing depends on exchange rates and applicable taxes.
          </p>
        </div>
      </section>

      {/* FAQ — genuine buyer questions */}
      <section className="bg-mkt-paper">
        <div className="mx-auto max-w-3xl px-6 py-28">
          <h2 className="hl-display-md text-center text-mkt-fg">Common questions.</h2>
          <div className="mt-12 divide-y divide-mkt-border-subtle border-y border-mkt-border-subtle">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-mkt-fg [&::-webkit-details-marker]:hidden">
                  {q}
                  <Plus className="size-4 shrink-0 text-mkt-fg-subtle transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-mkt-fg-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — symmetry with the hero */}
      <section className="relative overflow-hidden bg-mkt-ink text-mkt-ink-fg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(45% 50% at 50% 40%, #5B5BD6, transparent 70%)', opacity: 0.1 }}
        />
        <div className="relative mx-auto max-w-3xl px-6 py-32 text-center">
          <h2 className="hl-display-lg">Your judgment, on every hire.</h2>
          <p className="mt-6 text-lg text-mkt-ink-muted">
            Begin with judgment. End with judgment — just better informed at every step.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="rounded-md bg-mkt-iris px-6 py-3 font-hl-mono text-[11px] uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            >
              Start with HireLens
            </Link>
            <AnchorLink
              to="methodology"
              className="rounded-md border border-mkt-ink-border px-6 py-3 font-hl-mono text-[11px] uppercase tracking-widest text-mkt-ink-fg/80 transition-colors hover:text-mkt-ink-fg"
            >
              See how it thinks
            </AnchorLink>
          </div>
        </div>
      </section>
    </>
  )
}
