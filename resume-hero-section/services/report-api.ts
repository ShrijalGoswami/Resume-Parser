/**
 * Executive Intelligence report API client (V5).
 *
 * Authenticated + recruiter-scoped. Reports are grounded in server-computed
 * metrics; the AI only narrates them.
 */
import { ApiError } from '@/lib/api-error';
import type { ExecutiveReport, ExecutiveReportRequest } from '@/types/report';
import { authHeaders, V1 } from './auth-headers';

export async function generateExecutiveReport(body: ExecutiveReportRequest = {}): Promise<ExecutiveReport> {
  const res = await fetch(`${V1}/reports/executive`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ focus: body.focus ?? 'full', instruction: body.instruction ?? '', sections: body.sections ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.detail || `Report generation failed: ${res.status}`);
  }
  return res.json() as Promise<ExecutiveReport>;
}
