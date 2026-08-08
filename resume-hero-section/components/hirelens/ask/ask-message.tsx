'use client'

import * as React from 'react'
import { AIAnswer } from '../domain'
import { Button } from '../ui/button'
import type { CopilotStructuredResponse } from '@/types/copilot'

/** A recruiter's question — a plain right-aligned bubble on the reading canvas. */
export function UserTurn({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="hl-body max-w-[85%] rounded-hl-lg bg-hl-subtle px-4 py-3 text-hl-fg">
        {content}
      </div>
    </div>
  )
}

/**
 * The in-flight state.
 *
 * THE ANSWER TAKES ABOUT ELEVEN SECONDS AND DOES NOT STREAM. That is the
 * constraint this state has to survive honestly. A pulsing glyph over the word
 * "Thinking…" reads as a hung request by second four, and any typing effect or
 * partial text would imply the answer is arriving incrementally when in truth
 * it lands in one piece — a lie the reader would only detect by waiting.
 *
 * So it does two things instead. A copper progress rule (V2 §18) says work is
 * genuinely in flight, and after a few seconds a second line names what the
 * wait is actually for — the copilot is reading the workspace before it
 * answers. That is true of every request, needs no server signal to say, and
 * gives the reader a reason to wait rather than a spinner to distrust.
 */
export function ThinkingTurn() {
  const [longWait, setLongWait] = React.useState(false)

  React.useEffect(() => {
    // Roughly a third of the way into a typical answer: late enough that a
    // fast response never shows it, early enough to land before doubt does.
    const timer = window.setTimeout(() => setLongWait(true), 3500)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div
      className="rounded-r-[var(--hl-radius-lg)] border-l-2 border-[var(--hl-accent-secondary)] bg-hl-subtle p-4"
      aria-live="polite"
    >
      <p className="hl-body text-hl-fg-secondary">Reading your workspace…</p>
      <span
        className="mt-2 block h-0.5 w-24 overflow-hidden rounded-full bg-hl-muted"
        aria-hidden
      >
        <span className="hl-indeterminate block h-full w-1/3 rounded-full bg-[var(--hl-accent-secondary)]" />
      </span>
      {longWait ? (
        <p className="hl-caption mt-2 text-hl-fg-tertiary">
          Answers arrive complete rather than word by word, so this takes a
          moment.
        </p>
      ) : null}
    </div>
  )
}

/**
 * The model writes names and figures in `**bold**`, and the answer was
 * rendering those asterisks literally — "**SHRIJAL GOSWAMI**" in the middle of
 * a sentence. This resolves that one construct and nothing else.
 *
 * It is deliberately NOT a markdown renderer. The copilot returns prose with
 * occasional emphasis, not documents, and reaching for a parser (or growing
 * this regex toward one) would be answering a question nobody asked. If richer
 * formatting ever arrives from the backend, that is a decision to make on
 * purpose with a real renderer — not by accretion here.
 */
export function Emphasized({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
          <strong key={index} className="font-semibold text-hl-fg">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </>
  )
}

function AnswerList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-2">
      <p className="hl-label text-hl-fg-tertiary">{label}</p>
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
  // The source NAME leads, with its detail as the title — a chip row is a list
  // of where the answer came from, and `detail` can be a sentence, which turned
  // the attribution row into prose that no longer scanned as attribution.
  const sources = response.sources_used.map((source) => ({
    label: source.source || source.detail,
    title: source.detail || undefined,
  }))

  return (
    <AIAnswer
      confidence={response.confidence}
      sources={sources.length > 0 ? sources : undefined}
      // `response.grounded`, NOT `sources.length`. The server computes grounding
      // from the same attribution it sends, so this stays truthful as new AI
      // surfaces are added; inferring it here would re-create the ambiguity the
      // backend field exists to remove. `undefined` on conversations persisted
      // before the field shipped, which renders no claim either way.
      grounded={response.grounded}
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
        <p className="hl-body mb-2 text-hl-fg-tertiary">
          Answered with limited context — some sources were unavailable.
        </p>
      ) : null}
      <p>
        <Emphasized text={response.answer} />
      </p>
      {response.summary && response.summary !== response.answer ? (
        <p className="hl-body mt-2 text-hl-fg-secondary">
          <Emphasized text={response.summary} />
        </p>
      ) : null}
      <AnswerList label="Strengths" items={response.strengths} />
      <AnswerList label="Watch-outs" items={response.weaknesses} />
      <AnswerList label="Recommendations" items={response.recommendations} />
    </AIAnswer>
  )
}
