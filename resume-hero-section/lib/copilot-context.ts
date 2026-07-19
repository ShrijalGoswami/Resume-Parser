/**
 * Auto-detect the Copilot's page context from the current route.
 *
 * No manual context selection is ever required — the panel derives what the
 * recruiter is looking at from the pathname, so questions like "who are my
 * strongest candidates?" are answered against the right campaign/candidate.
 */
import type { CopilotPageContext } from '@/types/copilot';

/** Routes where the global recruiter copilot is available. */
export function isRecruiterRoute(pathname: string): boolean {
  return (
    pathname === '/dashboard' ||
    pathname.startsWith('/campaigns') ||
    pathname === '/insights' ||
    pathname === '/search' ||
    pathname === '/reports' ||
    pathname === '/agent'
  );
}

/** Derive the grounded page context from a pathname. */
export function detectPageContext(pathname: string): CopilotPageContext {
  // /campaigns/[id]/candidates/[candidateId]
  const candidateMatch = pathname.match(
    /^\/campaigns\/([^/]+)\/candidates\/([^/]+)/,
  );
  if (candidateMatch) {
    return {
      type: 'candidate',
      campaign_id: candidateMatch[1],
      candidate_id: candidateMatch[2],
    };
  }

  // /campaigns/[id] (detail), excluding /campaigns/new
  const campaignMatch = pathname.match(/^\/campaigns\/([^/]+)/);
  if (campaignMatch && campaignMatch[1] !== 'new') {
    return { type: 'campaign', campaign_id: campaignMatch[1] };
  }

  if (pathname === '/dashboard') return { type: 'dashboard' };
  if (pathname === '/insights') return { type: 'analytics' };

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
