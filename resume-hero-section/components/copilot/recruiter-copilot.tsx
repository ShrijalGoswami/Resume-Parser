"use client"

import { useEffect, useRef, useState } from "react"
import {
  Sparkles, Send, Bot, User, Loader2, Plus, MessageSquare, PanelRightClose,
  ShieldCheck, AlertTriangle, FileText, CornerDownLeft, Trash2, Pencil, Check,
  ThumbsUp, ThumbsDown, Lightbulb, BookOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/recruiter/markdown"
import { useCopilot } from "@/components/copilot/copilot-provider"
import { contextLabel } from "@/lib/copilot-context"
import type {
  Conversation, CopilotMessage, CopilotPageContext, CopilotStructuredResponse,
} from "@/types/copilot"

function contextSuggestions(ctx: CopilotPageContext): string[] {
  switch (ctx.type) {
    case "candidate":
      return [
        "Summarize this candidate.",
        "Should I hire this candidate?",
        "What skills are missing?",
        "What concerns do you have?",
        "Generate interview questions.",
      ]
    case "campaign":
      return [
        "Summarize this campaign.",
        "Who are my strongest candidates?",
        "Which candidates should I focus on?",
      ]
    case "analytics":
      return ["Summarize my pipeline health.", "Which campaigns need attention?"]
    case "dashboard":
    default:
      return ["Summarize today's recruiting activity.", "Where should I focus today?"]
  }
}

function confidenceLabel(c: number): string {
  if (c >= 80) return "High confidence"
  if (c >= 50) return "Moderate confidence"
  if (c > 0) return "Low confidence"
  return "Unverified"
}

function confidenceTone(c: number): string {
  if (c >= 80) return "text-emerald-700 bg-emerald-50"
  if (c >= 50) return "text-amber-700 bg-amber-50"
  return "text-muted-foreground bg-muted"
}

export function RecruiterCopilot() {
  const {
    available, open, setOpen, pageContext, conversations, activeConversationId,
    messages, isSending, isLoadingMessages, send, newConversation,
    selectConversation, rename, remove,
  } = useCopilot()

  const [input, setInput] = useState("")
  const [showList, setShowList] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending])

  if (!available) return null

  const submit = (text: string) => {
    const q = text.trim()
    if (!q || isSending) return
    setInput("")
    void send(q)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  // ── Collapsed launcher ────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-105"
        aria-label="Open Recruiter Copilot"
      >
        <Sparkles className="size-4" />
        Copilot
      </button>
    )
  }

  const suggestions = contextSuggestions(pageContext)

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-border bg-[#FAFAFA] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-foreground">Recruiter Copilot</p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              Context: <span className="font-semibold text-foreground/70">{contextLabel(pageContext)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { newConversation(); setShowList(false) }}
            title="New conversation"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            onClick={() => setShowList((s) => !s)}
            title="Conversations"
            className={`rounded-lg p-2 transition-colors hover:bg-muted ${showList ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <MessageSquare className="size-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            title="Close"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PanelRightClose className="size-4" />
          </button>
        </div>
      </div>

      {showList ? (
        <ConversationList
          conversations={conversations}
          activeId={activeConversationId}
          onSelect={async (id) => { await selectConversation(id); setShowList(false) }}
          onRename={rename}
          onDelete={remove}
          onNew={() => { newConversation(); setShowList(false) }}
        />
      ) : (
        <>
          {/* Transcript */}
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
            {isLoadingMessages ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading conversation…
              </div>
            ) : messages.length === 0 ? (
              <EmptyState label={contextLabel(pageContext)} suggestions={suggestions} onPick={submit} />
            ) : (
              messages.map((m) => <MessageBubble key={m.id} message={m} onFollowup={submit} disabled={isSending} />)
            )}
            <div ref={endRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-white px-4 py-3">
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about candidates, campaigns, or fit…"
                className="max-h-32 min-h-[44px] resize-none"
                rows={1}
              />
              <Button onClick={() => submit(input)} disabled={isSending || !input.trim()} size="icon" className="size-11 shrink-0">
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <CornerDownLeft className="size-3" /> Enter to send · answers are grounded in your platform data
            </p>
          </div>
        </>
      )}
    </aside>
  )
}

function EmptyState({
  label, suggestions, onPick,
}: { label: string; suggestions: string[]; onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
        <Sparkles className="size-6 text-primary" />
      </div>
      <h4 className="text-base font-bold text-foreground">How can I help?</h4>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        I know your campaigns, candidates, and notes. I&apos;m looking at{" "}
        <span className="font-semibold text-foreground">{label}</span>.
      </p>
      <div className="mt-5 w-full space-y-2 text-left">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground/80 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            <Lightbulb className="size-4 shrink-0 text-primary/60" />
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({
  message, onFollowup, disabled,
}: { message: CopilotMessage; onFollowup: (q: string) => void; disabled: boolean }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-foreground text-background" : "bg-primary/10 text-primary"}`}>
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>
      <div className={`min-w-0 max-w-[85%] ${isUser ? "text-right" : ""}`}>
        {isUser ? (
          <div className="inline-block rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-left text-sm text-primary-foreground">
            {message.content}
          </div>
        ) : message.pending ? (
          <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border/60 bg-white px-4 py-3.5 shadow-sm">
            <span className="size-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]" />
            <span className="size-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.15s]" />
            <span className="size-2 animate-bounce rounded-full bg-primary/40" />
          </div>
        ) : (
          <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-white px-4 py-3 shadow-sm">
            <Markdown text={message.content} />
            {message.structured && <StructuredSections data={message.structured} onFollowup={onFollowup} disabled={disabled} />}
          </div>
        )}
      </div>
    </div>
  )
}

function StructuredSections({
  data, onFollowup, disabled,
}: { data: CopilotStructuredResponse; onFollowup: (q: string) => void; disabled: boolean }) {
  const hasLists = data.strengths.length > 0 || data.weaknesses.length > 0 || data.recommendations.length > 0
  return (
    <div className="mt-3 space-y-3 border-t border-border/50 pt-3">
      {hasLists && (
        <div className="space-y-2.5">
          {data.strengths.length > 0 && (
            <SectionList icon={<ThumbsUp className="size-3.5 text-emerald-600" />} title="Strengths" items={data.strengths} />
          )}
          {data.weaknesses.length > 0 && (
            <SectionList icon={<ThumbsDown className="size-3.5 text-rose-600" />} title="Concerns" items={data.weaknesses} />
          )}
          {data.recommendations.length > 0 && (
            <SectionList icon={<Lightbulb className="size-3.5 text-amber-600" />} title="Recommendations" items={data.recommendations} />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${confidenceTone(data.confidence)}`}>
          <ShieldCheck className="size-3" /> {data.confidence}% · {confidenceLabel(data.confidence)}
        </span>
        {data.degraded && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            <AlertTriangle className="size-3" /> Fallback
          </span>
        )}
      </div>

      {data.sources_used.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="size-3" /> Sources used
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.sources_used.map((s, i) => (
              <span
                key={`${s.source}-${i}`}
                title={s.detail}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground/70"
              >
                <FileText className="size-3 text-primary/50" /> {s.source}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.followups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.followups.map((f) => (
            <button
              key={f}
              onClick={() => onFollowup(f)}
              disabled={disabled}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground/70 transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionList({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-foreground/70">
        {icon} {title}
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/30" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ConversationList({
  conversations, activeId, onSelect, onRename, onDelete, onNew,
}: {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onNew: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")

  const startEdit = (c: Conversation) => { setEditingId(c.id); setDraft(c.title) }
  const commitEdit = async () => {
    if (editingId && draft.trim()) await onRename(editingId, draft.trim())
    setEditingId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <button
        onClick={onNew}
        className="mb-2 flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Plus className="size-4" /> New conversation
      </button>
      {conversations.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">No conversations yet.</p>
      ) : (
        <ul className="space-y-1">
          {conversations.map((c) => (
            <li
              key={c.id}
              className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 transition-colors ${c.id === activeId ? "bg-primary/10" : "hover:bg-muted"}`}
            >
              {editingId === c.id ? (
                <>
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void commitEdit(); if (e.key === "Escape") setEditingId(null) }}
                    className="min-w-0 flex-1 rounded-md border border-border bg-white px-2 py-1 text-sm outline-none focus:border-primary"
                  />
                  <button onClick={() => void commitEdit()} className="rounded p-1 text-emerald-600 hover:bg-emerald-50" title="Save">
                    <Check className="size-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className={`truncate text-sm ${c.id === activeId ? "font-semibold text-foreground" : "text-foreground/80"}`}>
                      {c.title}
                    </span>
                  </button>
                  <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => startEdit(c)} className="rounded p-1 text-muted-foreground hover:bg-white hover:text-foreground" title="Rename">
                      <Pencil className="size-3.5" />
                    </button>
                    <button onClick={() => void onDelete(c.id)} className="rounded p-1 text-muted-foreground hover:bg-white hover:text-rose-600" title="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
