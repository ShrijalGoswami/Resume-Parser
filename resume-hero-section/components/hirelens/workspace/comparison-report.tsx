import { AIAnswer } from '../domain'
import { ScoreMeter } from '../domain/score-meter'
import { Badge, type BadgeProps } from '../ui/badge'
import type { CandidateComparisonReport } from '@/types/comparison'

/** Renders the AI comparison report (Design Bible §7.3). */
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

export function ComparisonReport({ report }: { report: CandidateComparisonReport }) {
  const summary = report.executive_summary
  return (
    <div className="flex flex-col gap-5">
      <AIAnswer confidence={summary.comparison_confidence}>
        <p className="hl-body-medium">Best fit: {summary.best_candidate_name}</p>
        {summary.summary ? <p className="mt-1 text-hl-fg-secondary">{summary.summary}</p> : null}
        {summary.runner_up_name ? (
          <p className="hl-small mt-1 text-hl-fg-tertiary">Runner-up: {summary.runner_up_name}</p>
        ) : null}
      </AIAnswer>

      <section>
        <h3 className="hl-h3 mb-2">Rankings</h3>
        <div className="overflow-x-auto rounded-hl-lg border border-hl-border">
          <table className="w-full text-left">
            <thead className="hl-caption bg-hl-subtle text-hl-fg-tertiary">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Fit</th>
                <th className="px-3 py-2">ATS</th>
                <th className="px-3 py-2">Strength</th>
              </tr>
            </thead>
            <tbody>
              {report.rankings.map((row) => (
                <tr
                  key={row.candidate_id}
                  className="hl-small border-t border-hl-border-subtle align-top"
                >
                  <td className="hl-mono px-3 py-2">{row.rank}</td>
                  <td className="hl-body-medium px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2">
                    <ScoreMeter score={row.overall_score} showLabel={false} />
                  </td>
                  <td className="hl-mono px-3 py-2">{Math.round(row.ats_score)}</td>
                  <td className="px-3 py-2 text-hl-fg-secondary">{row.strength_summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="hl-h3 mb-2">Skills</h3>
        <div className="flex flex-col gap-3">
          {report.skill_matrix.map((entry) => (
            <div key={entry.candidate_id} className="rounded-hl-md border border-hl-border p-3">
              <p className="hl-body-medium mb-1">{entry.name}</p>
              <SkillRow label="Matched" skills={entry.required_skills} variant="success" />
              <SkillRow label="Missing" skills={entry.missing_skills} variant="danger" />
              <SkillRow label="Unique" skills={entry.unique_skills} variant="accent" />
            </div>
          ))}
        </div>
      </section>

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

      {report.degraded ? (
        <p className="hl-caption text-hl-fg-tertiary">
          Comparison ran in reduced mode — some AI detail may be limited.
        </p>
      ) : null}
    </div>
  )
}
