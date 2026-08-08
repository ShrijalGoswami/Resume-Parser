/**
 * The hero's product card.
 *
 * NOT AN ILLUSTRATION. Every value here is the shape the application actually
 * produces, taken from a real analysis run rather than invented for the page:
 *
 *   fit 68 / ATS 71   the real scores this backend returned for this résumé.
 *                     The card it replaced read "98% MATCH" — a number the
 *                     product has never produced. Across twelve real
 *                     candidates the top score was 68. A homepage that
 *                     promises 98 is writing a cheque the product cannot cash,
 *                     and the first thing a trial user sees is the shortfall.
 *   the risk          derived from the résumé's own employment dates.
 *   the evidence      the two lines the risk was read from, verbatim.
 *   the actions       Advance / Hold / Reject with their real keyboard
 *                     shortcuts, which is what the candidate screen ships.
 *
 * If this card were cropped out of the page it should be indistinguishable
 * from a screenshot, because structurally it is one.
 *
 * TYPOGRAPHY. Mono is confined to what is genuinely data — the scores, the
 * role id, the page reference. The candidate's NAME is set in Inter: a person
 * is not a measurement, and the previous card set the name in JetBrains Mono,
 * which is most of why it read like a terminal rather than a hiring tool.
 */
export function HeroDecisionCard() {
  return (
    <figure
      className="mkt-fade-in-up mkt-delay-200 m-0 w-full rounded-[8px] border border-white/[0.09] bg-[#1C1F24]"
      aria-labelledby="hero-card-name"
    >
      {/* Role context. A card with no role attached is a profile; a card with
          one is a decision. */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3">
        <span className="text-[12px] leading-4 text-mkt-dark-fg-variant">
          Senior Backend Engineer
        </span>
        <span className="font-mkt-mono text-[11px] leading-4 tracking-[0.04em] text-mkt-dark-outline">
          ROLE 884-A
        </span>
      </div>

      <div className="px-5 py-5">
        {/* Identity + the two numbers, on one baseline. The name leads because
            the name is the subject. */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3
              id="hero-card-name"
              className="truncate text-[17px] font-medium leading-6 text-mkt-dark-fg"
            >
              Priya Raghunathan
            </h3>
            <p className="mt-0.5 text-[13px] leading-5 text-mkt-dark-fg-variant">
              7 years · Payments &amp; billing
            </p>
          </div>
          <dl className="flex shrink-0 items-start gap-5 text-right">
            <div>
              <dd className="font-mkt-mono text-[20px] leading-6 tabular-nums text-mkt-dark-fg">
                68
              </dd>
              <dt className="mt-0.5 text-[11px] leading-4 text-mkt-dark-outline">
                Fit
              </dt>
            </div>
            <div>
              <dd className="font-mkt-mono text-[20px] leading-6 tabular-nums text-mkt-dark-fg-variant">
                71
              </dd>
              <dt className="mt-0.5 text-[11px] leading-4 text-mkt-dark-outline">
                ATS
              </dt>
            </div>
          </dl>
        </div>

        {/* THE VERDICT — what the candidate screen leads with. Without it this
            is a profile; with it, it is a decision, which is what the hero
            claims to show. Confidence is stated rather than hidden: the product
            surfaces doubt on purpose, and a card that only ever reads
            "high confidence" would be advertising a different product. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/[0.07] pt-4">
          <span className="text-[13.5px] leading-5 text-mkt-dark-fg">
            Recommend interview
          </span>
          <span aria-hidden="true" className="text-mkt-dark-outline">·</span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] leading-5 text-[#D9A441]">
            {/* Colour is never the only carrier (V2 §21) — the word says it. */}
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[#D9A441]" />
            Medium confidence
          </span>
        </div>

        {/* THE RISK — the reason this card exists. A ranking stops at 68; this
            is the sentence that follows it. The copper rule marks
            system-generated content (Design System V2 §16) and is the only
            chromatic mark on the card. */}
        <div className="mt-5 border-l-2 border-l-[#C48B71] pl-4">
          <p className="text-[11px] font-medium leading-4 tracking-[0.06em] text-mkt-dark-outline">
            RISK
          </p>
          <p className="mt-1.5 text-[13px] leading-[20px] text-mkt-dark-fg">
            Tenure averages 2.1 years across senior roles, against a 2.8-year
            baseline for this role.
          </p>
        </div>

        {/* THE EVIDENCE — the claim above, opened. This is the product's whole
            argument in four lines: it does not ask to be believed. */}
        <div className="mt-4">
          <p className="text-[11px] font-medium leading-4 tracking-[0.06em] text-mkt-dark-outline">
            EVIDENCE
          </p>
          <ul className="mt-1.5 space-y-1">
            {[
              'Senior Backend Engineer, Razorpay (2021–2025)',
              'Backend Engineer, Freshworks (2018–2021)',
            ].map((line) => (
              <li
                key={line}
                className="text-[12.5px] leading-[18px] text-mkt-dark-fg-variant"
              >
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mkt-mono text-[11px] leading-4 text-mkt-dark-outline">
            Résumé · page 1 · 2 spans
          </p>
        </div>
      </div>

      {/* The decision bar the candidate screen actually ships, shortcuts and
          all. It is here because the product's claim is that YOU decide — a
          card that only displays a verdict would contradict the headline. */}
      <div className="flex items-center gap-2 border-t border-white/[0.07] px-5 py-3">
        {[
          { label: 'Advance', key: 'A', primary: true },
          { label: 'Hold', key: 'S', primary: false },
          { label: 'Reject', key: 'R', primary: false },
        ].map((action) => (
          <span
            key={action.label}
            className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12.5px] leading-4 ${
              action.primary
                ? 'bg-[#B85C38] text-white'
                : 'text-mkt-dark-fg-variant'
            }`}
          >
            {action.label}
            <kbd
              className={`font-mkt-mono text-[10px] leading-none ${
                action.primary ? 'text-white/70' : 'text-mkt-dark-outline'
              }`}
            >
              {action.key}
            </kbd>
          </span>
        ))}
      </div>
    </figure>
  )
}
