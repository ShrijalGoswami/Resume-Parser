/**
 * Entitlement UI — the catalog-aware layer.
 *
 * These components know about features, plans and quotas. The primitives they
 * render on (`states/gate-state`, `ui/button`, `ui/badge`) do not, and must not:
 * product-specific copy is composed here from the catalog and passed down. See
 * the rule at the top of `states/gate-state.tsx`.
 *
 * Access is still decided entirely by the server. Everything here reads a
 * decision that has already been made and chooses how to say it.
 */

export { FeatureLock, type FeatureLockProps } from './feature-lock'
export { LockedButton, type LockedButtonProps } from './locked-button'
export { PlanBadge, type PlanBadgeProps } from './plan-badge'
export { PlanGate, type PlanGateProps } from './plan-gate'
export { QuotaLock, type QuotaLockProps } from './quota-lock'
export { QuotaMeter, type QuotaMeterProps } from './quota-meter'
export { UpgradeButton, type UpgradeButtonProps } from './upgrade-button'
export {
  UpgradeActionProvider,
  useUpgradeAction,
  type UpgradeHandler,
  type UpgradeRequest,
} from './upgrade-action'
// Re-exported so a product surface needs one import to gate, meter and route a
// denial — a gate that is easy to add is a gate that gets added.
export { useEntitlement, usePlan, usePlanGate, useQuota } from '../lib/entitlements/use-entitlement'
