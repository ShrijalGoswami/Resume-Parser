/**
 * RBAC permission keys (mirror app/enterprise/rbac.py Permission values).
 *
 * SECURITY CONTRACT: the server is always the authority. These only decide
 * which controls to render vs. show a calm gate state, so a member never sees
 * a button that would answer 403. Every key below is enforced independently by
 * `require_permission(...)` in app/enterprise/deps.py; deleting this file would
 * make the UI noisier, not less secure.
 *
 * The product half of this list (campaign / candidate / ai / agent) was added
 * on 29 Jul 2026. Until then only the org-administration keys existed, which
 * is why role changes were visible in Settings and nowhere else.
 *
 * `EXPORT` is deliberately distinct from `CANDIDATE_VIEW`: reading candidates
 * in the product and walking out with the whole set are different acts, and
 * interviewers and viewers may do the first but not the second.
 */
export const PERMS = {
  ORG_MANAGE: 'org.manage',
  MEMBER_MANAGE: 'member.manage',
  WORKSPACE_MANAGE: 'workspace.manage',
  FEATURE_FLAG_MANAGE: 'feature_flag.manage',
  API_KEY_MANAGE: 'api_key.manage',
  INTEGRATION_MANAGE: 'integration.manage',
  AUDIT_VIEW: 'audit.view',
  USAGE_VIEW: 'usage.view',
  // Product surface
  CAMPAIGN_MANAGE: 'campaign.manage',
  CAMPAIGN_DELETE: 'campaign.delete',
  CAMPAIGN_VIEW: 'campaign.view',
  CANDIDATE_MANAGE: 'candidate.manage',
  CANDIDATE_VIEW: 'candidate.view',
  AI_USE: 'ai.use',
  AGENT_MANAGE: 'agent.manage',
  EXPORT: 'export',
} as const

export type PermissionKey = (typeof PERMS)[keyof typeof PERMS]

export function hasPerm(permissions: string[] | undefined, permission: PermissionKey): boolean {
  return Boolean(permissions?.includes(permission))
}
