// Types mirroring the backend copilot schemas (app/schemas/copilot.py).

export interface CopilotEvidence {
  category: string;
  detail: string;
}

export interface CopilotResponse {
  answer: string;
  confidence: number;
  evidence: CopilotEvidence[];
  reasoning_summary: string;
  followups: string[];
  degraded: boolean;
}

/** Wire format sent back to the backend as conversation history. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SuggestionGroup {
  category: string;
  questions: string[];
}

/** UI-side message: a chat turn plus optional structured metadata for assistant turns. */
export interface CopilotUiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: CopilotResponse;
}

// ── V5 Recruiter Copilot (persisted, context-aware) ─────────────────────────

/** A context source the answer was grounded in (attributed by the server). */
export interface CopilotSource {
  source: string;
  detail: string;
}

/** The full, predictable copilot response (mirrors CopilotStructuredResponse). */
export interface CopilotStructuredResponse {
  answer: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence: number;
  reasoning_summary: string;
  followups: string[];
  sources_used: CopilotSource[];
  degraded: boolean;
}

export type CopilotContextType =
  | "dashboard"
  | "campaign"
  | "candidate"
  | "analytics"
  | "global";

/** Auto-detected page context sent with each copilot message. */
export interface CopilotPageContext {
  type: CopilotContextType;
  campaign_id?: string | null;
  candidate_id?: string | null;
}

export interface Conversation {
  id: string;
  candidate_id: string | null;
  campaign_id: string | null;
  recruiter_id: string;
  context_type: string;
  title: string;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface ConversationMessagePublic {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string | null;
  structured: CopilotStructuredResponse | null;
}

export interface PostMessageResponse {
  conversation_id: string;
  user_message: ConversationMessagePublic;
  assistant_message: ConversationMessagePublic;
  response: CopilotStructuredResponse;
}

/** UI-side message for the persisted copilot. */
export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  structured?: CopilotStructuredResponse | null;
  pending?: boolean;
}
