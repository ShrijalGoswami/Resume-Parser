'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerTitle,
  DrawerDescription,
} from '../ui/drawer'
import { ConfidenceChip } from '../decision-intelligence/confidence-chip'
import {
  decisionMeta,
  decisionLatency,
  recordLabel,
  fmtDate,
  fmtTime,
  decidedAt,
  actorLabel,
} from './ledger-meta'
import type { Recommendation } from '@/types/agent'

/* Inter, not mono (V2 §4): a section label is a label. Mono in this drawer is
   reserved for timestamps and the record id. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="hl-label-sm text-hl-fg-tertiary">{children}</p>
}

export function LedgerRecordDrawer({
  rec,
  onClose,
  viewerId,
}: {
  rec: Recommendation | null
  onClose: () => void
  viewerId?: string | null
}) {
  const stamp = rec ? decidedAt(rec) : null
  const decision = rec ? decisionMeta(rec.status) : null
  const latency = rec ? decisionLatency(rec) : null
  const actor = rec ? actorLabel(rec, viewerId) : null

  return (
    <Drawer open={Boolean(rec)} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DrawerContent size="wide">
        {rec ? (
          <>
            <DrawerHeader>
              <span className="hl-label-sm font-hl-mono text-hl-fg-tertiary">
                {recordLabel(rec)} · {fmtDate(stamp)} · {fmtTime(stamp)}
              </span>
            </DrawerHeader>

            <DrawerBody className="flex flex-col gap-8">
              <div>
                {/* `asChild` so this is BOTH the visible heading and the dialog's
                    accessible name — the record drawer was the only one of the six
                    drawers with no Radix Title, so a screen reader announced it as
                    an unnamed dialog. Using the existing h2 rather than adding an
                    sr-only duplicate keeps one heading and one name. */}
                <DrawerTitle asChild>
                  <h2 className="hl-display-md text-hl-fg">{rec.candidate_name ?? rec.title}</h2>
                </DrawerTitle>
                <DrawerDescription asChild>
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
                    {rec.campaign_title ? (
                      <span className="hl-small">· {rec.campaign_title}</span>
                    ) : null}
                  </p>
                </DrawerDescription>
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

              {/* The immutable snapshot — what the system said at decision time.
                  V2 §16: system-generated material sits on the ordinary elevated
                  surface and is marked by a 2px copper top rule, never a tinted
                  plate. This carried `hl-prism-edge` + `bg-hl-ai-surface` +
                  `border-hl-ai-border`, all three on §23's banned list, and is now
                  the same treatment as the Decision Intelligence brief. */}
              <section className="rounded-hl-lg border border-hl-border border-t-2 border-t-[var(--hl-accent-secondary)] bg-hl-subtle p-4">
                <SectionLabel>What the system said at the time</SectionLabel>
                <div className="mt-3 flex flex-col gap-3">
                  {rec.recommended_action ? (
                    <div>
                      <p className="hl-label text-hl-fg-tertiary">Recommendation</p>
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

              {/* Provenance — what the recommendation was computed from. Both
                  fields are real and the ledger dropped them entirely, which left
                  the record showing a conclusion with no way to see its basis. */}
              {rec.data_sources.length > 0 || rec.tools_used.length > 0 ? (
                <section className="flex flex-col gap-2">
                  <SectionLabel>Computed from</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {[...rec.data_sources, ...rec.tools_used].map((item) => (
                      <span
                        key={item}
                        className="rounded-hl-sm border border-hl-border bg-hl-canvas px-2 py-0.5 hl-caption text-hl-fg-secondary"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="flex flex-col gap-2">
                <SectionLabel>Audit trail</SectionLabel>
                <dl className="flex flex-col gap-1.5 hl-caption text-hl-fg-secondary">
                  <div className="flex justify-between gap-4">
                    {/* Was labelled "Recorded", which read as the decision being
                        recorded. `created_at` is when the AGENT RAISED it. */}
                    <dt className="text-hl-fg-tertiary">Raised by the agent</dt>
                    <dd className="font-hl-mono tabular-nums">
                      {fmtDate(rec.created_at)} · {fmtTime(rec.created_at)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-hl-fg-tertiary">Decided</dt>
                    <dd className={stamp ? 'font-hl-mono tabular-nums' : 'text-hl-fg-tertiary'}>
                      {stamp ? `${fmtDate(stamp)} · ${fmtTime(stamp)}` : 'Not recorded'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-hl-fg-tertiary">Decided by</dt>
                    <dd className={actor && actor !== 'You' ? 'font-hl-mono' : undefined}>
                      {actor ?? <span className="text-hl-fg-tertiary">Not recorded</span>}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-hl-fg-tertiary">Record</dt>
                    <dd className="font-hl-mono">{recordLabel(rec)}</dd>
                  </div>
                </dl>
                {/* Why this record cannot change, stated once. The DB trigger
                    freezes `decided_at`/`decided_by` on write and rejects any
                    re-decision, so the permanence claim is real rather than a
                    promise the UI makes on the database's behalf. */}
                <p className="hl-caption text-hl-fg-tertiary">
                  Frozen when the decision was recorded. This entry cannot be edited or re-decided.
                </p>
              </section>

              {rec.campaign_id && rec.candidate_id ? (
                <Link
                  href={`/jobs/${rec.campaign_id}/candidates/${rec.candidate_id}`}
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
