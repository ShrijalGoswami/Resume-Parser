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
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scope: string;
  revoked: boolean;
  created_at?: string | null;
}

export interface OrgContext {
  organization: Organization;
  workspace_id?: string | null;
  role: string;
  plan: string;
  permissions: string[];
  features: Record<string, boolean>;
}
