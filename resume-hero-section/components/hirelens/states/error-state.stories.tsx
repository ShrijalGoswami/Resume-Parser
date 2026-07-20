import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorState } from './error-state'
import { Card } from '../ui/card'

const meta: Meta = { title: 'States/ErrorState' }
export default meta
type Story = StoryObj

export const Inline: Story = {
  render: () => (
    <Card className="max-w-lg p-4">
      <ErrorState
        variant="inline"
        title="Analytics didn't load"
        description="The metrics service is unavailable."
        onRetry={() => {}}
      />
    </Card>
  ),
}

export const Route: Story = {
  render: () => <ErrorState variant="route" requestId="REQ-2f9a41" onRetry={() => {}} />,
}
