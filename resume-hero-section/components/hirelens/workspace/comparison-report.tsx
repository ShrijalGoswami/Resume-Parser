import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { AIAnswer } from '../domain'
import { Badge, type BadgeProps } from '../ui/badge'
import type {
  CandidateComparisonReport,
  RankingRow,
  RiskItem,
} from '@/types/comparison'

/**
 * The comparison report.
 *
 * THE BACKEND WAS ALREADY SENDING TWICE WHAT THIS RENDERED. The report carries
 * eight sections — executive summary, rankings, skills, per-candidate strength
 * profiles, typed risks, a hiring verdict with its rationale, interview focus,
 * and trade-offs — plus server-attributed `sources_used`. Four of those never
 * reached the screen, and they were precisely the ones a recruiter needs to
 * answer "why is this one ahead of that one": the rationale, the risks, and
 * what to probe in an interview. Nothing here is generated; the whole change
 * is rendering fields the response already contained.
 *
 * SCORES THAT CLUSTER MUST NOT READ AS A RANKING. The audit found composite
 * scores landing within a point or two of each other while the table presented
 * #1, #2, #3 as an order. A rank is only as meaningful as the gap under it, so
 * every row states its distance from the leader and rows inside a few points
 * are marked as too close to separate — the reader is then pointed at the
 * trade-offs and rationale, which is where a real decision gets made. The
 * numbers are never altered, hidden, or re-derived.
 */

/**
 * How close two composite scores must be before the order between them stops
 * carrying information.
 *
 * These are 0–100 composites summed from weighted rubric components and then
 * rounded, so the last couple of points are arithmetic noise rather than
 * signal. Three is a deliberately conservative floor: it flags a genuine tie
 * without ever suppressing a difference a reader could act on. It is a display
 * caution — it changes no score and no ordering.
 */
const TIE_THRESHOLD = 3

function SkillRow({
  label,
  skills,
  variant,
}: {
  label: string
  skills: string[]
  variant: NonNullable<BadgeProps['variant']>
}) {
  if (skills.length === 0) return null
  return (
    <div className="mb-1 flex flex-wrap items-start gap-1">
      <span className="hl-caption w-16 shrink-0 pt-0.5 text-hl-fg-tertiary">{label}</span>
      {skills.map((skill) => (
        <Badge key={skill} variant={variant}>
          {skill}
        </Badge>
      ))}
    </div>
  )
}

/** A per-candidate block, used by every section that keys on a candidate. */
function CandidateBlock({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-hl-md border border-hl-border bg-hl-subtle p-3">
      <p className="hl-body-medium mb-1.5 text-hl-fg">{name}</p>
      {children}
    </div>
  )
}

function PointList({ label, points }: { label: string; points: string[] }) {
  if (points.length === 0) return null
  return (
    <div className="mb-1.5">
      <span className="hl-caption text-hl-fg-tertiary">{label}</span>
      <ul className="mt-0.5 flex flex-col gap-1">
        {points.map((point, index) => (
          <li key={index} className="hl-small flex gap-2 text-hl-fg-secondary">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-hl-border-strong" aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The way out of a comparison and into one candidate's complete evaluation.
 *
 * A comparison answers "which of these", and the next question is always "show
 * me this one properly" — but the report named candidates in prose and offered
 * no route to any of them, so the reader had to close the panel, find the row
 * again, and open it from the table. `roleId` is optional because a comparison
 * can be run from Talent across a mixed result set; when the compared
 * candidates do not share one role there is no correct link to build, and a
 * wrong one is worse than none.
 */
function FullEvaluationLink({
  roleId,
  candidateId,
  name,
}: {
  roleId?: string
  candidateId: string
  name: string
}) {
  if (!roleId) return null
  return (
    <Link
      href={`/roles/${roleId}/candidates/${candidateId}`}
      className="hl-caption inline-flex items-center gap-1 whitespace-nowrap rounded-hl-md px-1.5 py-0.5 text-hl-fg-secondary outline-none hover:bg-hl-subtle hover:text-hl-fg focus-visible:bg-hl-subtle [&_svg]:size-hl-icon-sm"
      aria-label={`Full evaluation of ${name}`}
    >
      Full evaluation <ArrowUpRight aria-hidden />
    </Link>
  )
}

function Rankings({ rankings, roleId }: { rankings: RankingRow[]; roleId?: string }) {
  if (rankings.length === 0) return null
  const leader = rankings.reduce(
    (best, row) => (row.overall_score > best.overall_score ? row : best),
    rankings[0],
  )
  const clustered = rankings.filter(
    (row) => row.candidate_id !== leader.candidate_id &&
      Math.abs(leader.overall_score - row.overall_score) <= TIE_THRESHOLD,
  )

  return (
    <section>
      <h3 className="hl-h3 mb-2">Rankings</h3>

      {clustered.length > 0 ? (
        // The caution sits ABOVE the table, because by the time a reader has
        // read the order it has already done its work on them.
        <p className="mb-2 border-l-2 border-[var(--hl-accent-secondary)] pl-3 hl-small text-hl-fg-secondary">
          {clustered.length === 1
            ? `${clustered[0].name} is within ${TIE_THRESHOLD} points of ${leader.name}.`
            : `${clustered.length} candidates are within ${TIE_THRESHOLD} points of ${leader.name}.`}{' '}
          At this distance the order is not a meaningful separation — read the
          trade-offs and the rationale below rather than the rank.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-hl-lg border border-hl-border">
        <table className="w-full text-left">
          <thead className="hl-caption bg-hl-subtle text-hl-fg-tertiary">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2 text-right">Fit</th>
              <th className="px-3 py-2 text-right">vs #1</th>
              <th className="px-3 py-2 text-right">ATS</th>
              <th className="px-3 py-2">Strength</th>
              <th className="px-3 py-2">Watch</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((row) => {
              const gap = Math.round(leader.overall_score - row.overall_score)
              const isLeader = row.candidate_id === leader.candidate_id
              const tooClose = !isLeader && gap <= TIE_THRESHOLD
              return (
                <tr
                  key={row.candidate_id}
                  className="hl-small border-t border-hl-border-subtle align-top"
                >
                  <td className="hl-mono px-3 py-2 text-hl-fg-tertiary">{row.rank}</td>
                  <td className="px-3 py-2">
                    <span className="hl-body-medium text-hl-fg">{row.name}</span>
                    {tooClose ? (
                      // Said in words, never by colour alone (V2 §21).
                      <span className="mt-0.5 block hl-caption text-hl-fg-tertiary">
                        Too close to separate
                      </span>
                    ) : null}
                    <span className="mt-0.5 block">
                      <FullEvaluationLink
                        roleId={roleId}
                        candidateId={row.candidate_id}
                        name={row.name}
                      />
                    </span>
                  </td>
                  {/* The numeral is the signal; no meter, because a bar at this
                      resolution draws a difference the number does not support. */}
                  <td className="hl-mono px-3 py-2 text-right text-hl-fg">
                    {Math.round(row.overall_score)}
                  </td>
                  <td className="hl-mono px-3 py-2 text-right text-hl-fg-tertiary">
                    {isLeader ? '—' : `−${gap}`}
                  </td>
                  <td className="hl-mono px-3 py-2 text-right text-hl-fg-tertiary">
                    {Math.round(row.ats_score)}
                  </td>
                  <td className="px-3 py-2 text-hl-fg-secondary">{row.strength_summary}</td>
                  {/* `weakness_summary` was in the response and never shown —
                      half of every comparison was missing from the table. */}
                  <td className="px-3 py-2 text-hl-fg-tertiary">{row.weakness_summary}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Risks arrive typed ({ category, detail }) — the product's evidence shape. */
function RiskList({ risks }: { risks: RiskItem[] }) {
  if (risks.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {risks.map((risk, index) => (
        <li key={index} className="flex flex-col gap-0.5">
          <span className="hl-label text-hl-fg-tertiary">{risk.category}</span>
          <span className="hl-small text-hl-fg-secondary">{risk.detail}</span>
        </li>
      ))}
    </ul>
  )
}

export function ComparisonReport({
  report,
  roleId,
}: {
  report: CandidateComparisonReport
  /** Omitted when the compared candidates do not share a single role. */
  roleId?: string
}) {
  const summary = report.executive_summary
  // Server-attributed sources, exactly as the Ask surface reads them.
  const sources = report.sources_used?.map((source) => ({ label: source.source })) ?? []

  return (
    <div className="flex flex-col gap-6">
      <AIAnswer
        confidence={summary.comparison_confidence}
        sources={sources.length > 0 ? sources : undefined}
      >
        <p className="hl-body-medium">Best fit: {summary.best_candidate_name}</p>
        {summary.summary ? <p className="mt-1 text-hl-fg-secondary">{summary.summary}</p> : null}
        {/* The headline call the response carried and the panel discarded. */}
        {summary.overall_recommendation ? (
          <p className="mt-2 text-hl-fg">{summary.overall_recommendation}</p>
        ) : null}
        {summary.runner_up_name ? (
          <p className="hl-body mt-1 text-hl-fg-tertiary">Runner-up: {summary.runner_up_name}</p>
        ) : null}
      </AIAnswer>

      <Rankings rankings={report.rankings} roleId={roleId} />

      {/* WHY, per candidate — the section a recruiter actually decides from,
          and the one that was missing entirely. */}
      {report.hiring_recommendations.length > 0 ? (
        <section>
          <h3 className="hl-h3 mb-2">Recommendation & rationale</h3>
          <div className="flex flex-col gap-3">
            {report.hiring_recommendations.map((verdict) => (
              <CandidateBlock key={verdict.candidate_id} name={verdict.name}>
                {verdict.recommendation ? (
                  <p className="hl-small mb-1 text-hl-fg">{verdict.recommendation}</p>
                ) : null}
                {verdict.rationale ? (
                  <p className="hl-small border-l-2 border-[var(--hl-accent-secondary)] pl-3 text-hl-fg-secondary">
                    {verdict.rationale}
                  </p>
                ) : null}
              </CandidateBlock>
            ))}
          </div>
        </section>
      ) : null}

      {report.risks.length > 0 ? (
        <section>
          <h3 className="hl-h3 mb-2">Risks</h3>
          <div className="flex flex-col gap-3">
            {report.risks.map((profile) => (
              <CandidateBlock key={profile.candidate_id} name={profile.name}>
                <RiskList risks={profile.risks} />
              </CandidateBlock>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="hl-h3 mb-2">Skills</h3>
        <div className="flex flex-col gap-3">
          {report.skill_matrix.map((entry) => (
            <CandidateBlock key={entry.candidate_id} name={entry.name}>
              <SkillRow label="Matched" skills={entry.required_skills} variant="success" />
              <SkillRow label="Missing" skills={entry.missing_skills} variant="danger" />
              {/* Neutral, not accent: terracotta is reserved for decisions and
                  actions (V2 §3.3), and a skill chip is neither. */}
              <SkillRow label="Unique" skills={entry.unique_skills} variant="neutral" />
              <SkillRow label="Transferable" skills={entry.transferable_skills} variant="outline" />
            </CandidateBlock>
          ))}
        </div>
      </section>

      {report.strengths.length > 0 ? (
        <section>
          <h3 className="hl-h3 mb-2">Strength profile</h3>
          <div className="flex flex-col gap-3">
            {report.strengths.map((profile) => (
              <CandidateBlock key={profile.candidate_id} name={profile.name}>
                <PointList label="Technical" points={profile.technical_strengths} />
                <PointList label="Domain" points={profile.domain_strengths} />
                <PointList label="Communication" points={profile.communication_indicators} />
                <PointList label="Leadership" points={profile.leadership_indicators} />
              </CandidateBlock>
            ))}
          </div>
        </section>
      ) : null}

      {report.tradeoffs.length > 0 ? (
        <section>
          <h3 className="hl-h3 mb-2">Trade-offs</h3>
          <ul className="flex flex-col gap-2">
            {report.tradeoffs.map((tradeoff, index) => (
              <li
                key={index}
                className="hl-small rounded-hl-md border border-hl-border-subtle bg-hl-subtle p-3"
              >
                <span className="hl-body-medium">{tradeoff.scenario}: </span>
                <span className="text-hl-fg-secondary">
                  Choose {tradeoff.choose_name} — {tradeoff.reasoning}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* What to ask, so the comparison ends in an action rather than a view. */}
      {report.interview_focus.length > 0 ? (
        <section>
          <h3 className="hl-h3 mb-2">What to probe in an interview</h3>
          <div className="flex flex-col gap-3">
            {report.interview_focus.map((focus) => (
              <CandidateBlock key={focus.candidate_id} name={focus.name}>
                <PointList label="Verify" points={focus.weak_areas_to_verify} />
                <PointList label="Questions" points={focus.suggested_questions} />
                {focus.technical_topics.length > 0 ? (
                  <SkillRow label="Technical" skills={focus.technical_topics} variant="outline" />
                ) : null}
                {focus.behavioral_topics.length > 0 ? (
                  <SkillRow label="Behavioral" skills={focus.behavioral_topics} variant="outline" />
                ) : null}
              </CandidateBlock>
            ))}
          </div>
        </section>
      ) : null}

      {report.degraded ? (
        <p className="hl-caption text-hl-fg-tertiary">
          Comparison ran in reduced mode — some AI detail may be limited.
        </p>
      ) : null}
    </div>
  )
}
