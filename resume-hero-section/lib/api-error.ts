/**
 * API error that preserves the HTTP status + server detail so callers can
 * distinguish an entitlement gate from a genuine system failure.
 *
 * Three outcomes are deliberately kept apart, because their remedies are
 * different and telling a user the wrong one is worse than saying nothing:
 *
 *    403  your ROLE may not do this      → ask an admin
 *    402  your PLAN does not include it  → upgrade / you've hit a limit
 *    5xx  something broke                → retry
 */
export class ApiError extends Error {
  status: number;
  detail: string;
  /** Present on 402 — the server's structured entitlement decision. */
  plan?: PlanDenial;

  constructor(status: number, detail: string, plan?: PlanDenial) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.plan = plan;
  }
}

/**
 * The flat body a 402 carries (backend: `Decision.as_error`).
 *
 * Everything the upgrade surface needs is a field, not prose: `required_plan`
 * produces "Upgrade to Pro", `used`/`limit` produce "2 of 2 used". Nothing here
 * should ever be recovered by parsing `detail`.
 */
export interface PlanDenial {
  /** 'feature_not_in_plan' | 'limit_exceeded' | 'plan_inactive' */
  code: string;
  detail: string;
  feature: string | null;
  metric: string | null;
  current_plan: string;
  required_plan: string | null;
  upgrade_target: string | null;
  limit: number | null;
  used: number | null;
  remaining: number | null;
  /** Compare with the cached org context to detect a stale plan after upgrade. */
  plan_version: number;
}

const PLAN_CODES = new Set(['feature_not_in_plan', 'limit_exceeded', 'plan_inactive']);

/** Build a `PlanDenial` from a parsed response body, or undefined if it is not one. */
export function parsePlanDenial(status: number, body: unknown): PlanDenial | undefined {
  if (status !== 402 || !body || typeof body !== 'object') return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b.code !== 'string' || !PLAN_CODES.has(b.code)) return undefined;
  return {
    code: b.code,
    detail: typeof b.detail === 'string' ? b.detail : 'Your plan does not include this.',
    feature: (b.feature as string) ?? null,
    metric: (b.metric as string) ?? null,
    current_plan: (b.current_plan as string) ?? 'free',
    required_plan: (b.required_plan as string) ?? null,
    upgrade_target: (b.upgrade_target as string) ?? null,
    limit: typeof b.limit === 'number' ? b.limit : null,
    used: typeof b.used === 'number' ? b.used : null,
    remaining: typeof b.remaining === 'number' ? b.remaining : null,
    plan_version: typeof b.plan_version === 'number' ? b.plan_version : 1,
  };
}

/** Throwable built from a failed `Response` and its already-parsed body. */
export function apiErrorFrom(status: number, body: unknown): ApiError {
  const b = (body ?? {}) as Record<string, unknown>;
  const detail = typeof b.detail === 'string' ? b.detail : `Request failed: ${status}`;
  return new ApiError(status, detail, parsePlanDenial(status, body));
}

/**
 * True when the failure is an entitlement decision rather than a system error —
 * i.e. render an upgrade surface, not an error state.
 *
 * Recognises the 402 contract. The legacy 403 "capability is not enabled" shape
 * is still matched: gates answered 403 before monetization, and a client running
 * against an older backend should still show the calm surface.
 */
export function isPlanGateError(e: unknown): boolean {
  if (e instanceof ApiError) {
    if (e.status === 402) return true;
    return e.status === 403 && /capability is not enabled/i.test(e.detail);
  }
  return e instanceof Error && /capability is not enabled/i.test(e.message);
}

/** The plan denial carried by an error, when there is one. */
export function planDenialOf(e: unknown): PlanDenial | undefined {
  return e instanceof ApiError ? e.plan : undefined;
}

/** @deprecated Use `isPlanGateError` — entitlement denials are 402 since Phase 1. */
export const isFeatureGateError = isPlanGateError;
