import * as React from 'react'
import { scoreBand, confidenceBand } from '../../lib/format'
import type { CandidateModel } from '../model'

/**
 * The decision facts, stated once, at the top of the case file.
 *
 * THE AUDIT'S FINDING WAS NOT THAT THESE NUMBERS WERE WRONG — it was that they
 * were buried. Fit, ATS and the ranking position lived in the analysis and
 * reached the reader either late (deep in a scroll) or not at all, so the page
 * asked for a decision without putting the decision's inputs in front of it.
 *
 * Every value here is the backend's own, rounded for display and nothing else.
 * Each one is a NUMERAL FIRST (mono, per V2 §4) with its meaning spelled out in
 * words beside it — the band label, the confidence phrase, the position. A
 * reader who cannot see colour, or who desaturates the screen, loses nothing:
 * that is V2 §21 and it is the reason none of these tiles is colour-coded.
 */
function Fact({
  label,
  value,
  meaning,
  emphasis,
}: {
  label: string
  value: string
  meaning?: string
  emphasis?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="hl-label text-hl-fg-tertiary">{label}</span>
      <span className={emphasis ? 'hl-mono text-2xl text-hl-fg' : 'hl-mono text-lg text-hl-fg'}>
        {value}
      </span>
      {meaning ? <span className="hl-caption text-hl-fg-secondary">{meaning}</span> : null}
    </div>
  )
}

/** One line of the score arithmetic: what it is, what it earned, out of what. */
function ComponentRow({ name, earned, max }: { name: string; earned: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (earned / max) * 100)) : 0
  return (
    <li className="flex items-center gap-3">
      <span className="hl-body min-w-0 flex-1 truncate text-hl-fg-secondary">{name}</span>
      {/* The bar is secondary and deliberately neutral: the numeral beside it
          is the signal (V2 §3.8), so the row survives desaturation. */}
      <span
        className="h-1 w-20 shrink-0 overflow-hidden rounded-full bg-hl-muted"
        aria-hidden
      >
        <span
          className="block h-full rounded-full bg-hl-fg-tertiary"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="hl-mono w-16 shrink-0 text-right text-hl-fg">
        {Math.round(earned)}
        <span className="text-hl-fg-tertiary">/{Math.round(max)}</span>
      </span>
    </li>
  )
}

export function CandidateScorecard({ model }: { model: CandidateModel }) {
  if (!model.hasAnalysis) return null

  const fit = model.confidence
  const band = fit !== null ? scoreBand(fit) : null
  const conf = fit !== null ? confidenceBand(fit) : null

  const atsRows: Array<[string, number]> = model.atsBreakdown
    ? [
        ['Technical skills', model.atsBreakdown.technical_skills],
        ['Projects', model.atsBreakdown.projects],
        ['Experience', model.atsBreakdown.experience],
        ['Education', model.atsBreakdown.education],
        ['Impact', model.atsBreakdown.impact],
      ]
    : []

  return (
    <section
      aria-label="Decision facts"
      className="flex flex-col gap-5 rounded-hl-lg border border-hl-border bg-hl-subtle p-5"
    >
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        {fit !== null ? (
          <Fact label="Fit" value={String(fit)} meaning={band?.label} emphasis />
        ) : null}
        {model.atsScore !== null ? (
          <Fact label="ATS Readiness" value={String(model.atsScore)} meaning="résumé legibility, not job match" />
        ) : null}
        {model.rank !== null ? (
          <Fact label="Rank" value={`#${model.rank}`} meaning="in this analysis run" />
        ) : null}
        {model.yearsExperience !== null ? (
          <Fact
            label="Experience"
            value={`${model.yearsExperience}`}
            meaning={model.yearsExperience === 1 ? 'year' : 'years'}
          />
        ) : null}
        {conf ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="hl-label text-hl-fg-tertiary">Confidence</span>
            {/* Stated in words, not as a colour or a bare percentage — the
                honest low/medium/high semantics the product already uses. */}
            <span className="hl-body text-hl-fg">{conf.label}</span>
            <span className="hl-caption text-hl-fg-secondary">
              How sure the analysis is of this read
            </span>
          </div>
        ) : null}
      </div>

      {model.scoreComponents.length > 0 || atsRows.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 border-t border-hl-border-subtle pt-5 md:grid-cols-2">
          {model.scoreComponents.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="hl-label text-hl-fg-tertiary">How the fit score was reached</h3>
              <ul className="flex flex-col gap-2">
                {model.scoreComponents.map((component) => (
                  <ComponentRow
                    key={component.key || component.name}
                    name={component.name}
                    earned={component.earned}
                    max={component.max}
                  />
                ))}
              </ul>
            </div>
          ) : null}

          {atsRows.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h3 className="hl-label text-hl-fg-tertiary">ATS breakdown</h3>
              <ul className="flex flex-col gap-2">
                {atsRows.map(([name, value]) => (
                  <li key={name} className="flex items-center justify-between gap-3">
                    <span className="hl-body truncate text-hl-fg-secondary">{name}</span>
                    <span className="hl-mono shrink-0 text-hl-fg">{Math.round(value)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
