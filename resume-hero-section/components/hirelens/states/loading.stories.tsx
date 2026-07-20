import type { Meta, StoryObj } from '@storybook/react-vite'
import { LoadingLines, LoadingScreen } from './loading'

const meta: Meta = { title: 'States/Loading' }
export default meta
type Story = StoryObj

export const Lines: Story = {
  render: () => (
    <div className="max-w-sm">
      <LoadingLines lines={4} />
    </div>
  ),
}

export const Screen: Story = { render: () => <LoadingScreen label="Loading your workspace" /> }
