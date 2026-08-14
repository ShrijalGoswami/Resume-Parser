// Types mirroring the backend integration schemas.

export interface ProviderInfo {
  name: string;
  display_name: string;
  category: string;
  actions: string[];
  requires_oauth: boolean;
  oauth_available: boolean;
}

export interface Connection {
  id: string;
  provider: string;
  status: string;
  scopes: string[];
  health: string;
  last_sync_at?: string | null;
}

export interface WorkflowStepT {
  action: string;
  provider: string;
  params: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  organization_id: string;
  name: string;
  trigger_event: string;
  steps: WorkflowStepT[];
  enabled: boolean;
  created_at?: string | null;
}

export interface Execution {
  id: string;
  rule_id?: string | null;
  rule_name: string;
  event: string;
  status: string;
  steps: Array<{ provider: string; action: string; ok: boolean; attempts: number; error?: string | null; simulated?: boolean }>;
  latency_ms: number;
  error?: string | null;
  created_at?: string | null;
}
