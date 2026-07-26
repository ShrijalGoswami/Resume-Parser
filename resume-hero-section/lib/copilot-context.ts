/**
 * Auto-detect the Copilot's page context from the current route.
 *
 * No manual context selection is ever required — the panel derives what the
 * recruiter is looking at from the pathname, so questions like "who are my
 * strongest candidates?" are answered against the right campaign/candidate.
 */
import type { CopilotPageContext } from '@/types/copilot';

/** Routes where the legacy floating recruiter copilot is available. */
export function isRecruiterRoute(pathname: string): boolean {
  // Only the Classic surfaces that still exist. /dashboard, /campaigns and
  // /search were migrated to V4 and their pages removed.
  return pathname === '/insights' || pathname === '/reports' || pathname === '/agent';
}

/**
 * Derive the grounded page context from a pathname.
 *
 * Both the V4 (`/roles/…`) and legacy (`/campaigns/…`) shapes are matched. This
 * originally recognised only `/campaigns/**`, which meant that once those routes
 * were migrated to `/roles/**` nothing produced a `candidate` or `campaign`
 * context any more — the backend's grounded per-candidate copilot was reachable
 * over the API but had no route in the product that would ask it anything other
 * than a global question. The legacy patterns are kept so the Classic surfaces
 * behave unchanged.
 */
export function detectPageContext(pathname: string): CopilotPageContext {
  // /roles/[roleId]/candidates/[candidateId] · /campaigns/[id]/candidates/[candidateId]
  const candidateMatch = pathname.match(
    /^\/(?:roles|campaigns)\/([^/]+)\/candidates\/([^/]+)/,
  );
  if (candidateMatch) {
    return {
      type: 'candidate',
      campaign_id: candidateMatch[1],
      candidate_id: candidateMatch[2],
    };
  }

  // /roles/[roleId] · /campaigns/[id], excluding the legacy /campaigns/new
  const campaignMatch = pathname.match(/^\/(?:roles|campaigns)\/([^/]+)/);
  if (campaignMatch && campaignMatch[1] !== 'new') {
    return { type: 'campaign', campaign_id: campaignMatch[1] };
  }

  if (pathname === '/home' || pathname === '/dashboard') return { type: 'dashboard' };
  if (pathname === '/analytics' || pathname === '/insights') return { type: 'analytics' };

  return { type: 'global' };
}

/** A short human label for the current context (shown in the panel header). */
export function contextLabel(ctx: CopilotPageContext): string {
  switch (ctx.type) {
    case 'candidate':
      return 'This candidate';
    case 'campaign':
      return 'This campaign';
    case 'dashboard':
      return "Today's activity";
    case 'analytics':
      return 'Analytics';
    default:
      return 'General';
  }
}

/** True when two contexts point at the same grounded entity. */
export function sameContext(a: CopilotPageContext, b: CopilotPageContext): boolean {
  return (
    a.type === b.type &&
    (a.campaign_id ?? null) === (b.campaign_id ?? null) &&
    (a.candidate_id ?? null) === (b.candidate_id ?? null)
  );
}
