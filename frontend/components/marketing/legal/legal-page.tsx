import * as React from 'react'

import { MarketingNav } from '@/components/marketing/marketing-nav'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { LEGAL_ENTITY_CONFIRMED, outstandingLegalFields } from '@/lib/legal'
import { LegalStructuredData } from '@/components/seo/structured-data-blocks'

/**
 * The shell every policy page renders inside.
 *
 * Same nav, same footer, same canvas and same type scale as the rest of the
 * public site — a policy page that looks like it came from somewhere else
 * reads as boilerplate someone pasted in, which is exactly the impression a
 * legal page cannot afford. Only the measure changes: 720px, because this is
 * the one surface on the site meant to be read top to bottom.
 *
 * THE DRAFT NOTICE IS NOT DECORATION. While `LEGAL_ENTITY_CONFIRMED` is false
 * the page states, above its own title, that it does not bind anyone. A policy
 * missing its entity name and jurisdiction is not a weaker policy — it is not a
 * policy, and presenting it as one would be the same class of claim this whole
 * pass exists to remove. See the header of `lib/legal.ts`.
 */
export function LegalPage({
  title,
  summary,
  updated,
  path,
  children,
}: {
  title: string
  /** One sentence, in plain language, before the clauses start. */
  summary: string
  updated: string
  /**
   * This page's own path, used for the breadcrumb.
   *
   * Emitted here rather than in each page so the three policies cannot drift
   * into describing their position in the site differently.
   */
  path: string
  children: React.ReactNode
}) {
  const outstanding = LEGAL_ENTITY_CONFIRMED ? [] : outstandingLegalFields()

  return (
    <div className="mkt-min-vh flex flex-col bg-mkt-canvas">
      <MarketingNav />
      <main className="flex-grow">
        <article className="mx-auto max-w-[720px] px-6 pb-24 pt-36 md:px-8">
          {!LEGAL_ENTITY_CONFIRMED ? (
            <aside
              role="note"
              className="mb-10 rounded-mkt-lg border border-mkt-border-strong bg-mkt-subtle p-5"
            >
              <p className="mb-2 mkt-label text-mkt-fg">Draft — not yet in force</p>
              <p className="mkt-body-sm text-mkt-fg-secondary">
                This document is published for review and does not yet bind Hirevo or its
                customers. It is missing details that only the registered company can supply
                {outstanding.length > 0 ? `: ${outstanding.join(', ')}` : ''}. Nothing here
                should be relied on until this notice is gone.
              </p>
            </aside>
          ) : null}

          <p className="mb-4 mkt-label text-mkt-fg-tertiary">Legal</p>
          <h1 className="mb-5 font-mkt-display text-4xl leading-tight text-mkt-fg md:text-5xl">
            {title}
          </h1>
          <p className="mb-3 mkt-body text-mkt-fg-secondary">{summary}</p>
          <p className="mb-12 border-b border-mkt-border pb-10 mkt-body-sm text-mkt-fg-tertiary">
            Last updated {updated}.
          </p>

          <div className="flex flex-col gap-10">{children}</div>
        </article>
      </main>
      <MarketingFooter />
      <LegalStructuredData name={title} path={path} />
    </div>
  )
}

/** One numbered clause. The heading is what a reader scans for; keep it a noun. */
export function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-mkt-display text-2xl text-mkt-fg">{title}</h2>
      {children}
    </section>
  )
}

/** Body copy inside a clause. */
export function P({ children }: { children: React.ReactNode }) {
  return <p className="mkt-body-sm leading-relaxed text-mkt-fg-secondary">{children}</p>
}

/** A list of obligations, rights or exclusions. */
export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-5">
      {items.map((item, index) => (
        <li
          key={index}
          className="list-disc mkt-body-sm leading-relaxed text-mkt-fg-secondary marker:text-mkt-fg-tertiary"
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

/**
 * A fact that has to come from `lib/legal.ts` and has not been supplied yet.
 *
 * Rendered as visibly missing rather than as a plausible-looking blank, so a
 * reader can tell the difference between a clause that says nothing and a
 * clause whose subject was never filled in.
 */
export function Missing({ label }: { label: string }) {
  return (
    <span className="rounded-[0.2rem] bg-mkt-subtle px-1.5 py-0.5 font-mkt-mono text-[0.85em] text-mkt-fg-tertiary">
      [{label} — to be confirmed]
    </span>
  )
}

/** Renders a confirmed legal fact, or marks it as outstanding. Never blank. */
export function Fact({ value, label }: { value: string; label: string }) {
  return value && value !== 'UNCONFIRMED' ? <>{value}</> : <Missing label={label} />
}
