import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScoreMeter } from './score-meter'

const meta = {
  title: 'Domain/ScoreMeter',
  component: ScoreMeter,
  tags: ['autodocs'],
  args: { score: 88 },
} satisfies Meta<typeof ScoreMeter>

export default meta
type Story = StoryObj<typeof meta>

export const InFocus: Story = { args: { score: 90 } }

export const Bands: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {[92, 78, 62, 48, 30].map((score) => (
        <ScoreMeter key={score} score={score} />
      ))}
    </div>
  ),
}
