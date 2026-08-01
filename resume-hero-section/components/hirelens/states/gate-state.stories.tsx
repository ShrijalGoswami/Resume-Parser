import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileWarning } from 'lucide-react'
import { GateState } from './gate-state'
import { Button } from '../ui/button'

/**
 * The three shapes of "you can't do this yet".
 *
 * The copy below is written by hand ONLY because a story has no org context to
 * derive from. In the product it is composed by the catalog-aware components in
 * `components/hirelens/entitlements/` — see their stories for the real thing.
 * Never copy these strings into a screen.
 *
 * (The `plan` story used to name a "Growth plan", which has never existed in
 * this product. Corrected 1 Aug 2026.)
 */
const meta: Meta = { title: 'States/GateState' }
export default meta
type Story = StoryObj

export const Plan: Story = {
  render: () => (
    <div className="max-w-lg">
      <GateState
        reason="plan"
        title="Executive Reports is available on the Pro plan."
        description="Narrative hiring reports for stakeholders."
        action={<Button variant="primary">Upgrade to Pro</Button>}
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

export const Quota: Story = {
  render: () => (
    <div className="max-w-lg">
      <GateState
        reason="quota"
        title="You've used all 2 of your résumés."
        description="Upgrade to continue."
        meta="2 of 2 résumés used"
        action={<Button variant="primary">Upgrade to Plus</Button>}
      />
    </div>
  ),
}
