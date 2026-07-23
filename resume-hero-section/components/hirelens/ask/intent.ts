import type { Forecast } from '@/types/prediction'

/**
 * Lightweight, transparent intent detection for Ask (UX Spec §9). The backend
 * copilot does the real routing; this only decides whether to surface the
 * inline What-if simulator beneath an answer, so it stays conservative and
 * keyword-based rather than pretending to be a classifier.
 */
export function isWhatIf(text: string): boolean {
  const t = text.toLowerCase()
  if (/\bwhat if\b|\bwhat happens if\b|\bsimulate\b|\bscenario\b|\bforecast\b/.test(t)) return true
  return /\bif (i|we|you)\b[^.?]*\b(raise|increase|reduce|lower|cut|add|open|expand|hire|drop)\b/.test(
    t,
  )
}

/** Map a natural-language what-if to the closest available forecast type. */
export function guessForecast(query: string, available: string[]): string {
  const t = query.toLowerCase()
  const rules: Array<[RegExp, string]> = [
    [/time.?to.?fill|complete|deadline|on time|fill .*role/, 'hiring_completion'],
    [/offer|accept/, 'offer_acceptance'],
    [/cost|budget|spend|salary/, 'hiring_cost'],
    [/capacity|recruiter|bandwidth|workload/, 'recruiter_capacity'],
    [/skill|shortage|talent gap/, 'skill_shortage'],
    [/dropout|drop.?off|attrition|ghost/, 'candidate_dropout'],
    [/interview/, 'interview_success'],
    [/delay|slip|behind/, 'campaign_delay_risk'],
    [/health|pipeline/, 'pipeline_health'],
  ]
  for (const [re, type] of rules) {
    if (re.test(t) && available.includes(type)) return type
  }
  return available[0] ?? 'hiring_completion'
}

/** Format a forecast's headline value by unit (mirrors the legacy predictions view). */
export function formatForecastValue(forecast: Forecast): string {
  if (forecast.unit === 'probability' || forecast.unit === 'index') {
    return `${Math.round((forecast.probability || 0) * 100)}%`
  }
  if (forecast.unit === 'currency') {
    return `$${(forecast.value || 0).toLocaleString()}`
  }
  if (forecast.value === null) return '—'
  return `${forecast.value}`
}

/** Turn a snake_case lever/forecast key into a human label. */
export function humanize(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** First-run example prompts — two per mode (brain · what-if · agent). */
export const ASK_EXAMPLES: ReadonlyArray<{ mode: string; prompt: string }> = [
  { mode: 'Org brain', prompt: 'What did we learn from last year’s backend hires?' },
  { mode: 'Org brain', prompt: 'What’s our stance on remote work?' },
  { mode: 'What-if', prompt: 'What happens to time-to-fill if I add 2 recruiters?' },
  { mode: 'What-if', prompt: 'What if we raise senior salary by 15%?' },
  { mode: 'Agent', prompt: 'What needs my attention right now?' },
  { mode: 'Agent', prompt: 'Which candidates should I shortlist next?' },
]
