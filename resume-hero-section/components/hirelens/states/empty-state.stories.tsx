import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus, Search, Users } from 'lucide-react'
import { EmptyState } from './empty-state'
import { Card } from '../ui/card'
import { Button } from '../ui/button'

const meta: Meta = { title: 'States/EmptyState' }
export default meta
type Story = StoryObj

export const FirstRun: Story = {
  render: () => (
    <Card className="max-w-lg">
      <EmptyState
        variant="first-run"
        icon={Users}
        title="Let's fill your first role"
        description="Create a role and start evaluating candidates."
        action={
          <Button variant="primary">
            <Plus /> Create a role
          </Button>
        }
      />
    </Card>
  ),
}

export const ZeroResults: Story = {
  render: () => (
    <Card className="max-w-lg">
      <EmptyState
        variant="zero-results"
        icon={Search}
        title="No matches"
        description="Try broadening your filters."
        action={<Button variant="secondary">Clear filters</Button>}
      />
    </Card>
  ),
}
