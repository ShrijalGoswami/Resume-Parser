'use client'

import { useOrgContext } from './api/org-context'
import { PERMS, hasPerm, type PermissionKey } from '../settings/permissions'

/**
 * `useCan` — the one place a product surface asks "may this member do X?".
 *
 * SECURITY CONTRACT (unchanged): the server is the authority. Every permission
 * below is enforced independently by `require_permission(...)`; this hook only
 * decides whether to render a control or a calm gate state, so a member is never
 * offered a button that answers 403.
 *
 * Settings sections predate this and call `useOrgContext` + `hasPerm` inline —
 * the same query, the same key, so there is no second source of truth and no
 * extra request. New product-surface gating uses this instead of repeating the
 * three lines, because a gate that is easy to add is a gate that gets added.
 *
 * While the context is still loading `permissions` is undefined and every answer
 * is `false`. Controls appear on resolve rather than flashing and withdrawing —
 * for authorization that is the correct direction to fail.
 */
export function useCan(permission: PermissionKey): boolean {
  const ctx = useOrgContext()
  return hasPerm(ctx.data?.permissions, permission)
}

/**
 * The route-level counterpart, and the reason it exists:
 *
 * `useCan` collapses "not allowed" and "not known yet" into one `false`, which
 * is right for a button — the worst case is a control that appears a moment
 * late. It is WRONG for a whole screen. A failed `/org/context` (this is a real
 * case; the request 503s often enough to catch in a single session) would
 * otherwise render "Analytics is available to hiring managers, admins, and
 * owners" to an owner. That is not a gate, it is a false accusation, and the
 * user's only recourse — reload — is not the one the message suggests.
 *
 * So the four states stay distinct, and a screen may only claim a permission
 * problem when the context actually resolved and actually lacks it. The same
 * rule the marketing `Reveal` hook learned the hard way: never withhold content
 * on the strength of something you failed to find out.
 */
export type PermissionGate =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | { state: 'allowed' }
  | { state: 'denied' }

export function usePermissionGate(permission: PermissionKey): PermissionGate {
  const ctx = useOrgContext()
  if (ctx.data) {
    return hasPerm(ctx.data.permissions, permission) ? { state: 'allowed' } : { state: 'denied' }
  }
  if (ctx.isError) return { state: 'error', retry: () => void ctx.refetch() }
  return { state: 'loading' }
}

export { PERMS }
export type { PermissionKey }
