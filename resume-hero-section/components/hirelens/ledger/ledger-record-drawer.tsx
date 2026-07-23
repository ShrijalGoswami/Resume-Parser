'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Drawer, DrawerContent, DrawerHeader, DrawerBody } from '../ui/drawer'
import { ConfidenceChip } from '../decision-intelligence/confidence-chip'
import { decisionMeta, decisionLatency, recordLabel, fmtDate, fmtTime } from './ledger-meta'
import type { Recommendation } from '@/types/agent'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-hl-mono text-[10px] uppercase tracking-widest text-hl-fg-tertiary">
      {children}
    </p>
  )
}

export function LedgerRecordDrawer({
  rec,
  onClose,
}: {
  rec: Recommendation | null
  onClose: () => void
}) {
  const stamp = rec?.updated_at ?? rec?.created_at
  const decision = rec ? decisionMeta(rec.status) : null
  const latency = rec ? decisionLatency(rec) : null

  return (
    <Drawer open={Boolean(rec)} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DrawerContent size="wide">
        {rec ? (
          <>
            <DrawerHeader>
              <span className="font-hl-mono text-[11px] uppercase tracking-wider text-hl-fg-tertiary">
                {recordLabel(rec)} · {fmtDate(stamp)} · {fmtTime(stamp)}
              </span>
            </DrawerHeader>

            <DrawerBody className="flex flex-col gap-8">
              <div>
                <h2 className="hl-display-md text-hl-fg">{rec.candidate_name ?? rec.title}</h2>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-hl-fg-secondary">
                  <span
                    className={cn(
                      'hl-caption inline-flex items-center gap-1.5 rounded-hl-sm px-2 py-0.5',
                      decision?.tone === 'positive'
                        ? 'bg-hl-score-sharp/10 text-hl-score-sharp'
                        : decision?.tone === 'override'
                          ? 'bg-hl-score-soft/10 text-hl-score-soft'
                          : 'bg-hl-muted text-hl-fg-secondary',
                    )}
                  >
                    {decision?.label}
                  </span>
                  {rec.campaign_title ? <span className="hl-small">· {rec.campaign_title}</span> : null}
                </p>
              </div>

              <section className="flex flex-col gap-2">
                <SectionLabel>Decision</SectionLabel>
                <p className="hl-body text-hl-fg">
                  {decision?.label} the AI recommendation
                  {latency ? <span className="text-hl-fg-tertiary"> · {latency}</span> : null}
                </p>
              </section>

              {rec.why ? (
                <section className="flex flex-col gap-2">
                  <SectionLabel>Rationale</SectionLabel>
                  <blockquote className="hl-body border-l-2 border-hl-border pl-3 italic text-hl-fg-secondary">
                    “{rec.why}”
                  </blockquote>
                </section>
              ) : null}

              {/* Immutable snapshot — what HireLens said at decision time */}
              <section className="hl-prism-edge rounded-hl-lg border border-hl-ai-border bg-hl-ai-surface p-4">
                <SectionLabel>At the time, HireLens said</SectionLabel>
                <div className="mt-3 flex flex-col gap-3">
                  {rec.recommended_action ? (
                    <div>
                      <p className="hl-caption text-hl-fg-tertiary">Recommendation</p>
                      <p className="hl-body-medium text-hl-fg">{rec.recommended_action}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="hl-caption text-hl-fg-tertiary">Confidence</p>
                    <div className="mt-1">
                      <ConfidenceChip confidence={rec.confidence} />
                    </div>
                  </div>
                  {rec.evidence.length > 0 ? (
                    <div>
                      <p className="hl-caption text-hl-fg-tertiary">Evidence at decision time</p>
                      <ul className="hl-small mt-1 flex flex-col gap-1 text-hl-fg-secondary">
                        {rec.evidence.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="flex flex-col gap-2">
                <SectionLabel>Audit trail</SectionLabel>
                <dl className="flex flex-col gap-1.5 font-hl-mono text-[11px] text-hl-fg-secondary">
                  <div className="flex justify-between gap-4">
                    <dt className="text-hl-fg-tertiary">Recorded</dt>
                    <dd className="tabular-nums">
                      {fmtDate(rec.created_at)} · {fmtTime(rec.created_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-hl-fg-tertiary">Decided</dt>
                    <dd className="tabular-nums">
                      {fmtDate(rec.updated_at)} · {fmtTime(rec.updated_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-hl-fg-tertiary">Record</dt>
                    <dd>{recordLabel(rec)}</dd>
                  </div>
                </dl>
              </section>

              {rec.campaign_id && rec.candidate_id ? (
                <Link
                  href={`/roles/${rec.campaign_id}/candidates/${rec.candidate_id}`}
                  className="hl-small flex items-center gap-1 self-start text-hl-accent-fg outline-none hover:underline"
                >
                  Read full review <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </DrawerBody>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
