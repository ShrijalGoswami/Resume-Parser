'use client'

import * as React from 'react'
import { LIMITS, PLAN_LABELS } from '@/components/hirelens/lib/entitlements/catalog'

/**
 * Pricing FAQ.
 *
 * Every answer here is a behaviour the system actually implements, and most of
 * them exist because the behaviour is unusual enough that a visitor would
 * reasonably assume the opposite. That is the test for whether a question
 * belongs on this page: it earns its place by removing a real doubt, not by
 * filling a section.
 *
 * The two numbers that appear are read from the catalog rather than typed, so
 * a limit change cannot leave a stale promise sitting in an answer.
 *
 * Same accordion behaviour as the homepage FAQ — real React state, one panel
 * at a time, keyboard-operable.
 */
const FREE_RESUMES = LIMITS.free.resumes
const PLUS_RESUMES = LIMITS.plus.resumes

const FAQS: { question: string; answer: string }[] = [
  {
    question: 'What counts as a résumé?',
    answer: `Each résumé you analyse counts once. Re-uploading the same file does not count again — we match on the file's contents, not its name, so "resume.pdf" from two different candidates counts twice and the same CV uploaded twice counts once. Analyses that fail are never counted.`,
  },
  {
    question: `Do the ${FREE_RESUMES} free résumés reset each month?`,
    answer: `No. Free includes ${FREE_RESUMES} résumés for the lifetime of your organization — it is a trial of the real analysis, not a monthly allowance. Paid plans renew at the start of each calendar month: ${PLAN_LABELS.plus} gives you ${PLUS_RESUMES} a month, and ${PLAN_LABELS.pro} and ${PLAN_LABELS.enterprise} are unlimited.`,
  },
  {
    question: 'What happens when I hit the limit?',
    answer:
      'Analysis stops and we tell you before you upload, not after. You keep everything already in HireLens — candidates, decisions, notes and the ledger stay readable and exportable. Nothing is deleted and nothing is held hostage.',
  },
  {
    question: 'Can I change plans later?',
    answer:
      'Yes. Self-serve upgrade arrives with payments; until then a plan change takes one message to us and applies immediately. Nothing you have already analysed is affected by moving between plans.',
  },
  {
    question: 'What happens if a payment fails?',
    answer:
      'Your team keeps working. A failed payment is a billing conversation, not a reason to lock a hiring team out of its pipeline mid-week, so access continues while we sort it out with you.',
  },
  {
    question: 'Do you train AI models on our candidates?',
    answer:
      'No. Your résumés, your decisions and your notes are used to serve your organization and nothing else. Enterprise can route AI through its own provider keys, in which case the data never touches our AI accounts at all.',
  },
  {
    question: 'What counts as a team member?',
    answer: `Anyone with a seat in your organization, whatever their role — including people who only read. Seats are how team size is priced; roles decide what each person can do, and viewers and interviewers cost the same as recruiters.`,
  },
  {
    question: 'We already use HireLens. Does anything change?',
    answer:
      'No. Every organization created before plans launched keeps everything it had, with no limits, for as long as the account exists. Nothing is being taken away from anyone who already had it — you will see no locks and no meters.',
  },
]

export function PricingFaq() {
  const [open, setOpen] = React.useState<number | null>(0)

  return (
    <section id="faq" className="mx-auto max-w-3xl bg-mkt-canvas px-8 py-28">
      <h2 className="mb-12 text-center font-mkt-display text-3xl text-mkt-fg">
        Before you decide
      </h2>
      <div className="border-t border-mkt-border">
        {FAQS.map((faq, index) => {
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
