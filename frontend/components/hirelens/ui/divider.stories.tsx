import type { Meta, StoryObj } from '@storybook/react-vite'
import { Divider } from './divider'

const meta = {
  title: 'Primitives/Divider',
  component: Divider,
  tags: ['autodocs'],
} satisfies Meta<typeof Divider>

export default meta
type Story = StoryObj<typeof meta>

export const Horizontal: Story = { render: () => <div className="w-64"><Divider /></div> }
export const WithLabel: Story = {
  render: () => (
    <div className="w-64">
      <Divider label="or" />
    </div>
  ),
}
export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-3">
      <span className="hl-small">Left</span>
      <Divider orientation="vertical" />
      <span className="hl-small">Right</span>
    </div>
  ),
}
