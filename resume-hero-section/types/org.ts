// Types mirroring the backend enterprise schemas (app/enterprise/schemas.py).

export interface Organization {
  id: string;
  name: string;
  slug?: string | null;
  plan: string;
  settings: Record<string, unknown>;
  created_at?: string | null;
}

export interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  created_at?: string | null;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  invited_email?: string | null;
  created_at?: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_email?: string | null;
  metadata: Record<string, unknown>;
  created_at?: string | null;
}

export interface UsageCounter {
  metric: string;
  period: string;
  value: number;
}

export interface Subscription {
  organization_id: string;
  plan: string;
  status: string;
  limits: Record<string, number>;
  /** Eight-value billing state (migration 0027). Null on manually-set plans and
   *  on rows predating it, so absence means "unknown", not any given state. */
  billing_state?: string | null;
  /** End of the paid period — the renewal date, or when access ends if
   *  `cancel_at_period_end` is set. Null for free and manual plans. */
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  /** A plan change queued for the end of the current period (migration 0029).
   *  A PROMISE, NOT AN ENTITLEMENT — `plan` above is what the organization has
   *  today. Rendered so an upgrade that is already booked is not offered twice. */
  scheduled_plan?: string | null;
  scheduled_plan_effective_at?: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scope: string;
  revoked: boolean;
  created_at?: string | null;
}

/** Commercial state of the organization (backend: enterprise/schemas.PlanState). */
export interface PlanState {
  key: string;
  label: string;
  status: string;
  /** 'founding' = grandfathered before monetization; 'v1' = current plan matrix. */
  ruleset: string;
  /** Bumped on every plan change; compare against a 402's `plan_version` to
   *  detect a stale cached context after an upgrade. */
  version: number;
}

/** One capability's availability. `required_plan` is what the lock surface
 *  renders as "Upgrade to …" — derived from the catalog, never hardcoded. */
export interface Entitlement {
  enabled: boolean;
  required_plan: string;
  label: string;
}

/** Usage against one plan limit. `limit: -1` means unlimited. */
export interface LimitUsage {
  used: number;
  limit: number;
  remaining: number | null;
  label: string;
  /** Résumés only: 'lifetime' on Free, 'month' on paid plans. */
  window?: string;
  period?: string;
}

export interface OrgContext {
  organization: Organization;
  workspace_id?: string | null;
  role: string;
  plan: string;
  permissions: string[];
  features: Record<string, boolean>;
  /** Monetization (Phase 1). Present on every context response; the Phase 2 UI
   *  reads these to render locks and meters without a second request. */
  plan_state: PlanState;
  entitlements: Record<string, Entitlement>;
  limits_usage: Record<string, LimitUsage>;
}
