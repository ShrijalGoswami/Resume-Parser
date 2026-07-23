/**
 * The Focus scale (Design Bible) — the shared fit-score → label + color mapping
 * used wherever a candidate score is shown (Triage, Deep Review, …). Number +
 * label + color, never color alone.
 */
export interface FocusBand {
  label: string
  /** Text color utility for the label/number. */
  text: string
  /** Background/fill color utility for a bar or ring. */
  bar: string
}

export function focusBand(score: number | null): FocusBand {
  if (score == null) return { label: '—', text: 'text-hl-fg-tertiary', bar: 'bg-hl-border-strong' }
  if (score >= 85) return { label: 'In focus', text: 'text-hl-score-infocus', bar: 'bg-hl-score-infocus' }
  if (score >= 70) return { label: 'Sharp', text: 'text-hl-score-sharp', bar: 'bg-hl-score-sharp' }
  if (score >= 55) return { label: 'Legible', text: 'text-hl-score-legible', bar: 'bg-hl-score-legible' }
  if (score >= 40) return { label: 'Soft', text: 'text-hl-score-soft', bar: 'bg-hl-score-soft' }
  return { label: 'Out of focus', text: 'text-hl-score-outfocus', bar: 'bg-hl-score-outfocus' }
}

/** Focus-scale color as a raw CSS var (for SVG stroke etc. where utilities don't apply). */
export function focusStrokeVar(score: number | null): string {
  if (score == null) return 'var(--hl-border-strong)'
  if (score >= 85) return 'var(--hl-score-infocus)'
  if (score >= 70) return 'var(--hl-score-sharp)'
  if (score >= 55) return 'var(--hl-score-legible)'
  if (score >= 40) return 'var(--hl-score-soft)'
  return 'var(--hl-score-outfocus)'
}
