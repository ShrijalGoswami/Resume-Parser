import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConfidencePill } from './confidence-pill'

const meta = {
  title: 'Domain/ConfidencePill',
  component: ConfidencePill,
  tags: ['autodocs'],
  args: { value: 0.9 },
} satisfies Meta<typeof ConfidencePill>

export default meta
type Story = StoryObj<typeof meta>

export const High: Story = { args: { value: 0.9 } }
export const Medium: Story = { args: { value: 0.6 } }
export const Low: Story = { args: { value: 0.3 } }
export const All: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <ConfidencePill value={0.9} />
      <ConfidencePill value={0.6} />
      <ConfidencePill value={0.3} />
    </div>
  ),
}
