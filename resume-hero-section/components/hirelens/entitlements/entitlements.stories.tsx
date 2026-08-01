import type { Meta, StoryObj } from '@storybook/react-vite'
import { FeatureLock } from './feature-lock'
import { QuotaLock } from './quota-lock'
import { UpgradeButton } from './upgrade-button'
import { UpgradeActionProvider } from './upgrade-action'
import { Card } from '../ui/card'

/**
 * The catalog-aware entitlement surfaces.
 *
 * Every string below is DERIVED from a feature key or a metric key — nothing in
 * these stories types a plan name, and that is the property to preserve. Only
 * the presentational components appear here; the hook-driven ones
 * (`PlanGate`, `LockedButton`, `QuotaMeter`, `PlanBadge`) need an org context
 * and are covered by `tests/entitlement-components.test.tsx` instead.
 */
const meta: Meta = {
  title: 'Entitlements/Surfaces',
  decorators: [
    (Story) => (
      <UpgradeActionProvider onUpgrade={(r) => window.alert(`upgrade → ${r.requiredPlan}`)}>
        <div className="flex max-w-lg flex-col gap-4">
          <Story />
        </div>
      </UpgradeActionProvider>
    ),
  ],
}
export default meta
type Story = StoryObj

/** Same component, three tiers — all copy from the catalog. */
export const Locks: Story = {
  render: () => (
    <>
      <Card className="p-4">
        <FeatureLock feature="candidate_comparison" requiredPlan="plus" />
      </Card>
      <Card className="p-4">
        <FeatureLock feature="ai_copilot" requiredPlan="pro" />
      </Card>
      <Card className="p-4">
        <FeatureLock feature="webhooks" requiredPlan="enterprise" />
      </Card>
    </>
  ),
}

/**
 * Free credits are for the lifetime of the organization; paid allowances renew.
 * The two must not say the same thing — promising a Free user a reset that
 * never comes is a promise the product breaks four weeks later.
 */
export const Quotas: Story = {
  render: () => (
    <>
      <Card className="p-4">
        <QuotaLock metric="resumes" used={2} limit={2} window="lifetime" requiredPlan="plus" />
      </Card>
      <Card className="p-4">
        <QuotaLock metric="resumes" used={25} limit={25} window="month" requiredPlan="pro" />
      </Card>
      <Card className="p-4">
        <QuotaLock metric="members" used={1} limit={1} requiredPlan="plus" />
      </Card>
    </>
  ),
}

export const Ctas: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <UpgradeButton requiredPlan="plus" />
      <UpgradeButton requiredPlan="pro" />
      <UpgradeButton requiredPlan="enterprise" />
      <UpgradeButton requiredPlan={null} />
    </div>
  ),
}
