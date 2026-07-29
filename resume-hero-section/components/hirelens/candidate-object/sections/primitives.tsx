import * as React from 'react'

/**
 * Shared presentational primitives for Candidate sections — one implementation,
 * reused by every section so the visual language never drifts. Pure; no data.
 */
export function Section({
  title,
  children,
  compact,
}: {
  title: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <section className={compact ? 'flex flex-col gap-2' : 'flex flex-col gap-3'}>
      {/* `hl-label` already owns the uppercase + tracking, so a compact section
          heading can no longer drift from the table headers and field labels
          that use the same step elsewhere. */}
      <h2 className={compact ? 'hl-label text-hl-fg-tertiary' : 'hl-h3 text-hl-fg'}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** A calm, readable list — one point per line (not a dense bullet stack). */
export function PointList({ points }: { points: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {points.map((point, index) => (
        <li key={index} className="hl-body flex gap-2.5 text-hl-fg-secondary">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-hl-border-strong" aria-hidden />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  )
}

export function SkillChips({ label, skills, tone }: { label: string; skills: string[]; tone: string }) {
  if (skills.length === 0) return null
  return (
    <div className="flex flex-col gap-1.5">
      <span className="hl-label text-hl-fg-tertiary">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => (
          <span key={skill} className={`rounded-hl-sm px-2 py-0.5 hl-caption font-hl-mono ${tone}`}>
            {skill}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Honest "pending analysis" note — never blank fields, never a fake value. */
export function PendingAnalysis() {
  return (
    <p className="hl-body text-hl-fg-secondary">
      This candidate hasn’t been analyzed yet — the verdict and evidence appear once HireLens
      ranks them against this role.
    </p>
  )
}
