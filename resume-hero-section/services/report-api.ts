/**
 * Executive Intelligence report API client (V5).
 *
 * Authenticated + recruiter-scoped. Reports are grounded in server-computed
 * metrics; the AI only narrates them.
 */
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ApiError } from '@/lib/api-error';
import type { ExecutiveReport, ExecutiveReportRequest } from '@/types/report';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const V1 = `${API_BASE_URL}/api/v1`;

async function authHeaders(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

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
