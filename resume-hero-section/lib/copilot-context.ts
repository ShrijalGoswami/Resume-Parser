/**
 * Auto-detect the Copilot's page context from the current route.
 *
 * No manual context selection is ever required — the panel derives what the
 * recruiter is looking at from the pathname, so questions like "who are my
 * strongest candidates?" are answered against the right campaign/candidate.
 */
import type { CopilotPageContext } from '@/types/copilot';

// `isRecruiterRoute()` lived here and gated the legacy floating copilot to
// /insights, /reports and /agent. Those pages are gone, so it could never again
// return true and the copilot it gated has been removed with it.
//
// `detectPageContext` below is NOT legacy — the V4 Ask surface
// (`components/hirelens/ask/ask-thread.tsx`) grounds its questions with it.

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
  // `/insights` was mapped here too. That page has been removed and has no
  // redirect, so the path can only 404 — claiming an analytics context for it
  // would ground a question against a surface the user is not looking at.
  if (pathname === '/analytics') return { type: 'analytics' };

  return { type: 'global' };
}

// `contextLabel()` rendered the panel header of the removed floating copilot and
// has no other caller. `sameContext()` had no caller even before this change.
// Both are gone; `detectPageContext` above is the only export this module still
// needs to provide.
