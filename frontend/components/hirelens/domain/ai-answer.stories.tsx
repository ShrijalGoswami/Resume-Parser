import type { Meta, StoryObj } from '@storybook/react-vite'
import { AIAnswer } from './ai-answer'
import { Button } from '../ui/button'

const meta: Meta = { title: 'Domain/AIAnswer' }
export default meta
type Story = StoryObj

export const Brief: Story = {
  render: () => (
    <div className="max-w-xl">
      <AIAnswer
        confidence={0.8}
        sources={[{ label: 'Aarav S.' }, { label: 'JD: "payments"' }, { label: 'memory: 2023' }]}
        reasoning={
          <ul className="list-disc pl-4">
            <li>Data Eng has 3 open weeks and a thin senior pool.</li>
            <li>Senior Backend gained 2 high-fit candidates overnight.</li>
          </ul>
        }
        actions={
          <>
            <Button variant="ai" size="sm">
              Shortlist top 5
            </Button>
            <Button variant="ghost" size="sm">
              Dismiss
            </Button>
          </>
        }
      >
        <p className="hl-body-medium">Two roles moved overnight.</p>
        <p className="mt-1 text-hl-fg-secondary">
          Senior Backend gained two high-fit candidates; Data Engineering is at
          deadline risk.
        </p>
      </AIAnswer>
    </div>
  ),
}

export const Minimal: Story = {
  render: () => (
    <div className="max-w-xl">
      <AIAnswer confidence={0.6}>
        <p>A concise grounded answer with a confidence pill and no actions.</p>
      </AIAnswer>
    </div>
  ),
}
