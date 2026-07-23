import { focusStrokeVar } from '../lib/focus-scale'

/**
 * Fit-score ring (Stitch Dossier header). A calm circular readout on the Focus
 * scale — number in the center, arc colored by band. Real score only.
 */
export function ScoreRing({ score, size = 56 }: { score: number | null; size?: number }) {
  const stroke = 4
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score ?? 0)) / 100

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-hl-border-subtle"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={focusStrokeVar(score)}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-hl-mono text-sm tabular-nums text-hl-fg">
        {score ?? '—'}
      </span>
    </div>
  )
}
