'use client'

import * as React from 'react'
import { PRICING_FAQS } from '@/lib/marketing/pricing-faqs'

/**
 * Pricing FAQ.
 *
 * The questions and answers live in `lib/marketing/pricing-faqs.ts`, not here.
 * They used to be a module constant in this file and the `FAQPage` structured
 * data imported them from it — which compiled, typechecked, and then failed the
 * production build: a value imported from a `'use client'` module into a server
 * component is a client reference proxy, not the array.
 *
 * They are shared rather than copied because a FAQ that answers one thing to a
 * reader and another to a machine is worse than having no structured data at
 * all.
 *
 * Same accordion behaviour as the homepage FAQ — real React state, one panel at
 * a time, keyboard-operable.
 */
export function PricingFaq() {
  const [open, setOpen] = React.useState<number | null>(0)

  return (
    <section id="faq" className="mx-auto max-w-3xl bg-mkt-canvas px-8 py-28">
      <h2 className="mb-12 text-center font-mkt-display text-3xl text-mkt-fg">
        Before you decide
      </h2>
      <div className="border-t border-mkt-border">
        {PRICING_FAQS.map((faq, index) => {
          const isOpen = open === index
          const panelId = `pricing-faq-panel-${index}`
          const buttonId = `pricing-faq-button-${index}`
          return (
            <div key={faq.question} className="border-b border-mkt-border py-5">
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex w-full items-start justify-between gap-6 text-left"
                >
                  <span className="mkt-body-lg text-mkt-fg">{faq.question}</span>
                  <span
                    className={`material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-mkt-fg-tertiary transition-transform duration-200 ${
                      isOpen ? 'rotate-45' : ''
                    }`}
                    aria-hidden="true"
                  >
                    add
                  </span>
                </button>
              </h3>
              {/* Present in the DOM but hidden when closed, so the answers are
                  findable with the browser's own search and readable without
                  JavaScript having run. */}
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!isOpen}
                className="pt-3 pr-10"
              >
                <p className="mkt-body-sm text-mkt-fg-secondary">{faq.answer}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
