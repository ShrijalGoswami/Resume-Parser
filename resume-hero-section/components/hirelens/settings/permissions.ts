/**
 * RBAC permission keys (mirror app/enterprise/rbac.py Permission values). The
 * server is always the authority — these only decide which controls to render
 * vs. show a calm gate state, so a non-admin never sees a button that 403s.
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
} as const

export type PermissionKey = (typeof PERMS)[keyof typeof PERMS]

export function hasPerm(permissions: string[] | undefined, permission: PermissionKey): boolean {
  return Boolean(permissions?.includes(permission))
}
