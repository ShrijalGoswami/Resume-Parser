"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Send, Sparkles, Bot, User, Loader2, ShieldCheck, Quote, CornerDownLeft, AlertTriangle,
} from "lucide-react"
import { CandidateResult } from "@/types/batch"
import { CopilotUiMessage, ChatMessage, SuggestionGroup } from "@/types/copilot"
import { sendCopilotMessage, fetchCopilotSuggestions } from "@/services/api"
import { Markdown } from "@/components/recruiter/markdown"
import { scoreColor } from "@/components/recruiter/shared"

const HISTORY_LIMIT = 8 // recent turns sent to the backend

// Fallback quick actions if the suggestions endpoint is unreachable.
const FALLBACK_SUGGESTIONS: SuggestionGroup[] = [
  { category: "Overview", questions: ["Summarize this candidate.", "What is your hiring recommendation and why?", "What are the top hiring risks?"] },
  { category: "Fit", questions: ["Which required skills are missing?", "Explain their ATS score.", "How well do they match the job?"] },
  { category: "Interview", questions: ["Generate 5 technical interview questions.", "Generate project-specific questions."] },
]

// Suggestions are identical across candidates — fetch once per session.
let cachedSuggestions: SuggestionGroup[] | null = null

let idCounter = 0
const nextId = () => `m${Date.now()}-${idCounter++}`

function confidenceLabel(c: number): string {
  if (c >= 80) return "High confidence"
  if (c >= 50) return "Moderate confidence"
  if (c > 0) return "Low confidence"
  return "Unverified"
}

export function CopilotPanel({
  candidate,
  jobDescription,
}: {
  candidate: CandidateResult
  jobDescription: string
}) {
  const [messages, setMessages] = useState<CopilotUiMessage[]>([])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionGroup[]>(cachedSuggestions ?? FALLBACK_SUGGESTIONS)
  const endRef = useRef<HTMLDivElement>(null)

  // Reset the conversation when the recruiter opens a different candidate.
  useEffect(() => {
    setMessages([])
    setInput("")
    setIsSending(false)
  }, [candidate.candidate_id])

  // Load configurable suggestions once.
  useEffect(() => {
    if (cachedSuggestions) return
    let cancelled = false
    fetchCopilotSuggestions()
      .then((groups) => { if (!cancelled && groups?.length) { cachedSuggestions = groups; setSuggestions(groups) } })
      .catch(() => { /* keep fallback */ })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending])

  const send = async (text: string) => {
    const question = text.trim()
    if (!question || isSending) return

    const userMsg: CopilotUiMessage = { id: nextId(), role: "user", content: question }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setIsSending(true)

    // Bound history sent to the backend.
    const history: ChatMessage[] = nextMessages
      .slice(-HISTORY_LIMIT)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await sendCopilotMessage(candidate, jobDescription, history.slice(0, -1), question)
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: res.answer, meta: res }])
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: nextId(),
        role: "assistant",
        content: err instanceof Error ? `⚠️ ${err.message}` : "⚠️ The copilot is unavailable right now. Please try again.",
      }])
    } finally {
      setIsSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex h-[60vh] flex-col">
      {/* Conversation */}
      <div className="flex-1 space-y-5 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h4 className="text-base font-bold text-foreground">Ask the Recruiter Copilot</h4>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Grounded, explainable answers about <span className="font-semibold text-foreground">{candidate.name}</span> for this role. Every answer cites evidence from the candidate&apos;s data.
            </p>
            <div className="mt-5 w-full space-y-4 text-left">
              {suggestions.map((group) => (
                <div key={group.category}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{group.category}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.questions.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="rounded-full border border-border bg-white px-3 py-1.5 text-sm text-foreground/80 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-foreground text-background" : "bg-primary/10 text-primary"}`}>
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </div>
            <div className={`min-w-0 max-w-[85%] ${m.role === "user" ? "text-right" : ""}`}>
              {m.role === "user" ? (
                <div className="inline-block rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-left text-sm text-primary-foreground">{m.content}</div>
              ) : (
                <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-white px-4 py-3 shadow-sm">
                  <Markdown text={m.content} />

                  {m.meta && (m.meta.confidence > 0 || m.meta.evidence.length > 0) && (
                    <div className="mt-3 border-t border-border/50 pt-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold ${scoreColor(m.meta.confidence)}`}>
                          <ShieldCheck className="size-3" /> {m.meta.confidence}% · {confidenceLabel(m.meta.confidence)}
                        </span>
                        {m.meta.degraded && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="size-3" /> Deterministic fallback
                          </span>
                        )}
                      </div>

                      {m.meta.evidence.length > 0 && (
                        <div className="space-y-1.5">
                          {m.meta.evidence.map((ev, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <Quote className="mt-0.5 size-3 shrink-0 text-primary/50" />
                              <span><span className="font-semibold uppercase tracking-wide text-foreground/70">{ev.category}</span> — {ev.detail}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {m.meta.followups.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.meta.followups.map((f) => (
                            <button
                              key={f}
                              onClick={() => send(f)}
                              disabled={isSending}
                              className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/70 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Bot className="size-4" /></div>
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border/60 bg-white px-4 py-3.5 shadow-sm">
              <span className="size-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-primary/40" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="mt-4 border-t border-border/60 pt-4">
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about skills, experience, hiring fit, or interview questions…"
            className="max-h-32 min-h-[44px] resize-none"
            rows={1}
          />
          <Button onClick={() => send(input)} disabled={isSending || !input.trim()} size="icon" className="size-11 shrink-0">
            {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <CornerDownLeft className="size-3" /> Enter to send · Shift+Enter for a new line · answers are grounded in candidate data
        </p>
      </div>
    </div>
  )
}
