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
