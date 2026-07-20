import type { Meta, StoryObj } from '@storybook/react-vite'
import { RiskRow } from './risk-row'
import { Card } from '../ui/card'
import type { Forecast } from '@/types/prediction'

const forecasts: Forecast[] = [
  {
    type: 'time_to_fill',
    target: 'Data Engineering',
    unit: 'count',
    probability: 0.35,
    value: 42,
    confidence: 0.7,
    summary: 'At deadline risk — thin senior pool and slow screening.',
    evidence: ['3 open weeks', '2 senior candidates'],
    factors: [{ name: 'senior pool', impact: 'negative', detail: 'thin' }],
    historical_comparison: 'slower than last quarter',
    alternatives: {},
  },
  {
    type: 'offer_acceptance',
    target: 'Offer acceptance',
    unit: 'probability',
    probability: 0.62,
    value: null,
    confidence: 0.55,
    summary: 'Forecast down 8% versus last quarter.',
    evidence: ['2 recent declines'],
    factors: [],
    historical_comparison: 'down 8%',
    alternatives: {},
  },
]

const meta: Meta = { title: 'Domain/RiskRow' }
export default meta
type Story = StoryObj

export const List: Story = {
  render: () => (
    <Card className="max-w-2xl px-4">
      {forecasts.map((forecast, index) => (
        <RiskRow key={index} forecast={forecast} onAsk={() => {}} />
      ))}
    </Card>
  ),
}
