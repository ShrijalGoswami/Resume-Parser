import * as React from 'react'
import { Badge, type BadgeProps } from '../../ui/badge'

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="hl-h3 mb-2">{title}</h3>
      {children}
    </section>
  )
}

export function SkillList({
  label,
  skills,
  variant,
}: {
  label: string
  skills: string[]
  variant: NonNullable<BadgeProps['variant']>
}) {
  if (!skills || skills.length === 0) return null
  return (
    <div className="flex flex-wrap items-start gap-1">
      {label ? (
        <span className="hl-caption w-16 shrink-0 pt-0.5 text-hl-fg-tertiary">{label}</span>
      ) : null}
      {skills.map((skill) => (
        <Badge key={skill} variant={variant}>
          {skill}
        </Badge>
      ))}
    </div>
  )
}

/** Horizontal factor bars (0–100), e.g. the ATS breakdown. */
export function FactorBars({ factors }: { factors: { label: string; value: number }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {factors.map((factor) => {
        const pct = Math.max(0, Math.min(100, Math.round(factor.value)))
        return (
          <div key={factor.label} className="flex items-center gap-3">
            <span className="hl-small w-32 shrink-0 text-hl-fg-secondary">{factor.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-hl-muted">
              <div className="h-full rounded-full bg-hl-accent" style={{ width: `${pct}%` }} />
            </div>
            <span className="hl-mono w-8 text-right text-[13px]">{pct}</span>
          </div>
        )
      })}
    </div>
  )
}

export function EmptyHint({ text }: { text: string }) {
  return <p className="hl-small py-8 text-center text-hl-fg-tertiary">{text}</p>
}
