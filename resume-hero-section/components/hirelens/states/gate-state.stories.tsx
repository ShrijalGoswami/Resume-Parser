import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileWarning } from 'lucide-react'
import { GateState } from './gate-state'
import { Button } from '../ui/button'

const meta: Meta = { title: 'States/GateState' }
export default meta
type Story = StoryObj

export const Plan: Story = {
  render: () => (
    <div className="max-w-lg">
      <GateState
        reason="plan"
        title="Executive Reports is available on the Growth plan."
        action={<Button variant="primary">Upgrade</Button>}
      />
    </div>
  ),
}

export const Permission: Story = {
  render: () => (
    <div className="max-w-lg">
      <GateState
        reason="permission"
        icon={FileWarning}
        title="You need Recruiter access to view this."
        action={<Button variant="secondary">Request access</Button>}
      />
    </div>
  ),
}
