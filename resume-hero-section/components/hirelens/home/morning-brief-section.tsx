'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
import { useGenerateBrief } from '../lib/api/hooks'
import { AIAnswer } from '../domain'
import { Section } from './section'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { EmptyState } from '../states/empty-state'
import { ErrorState } from '../states/error-state'
import type { AgentBriefing } from '@/types/agent'

/**
 * AI Morning Brief (UX Spec §6). User-initiated only — running the agent is an
 * LLM call, so Home never triggers it automatically. Shows the last brief
 * generated this session, or the designed empty state with a generate action.
 */
export function MorningBriefSection() {
  const [brief, setBrief] = React.useState<AgentBriefing | null>(null)
  const generate = useGenerateBrief()

  const onGenerate = () => {
    generate.mutate(undefined, {
      onSuccess: (data) => setBrief(data.briefing),
    })
  }

  return (
    <Section
      title="AI morning brief"
      action={
        brief ? (
          <Button variant="ai" size="sm" onClick={onGenerate} loading={generate.isPending}>
            <Sparkles /> Regenerate
          </Button>
        ) : undefined
      }
    >
      {brief ? (
        <AIAnswer
          reasoning={
            brief.priorities.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {brief.priorities.map((priority, index) => (
                  <li key={index}>{priority}</li>
                ))}
              </ul>
            ) : undefined
          }
        >
          <p className="hl-body-medium">{brief.headline}</p>
          {brief.summary ? <p className="mt-1 text-hl-fg-secondary">{brief.summary}</p> : null}
        </AIAnswer>
      ) : generate.isError ? (
        <Card className="p-4">
          <ErrorState
            variant="inline"
            title="Couldn't generate the brief"
            description="The agent is busy. Try again in a moment."
            onRetry={onGenerate}
          />
        </Card>
      ) : (
        <Card variant="ai">
          <EmptyState
            icon={Sparkles}
            title="Start your day with a brief"
            description="Generate an AI summary of what changed and what needs your attention. It runs on demand to keep Home fast."
            action={
              <Button variant="ai" onClick={onGenerate} loading={generate.isPending}>
                <Sparkles /> Generate morning brief
              </Button>
            }
          />
        </Card>
      )}
    </Section>
  )
}
