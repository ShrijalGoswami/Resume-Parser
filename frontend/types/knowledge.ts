// Types mirroring the backend knowledge layer.

export interface MemoryItem {
  id: string;
  kind: string;
  value_text: string;
  subject: string;
  source: string;
  confidence: number;
  occurred_at?: string | null;
  status: string;
  entities: Array<{ type: string; name: string }>;
}

export interface MemoryHit extends MemoryItem {
  _score: number;
  _why: string[];
}

export interface TimelineBucket { month: string; count: number; highlights: string[] }
export interface SkillEvolution { month: string; top: Array<{ skill: string; count: number }> }

export interface Preferences {
  preferred_technologies: Array<{ name: string; evidence: number }>;
  preferred_universities: Array<{ name: string; evidence: number }>;
  decision_patterns: Array<{ outcome: string; count: number }>;
  total_evidence: number;
}

export interface GraphResult {
  nodes: Array<{ name: string; type: string }>;
  edges: Array<{ source: string; relation: string; target: string }>;
  summary: { node_count: number; edge_count: number };
}
