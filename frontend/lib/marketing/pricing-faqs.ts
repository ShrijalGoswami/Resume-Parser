import { LIMITS, PLAN_LABELS } from '@/components/hirelens/lib/entitlements/catalog'

/**
 * The pricing FAQ, as data.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS NOT INSIDE THE COMPONENT ANY MORE.
 *
 * It was, and the `FAQPage` structured data imported it from there. That
 * compiled and typechecked and then failed the production build with
 * `PRICING_FAQS.map is not a function` — because `pricing-faq.tsx` carries
 * `'use client'`, and a value imported from a client module into a SERVER
 * component is a client reference proxy, not the array.
 *
 * A plain module has no boundary to cross, so the rendered page and the schema
 * read the same object. That was the whole point of exporting it: a FAQ that
 * answers one thing to a reader and another to a machine is worse than having
 * no structured data at all.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every answer here is a behaviour the system actually implements, and most
 * exist because the behaviour is unusual enough that a visitor would reasonably
 * assume the opposite. That is the test for whether a question belongs: it
 * earns its place by removing a real doubt, not by filling a section.
 *
 * The two figures are read from the catalog rather than typed, so a limit
 * change cannot leave a stale promise sitting in an answer — or in the schema.
 */
const FREE_RESUMES = LIMITS.free.resumes
const PLUS_RESUMES = LIMITS.plus.resumes

export interface FaqEntry {
  question: string
  answer: string
}

export const PRICING_FAQS: FaqEntry[] = [
  {
    question: 'What counts as a résumé?',
    answer: `Each résumé you analyse counts once. Re-uploading the same file does not count again — we match on the file’s contents, not its name, so "resume.pdf" from two different candidates counts twice and the same CV uploaded twice counts once. Analyses that fail are never counted.`,
  },
  {
    question: `Do the ${FREE_RESUMES} free résumés reset each month?`,
    answer: `No. Free includes ${FREE_RESUMES} résumés for the lifetime of your organization — it is a trial of the real analysis, not a monthly allowance. Paid plans renew at the start of each calendar month: ${PLAN_LABELS.plus} gives you ${PLUS_RESUMES} a month, and ${PLAN_LABELS.pro} and ${PLAN_LABELS.enterprise} are unlimited.`,
  },
  {
    question: 'What happens when I hit the limit?',
    answer:
      'Analysis stops and we tell you before you upload, not after. You keep everything already in Hirevo — candidates, decisions, notes and the ledger stay readable and exportable. Nothing is deleted and nothing is held hostage.',
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
    question: 'We already use Hirevo. Does anything change?',
    answer:
      'No. Every organization created before plans launched keeps everything it had, with no limits, for as long as the account exists. Nothing is being taken away from anyone who already had it — you will see no locks and no meters.',
  },
]
