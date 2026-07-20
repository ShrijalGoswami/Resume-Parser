import { Section, SkillList, FactorBars, EmptyHint } from './parts'
import type { CandidateResult } from '@/types/batch'
import type { ExperienceEntry, EducationEntry, ProjectEntry, ScoreComponent } from '@/types/batch'

function ComponentBars({ components }: { components: ScoreComponent[] }) {
  return (
    <div className="flex flex-col gap-2">
      {components.map((component) => {
        const pct = component.max > 0 ? Math.round((component.earned / component.max) * 100) : 0
        return (
          <div key={component.key} className="flex items-center gap-3">
            <span className="hl-small w-32 shrink-0 text-hl-fg-secondary">{component.name}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-hl-muted">
              <div className="h-full rounded-full bg-hl-accent" style={{ width: `${pct}%` }} />
            </div>
            <span className="hl-mono w-16 text-right text-[13px]">
              {Math.round(component.earned)}/{Math.round(component.max)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function BulletLists({
  left,
  right,
}: {
  left: { label: string; items: string[] }
  right: { label: string; items: string[] }
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[left, right].map((column) =>
        column.items.length > 0 ? (
          <div key={column.label}>
            <p className="hl-caption mb-1 text-hl-fg-tertiary">{column.label}</p>
            <ul className="hl-small list-disc space-y-1 pl-4 text-hl-fg-secondary">
              {column.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  )
}

function ExperienceTimeline({ items }: { items: ExperienceEntry[] }) {
  return (
    <ol className="flex flex-col gap-4 border-l border-hl-border pl-4">
      {items.map((entry, index) => (
        <li key={index} className="relative">
          <span
            className="absolute -left-[1.35rem] top-1.5 size-2 rounded-full bg-hl-border-strong"
            aria-hidden
          />
          <p className="hl-body-medium">
            {entry.role}
            {entry.company ? ` · ${entry.company}` : ''}
          </p>
          {entry.duration ? (
            <p className="hl-caption text-hl-fg-tertiary">{entry.duration}</p>
          ) : null}
          {entry.description && entry.description.length > 0 ? (
            <ul className="hl-small mt-1 list-disc space-y-0.5 pl-4 text-hl-fg-secondary">
              {entry.description.slice(0, 4).map((line, lineIndex) => (
                <li key={lineIndex}>{line}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function EducationList({ items }: { items: EducationEntry[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((entry, index) => (
        <li key={index} className="rounded-hl-md border border-hl-border-subtle p-2">
          <p className="hl-body-medium">{entry.degree || entry.institution}</p>
          <p className="hl-caption text-hl-fg-tertiary">
            {[entry.institution, entry.duration, entry.gpa ? `GPA ${entry.gpa}` : '']
              .filter(Boolean)
              .join(' · ')}
          </p>
        </li>
      ))}
    </ul>
  )
}

function ProjectsList({ items }: { items: ProjectEntry[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((project, index) => (
        <li key={index}>
          <p className="hl-body-medium">{project.title}</p>
          {project.description && project.description.length > 0 ? (
            <ul className="hl-small list-disc space-y-0.5 pl-4 text-hl-fg-secondary">
              {project.description.slice(0, 3).map((line, lineIndex) => (
                <li key={lineIndex}>{line}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/**
 * Analysis tab (UX Spec §7.4) — read-only truth from the stored analysis. The
 * densest surface in HireLens; every value comes from latest_analysis.result.
 */
export function AnalysisTab({ result }: { result: CandidateResult | null }) {
  if (!result) {
    return <EmptyHint text="This candidate hasn't been analyzed yet." />
  }
  const resume = result.resume_data

  return (
    <div className="flex flex-col gap-5">
      <Section title="ATS breakdown">
        <FactorBars
          factors={[
            { label: 'Technical skills', value: result.ats_breakdown.technical_skills },
            { label: 'Projects', value: result.ats_breakdown.projects },
            { label: 'Experience', value: result.ats_breakdown.experience },
            { label: 'Education', value: result.ats_breakdown.education },
            { label: 'Impact', value: result.ats_breakdown.impact },
          ]}
        />
      </Section>

      {result.score && result.score.components.length > 0 ? (
        <Section title="Score components">
          <ComponentBars components={result.score.components} />
        </Section>
      ) : null}

      <Section title="Skills">
        <div className="flex flex-col gap-2">
          <SkillList label="Matched" skills={result.matching_skills} variant="success" />
          <SkillList label="Missing" skills={result.missing_skills} variant="danger" />
          <SkillList label="Top" skills={result.top_skills} variant="accent" />
        </div>
      </Section>

      {result.strengths.length > 0 || result.weaknesses.length > 0 ? (
        <Section title="Assessment">
          <BulletLists
            left={{ label: 'Strengths', items: result.strengths }}
            right={{ label: 'Watch-outs', items: result.weaknesses }}
          />
        </Section>
      ) : null}

      {resume && resume.experience.length > 0 ? (
        <Section title="Experience">
          <ExperienceTimeline items={resume.experience} />
          {result.experience_relevance ? (
            <p className="hl-small mt-2 text-hl-fg-secondary">{result.experience_relevance}</p>
          ) : null}
        </Section>
      ) : null}

      {resume && resume.projects.length > 0 ? (
        <Section title="Projects">
          <ProjectsList items={resume.projects} />
        </Section>
      ) : null}

      {resume && resume.education.length > 0 ? (
        <Section title="Education">
          <EducationList items={resume.education} />
        </Section>
      ) : null}

      {resume && resume.certifications.length > 0 ? (
        <Section title="Certifications">
          <SkillList label="" skills={resume.certifications} variant="neutral" />
        </Section>
      ) : null}
    </div>
  )
}
