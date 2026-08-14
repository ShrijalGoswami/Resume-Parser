import { TrendingUp, FileText } from 'lucide-react'
import { Card } from '../ui/card'
import { EmptyState } from '../states/empty-state'

/**
 * Forecast / Report lenses (UX Spec §7.6–§7.7). No per-role backend exists yet
 * (forecasts + the report generator are org-wide), so rather than fabricate a
 * role-scoped view these render a calm, honest deferred state. They light up
 * with no redesign once the backend accepts a campaign filter.
 */
const content = {
  forecast: {
    icon: TrendingUp,
    title: 'Per-role forecasting is coming soon',
    description:
      "Forecasts are computed across your whole organization today. Role-scoped predictions arrive once the backend exposes per-role forecasting.",
  },
  report: {
    icon: FileText,
    title: 'Per-role reports are coming soon',
    description:
      'The report generator produces an org-wide executive briefing today. Role-scoped reports arrive once the backend accepts a role filter.',
  },
} as const

export function DeferredLens({ kind }: { kind: 'forecast' | 'report' }) {
  const item = content[kind]
  return (
    <Card className="mt-2">
      <EmptyState icon={item.icon} title={item.title} description={item.description} />
    </Card>
  )
}
