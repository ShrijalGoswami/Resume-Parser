'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { AIAnswer } from '../domain'
import { Button } from '../ui/button'
import type { CopilotStructuredResponse } from '@/types/copilot'

/** A recruiter's question — a plain right-aligned bubble on the reading canvas. */
export function UserTurn({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="hl-body max-w-[85%] rounded-hl-lg bg-hl-subtle px-3.5 py-2 text-hl-fg">
        {content}
      </div>
    </div>
  )
}

/** The in-flight state — a calm prism pulse, never a spinner wall. */
export function ThinkingTurn() {
  return (
    <div
      className="hl-prism-edge rounded-r-[var(--hl-radius-lg)] bg-hl-ai-surface p-4"
      aria-live="polite"
    >
      <span className="hl-body inline-flex items-center gap-2 text-hl-fg-secondary">
        <Sparkles className="size-4 animate-pulse text-hl-prism-mid" aria-hidden />
        Thinking…
      </span>
    </div>
  )
}

function AnswerList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-2">
      <p className="hl-caption text-hl-fg-tertiary">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {items.map((item, index) => (
          <li key={index} className="hl-small flex gap-1.5 text-hl-fg-secondary">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-hl-fg-tertiary" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * An assistant answer rendered through the one AI render (AIAnswer, §4.8):
 * answer → sources → confidence → reasoning → actions. Citations come from the
 * server-attributed `sources_used`; follow-ups become quick-ask actions.
 */
export function AssistantTurn({
  response,
  onFollowup,
}: {
  response: CopilotStructuredResponse
  onFollowup: (question: string) => void
}) {
  const sources = response.sources_used.map((source) => ({
    label: source.detail || source.source,
  }))

  return (
    <AIAnswer
      confidence={response.confidence}
      sources={sources.length > 0 ? sources : undefined}
      reasoning={response.reasoning_summary || undefined}
      actions={
        response.followups.length > 0
          ? response.followups.map((followup, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => onFollowup(followup)}
              >
                {followup}
              </Button>
            ))
          : undefined
      }
    >
      {response.degraded ? (
        <p className="hl-small mb-2 text-hl-fg-tertiary">
          Answered with limited context — some sources were unavailable.
        </p>
      ) : null}
      <p>{response.answer}</p>
      {response.summary && response.summary !== response.answer ? (
        <p className="hl-small mt-2 text-hl-fg-secondary">{response.summary}</p>
      ) : null}
      <AnswerList label="Strengths" items={response.strengths} />
      <AnswerList label="Watch-outs" items={response.weaknesses} />
      <AnswerList label="Recommendations" items={response.recommendations} />
    </AIAnswer>
  )
}
