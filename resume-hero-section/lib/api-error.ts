/**
 * API error that preserves the HTTP status + server detail so callers can
 * distinguish, e.g., a plan/feature gate (403) from a genuine system failure.
 */
export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * True when the error is the backend's feature-flag / plan gate:
 * HTTP 403 with a "capability is not enabled" detail. This is an
 * entitlement state, not a system error — render an upgrade empty state.
 */
export function isFeatureGateError(e: unknown): boolean {
  if (e instanceof ApiError) {
    return e.status === 403 && /capability is not enabled/i.test(e.detail);
  }
  // Fallback for plain Errors (message carries the server detail).
  return e instanceof Error && /capability is not enabled/i.test(e.message);
}
