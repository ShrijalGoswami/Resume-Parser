import { Badge } from "@/components/ui/badge"

/** Tailwind classes for a recommendation category chip. */
export function recommendationStyle(rec: string): string {
  const r = (rec || "").toLowerCase()
  if (r.includes("strongly")) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (r.includes("recommend") && !r.includes("not")) return "bg-blue-50 text-blue-700 border-blue-200"
  if (r.includes("consider") || r.includes("review")) return "bg-amber-50 text-amber-700 border-amber-200"
  if (r.includes("not")) return "bg-rose-50 text-rose-700 border-rose-200"
  return "bg-muted text-muted-foreground border-border"
}

export function RecommendationBadge({ rec }: { rec: string }) {
  if (!rec) return null
  return (
    <Badge variant="outline" className={`whitespace-nowrap font-semibold ${recommendationStyle(rec)}`}>
      {rec}
    </Badge>
  )
}

/** Text color for a 0-100 score. */
export function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-600"
  if (score >= 70) return "text-blue-600"
  if (score >= 50) return "text-amber-600"
  return "text-rose-600"
}

/** Stroke color (hex) for a 0-100 score, used by the SVG ring. */
export function scoreStroke(score: number): string {
  if (score >= 85) return "#059669"
  if (score >= 70) return "#2563eb"
  if (score >= 50) return "#d97706"
  return "#e11d48"
}

/** Circular score ring rendered with inline SVG (no chart dependency). */
export function ScoreRing({
  score,
  size = 120,
  stroke = 9,
  label,
}: {
  score: number
  size?: number
  stroke?: number
  label?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circumference - (clamped / 100) * circumference
  const color = scoreStroke(score)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-black tracking-tight ${scoreColor(score)}`} style={{ fontSize: size * 0.3 }}>
          {Math.round(clamped)}
        </span>
        {label && <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

/** Horizontal labeled progress bar (earned / max). */
export function ScoreBar({
  label,
  earned,
  max,
  colorClass = "bg-primary",
}: {
  label: string
  earned: number
  max: number
  colorClass?: string
}) {
  const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground tabular-nums">
          {earned}
          <span className="text-muted-foreground font-medium"> / {max}</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
        <div className={`h-full rounded-full ${colorClass} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
