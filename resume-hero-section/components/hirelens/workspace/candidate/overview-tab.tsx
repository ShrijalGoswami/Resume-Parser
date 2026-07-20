'use client'

import { Mail, Phone, Download, FileText } from 'lucide-react'
import { useUpdateStage } from '../../lib/api/workspace'
import { useResumeUrl } from '../../lib/api/candidate'
import { AIAnswer } from '../../domain'
import { ScoreMeter } from '../../domain/score-meter'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { StageMenu } from '../stage-menu'
import { HireBadge } from '../hire-badge'
import { SkillList } from './parts'
import { hireLabel } from '@/lib/candidate'
import type { Candidate } from '@/types/campaign'
import type { CandidateResult } from '@/types/batch'

function ScoreTile({ label, score }: { label: string; score: number }) {
  return (
    <div className="rounded-hl-md border border-hl-border p-3">
      <p className="hl-caption mb-1 text-hl-fg-tertiary">{label}</p>
      <ScoreMeter score={score} />
    </div>
  )
}

export function OverviewTab({
  roleId,
  candidate,
  result,
}: {
  roleId: string
  candidate: Candidate
  result: CandidateResult | null
}) {
  const updateStage = useUpdateStage(roleId)
  const resume = useResumeUrl(roleId, candidate.id, false)

  const email = candidate.email || result?.email || ''
  const phone = result?.phone || ''
  const fit = result?.overall_score ?? null
  const ats = result?.ats_score ?? null

  const downloadResume = async () => {
    const { data } = await resume.refetch()
    if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-col gap-4">
      {email || phone ? (
        <div className="hl-small flex flex-wrap items-center gap-3 text-hl-fg-secondary">
          {email ? (
            <span className="inline-flex items-center gap-1">
              <Mail className="size-3.5" aria-hidden /> {email}
            </span>
          ) : null}
          {phone ? (
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3.5" aria-hidden /> {phone}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <span className="hl-caption text-hl-fg-tertiary">Stage</span>
        <StageMenu
          stage={candidate.stage}
          onChange={(stage) => updateStage.mutate({ candidateId: candidate.id, stage })}
        />
      </div>

      {fit !== null || ats !== null ? (
        <div className="grid grid-cols-2 gap-3">
          {fit !== null ? <ScoreTile label="Fit" score={fit} /> : null}
          {ats !== null ? <ScoreTile label="ATS" score={ats} /> : null}
        </div>
      ) : null}

      {result && (result.summary || result.recommendation) ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <HireBadge hire={hireLabel(result.recommendation)} />
            {result.match_category ? <Badge>{result.match_category}</Badge> : null}
          </div>
          <AIAnswer reasoning={result.recommendation_explanation || undefined}>
            {result.summary ? <p>{result.summary}</p> : <p>{result.recommendation}</p>}
          </AIAnswer>
        </div>
      ) : null}

      {result && (result.matching_skills.length > 0 || result.missing_skills.length > 0) ? (
        <div className="flex flex-col gap-2">
          <SkillList label="Matched" skills={result.matching_skills} variant="success" />
          <SkillList label="Missing" skills={result.missing_skills} variant="danger" />
        </div>
      ) : null}

      {candidate.resume_filename ? (
        <div className="flex items-center gap-2 rounded-hl-md border border-hl-border p-2">
          <FileText className="size-4 shrink-0 text-hl-fg-tertiary" aria-hidden />
          <span className="hl-small flex-1 truncate">{candidate.resume_filename}</span>
          <Button size="sm" variant="secondary" onClick={downloadResume} loading={resume.isFetching}>
            <Download /> Résumé
          </Button>
        </div>
      ) : null}
    </div>
  )
}
