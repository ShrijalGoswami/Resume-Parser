import * as React from 'react'
import type { CandidateModel } from '../model'

/**
 * The résumé record — the parsed document, beside the claims about it.
 *
 * WHAT THIS IS NOT: a citation. HireLens does not currently produce
 * span-level references — no claim in the analysis carries a pointer to the
 * line of the résumé it came from. Rendering this record next to the read and
 * calling it "sources" would be a lie the reader could not detect, which is
 * the one failure this product cannot afford.
 *
 * WHAT IT IS: the same structured `resume_data` the analysis was computed
 * from, laid out so a person can check a claim by eye. "Experience with
 * Docker" is either visible in the roles and projects below or it is not, and
 * a reader who scans them is doing verification the tool cannot yet do for
 * them. The heading and the note beside it say exactly that.
 */
export function CandidateResumeRecord({ model }: { model: CandidateModel }) {
  const data = model.resumeData
  if (!data) return null

  const hasAnything =
    (data.experience?.length ?? 0) > 0 ||
    (data.projects?.length ?? 0) > 0 ||
    (data.education?.length ?? 0) > 0 ||
    (data.certifications?.length ?? 0) > 0

  if (!hasAnything) return null

  return (
    <section aria-labelledby="hl-record-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="hl-record-heading" className="hl-h3 text-hl-fg">
          From the résumé
        </h2>
        {/* The honesty line. Copper marks it as a note about the evidence
            itself (V2 §16), and it states the limitation in plain words. */}
        <p className="border-l-2 border-[var(--hl-accent-secondary)] pl-3 hl-caption text-hl-fg-secondary">
          What the parser read, so each claim can be checked against it.
          HireLens does not yet cite the exact line a claim came from.
        </p>
      </div>

      {data.experience?.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="hl-label text-hl-fg-tertiary">Experience</h3>
          <ul className="flex flex-col gap-4">
            {data.experience.map((role, index) => (
              <li key={`${role.company}-${index}`} className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="hl-body-medium text-hl-fg">
                    {role.role || 'Role not stated'}
                  </span>
                  {/* A duration is technical metadata, so it is mono (V2 §4). */}
                  {role.duration ? (
                    <span className="hl-mono hl-caption text-hl-fg-tertiary">{role.duration}</span>
                  ) : null}
                </div>
                {role.company ? (
                  <span className="hl-small text-hl-fg-secondary">{role.company}</span>
                ) : null}
                {role.description?.length > 0 ? (
                  <ul className="mt-0.5 flex flex-col gap-1">
                    {role.description.map((line, i) => (
                      <li key={i} className="hl-small flex gap-2 text-hl-fg-secondary">
                        <span
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-hl-border-strong"
                          aria-hidden
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.projects?.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-hl-border-subtle pt-4">
          <h3 className="hl-label text-hl-fg-tertiary">Projects</h3>
          <ul className="flex flex-col gap-3">
            {data.projects.map((project, index) => (
              <li key={`${project.title}-${index}`} className="flex flex-col gap-1">
                <span className="hl-body-medium text-hl-fg">{project.title}</span>
                {project.description?.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {project.description.map((line, i) => (
                      <li key={i} className="hl-small flex gap-2 text-hl-fg-secondary">
                        <span
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-hl-border-strong"
                          aria-hidden
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.education?.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-hl-border-subtle pt-4">
          <h3 className="hl-label text-hl-fg-tertiary">Education</h3>
          <ul className="flex flex-col gap-2">
            {data.education.map((entry, index) => (
              <li key={`${entry.institution}-${index}`} className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="hl-body-medium text-hl-fg">
                    {entry.degree || entry.institution}
                  </span>
                  {entry.duration ? (
                    <span className="hl-mono hl-caption text-hl-fg-tertiary">{entry.duration}</span>
                  ) : null}
                </div>
                {entry.degree && entry.institution ? (
                  <span className="hl-small text-hl-fg-secondary">{entry.institution}</span>
                ) : null}
                {entry.gpa ? (
                  <span className="hl-caption text-hl-fg-tertiary">
                    GPA <span className="hl-mono">{entry.gpa}</span>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.certifications?.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-hl-border-subtle pt-4">
          <h3 className="hl-label text-hl-fg-tertiary">Certifications</h3>
          <ul className="flex flex-col gap-1">
            {data.certifications.map((cert, index) => (
              <li key={index} className="hl-small text-hl-fg-secondary">
                {cert}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
