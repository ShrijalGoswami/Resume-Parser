'use client'

import * as React from 'react'
import type { PlanKey } from '../lib/entitlements/catalog'

/**
 * Where an upgrade CTA goes.
 *
 * There is deliberately no self-service plan change in the product: the API has
 * no subscription write path and the database revokes one, so a button that
 * "upgrades" cannot exist yet. Until billing ships (Phase 3), every CTA has to
 * lead somewhere honest.
 *
 * Rather than let each call site invent that destination — and then have to
 * find them all again when checkout lands — the destination is supplied once,
 * from the top of the app. Phase 2.4 mounts a provider that opens the upgrade
 * dialog; Phase 3 changes that one handler to start a checkout session, and no
 * lock, meter or button changes.
 *
 * The default is a no-op that logs in development. That is on purpose: a CTA
 * with nothing wired reads as broken to a user, so the fallback should be
 * visible to US and inert to THEM, never a dead link or a 404.
 */
export interface UpgradeRequest {
  /** Feature key that triggered it, when there was one. */
  feature?: string | null
  /** Metric key, when a quota triggered it. */
  metric?: string | null
  /** The tier the CTA offered — already reconciled against the catalog. */
  requiredPlan?: PlanKey | null
}

export type UpgradeHandler = (request: UpgradeRequest) => void

const noopUpgrade: UpgradeHandler = (request) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      '[entitlements] An upgrade CTA fired with no UpgradeActionProvider mounted. ' +
        'Wrap the app in <UpgradeActionProvider> (Phase 2.4) to route this.',
      request,
    )
  }
}

const UpgradeActionContext = React.createContext<UpgradeHandler>(noopUpgrade)

export function UpgradeActionProvider({
  onUpgrade,
  children,
}: {
  onUpgrade: UpgradeHandler
  children: React.ReactNode
}) {
  return (
    <UpgradeActionContext.Provider value={onUpgrade}>{children}</UpgradeActionContext.Provider>
  )
}

/** The handler every upgrade CTA calls. Always safe to call. */
export function useUpgradeAction(): UpgradeHandler {
  return React.useContext(UpgradeActionContext)
}
