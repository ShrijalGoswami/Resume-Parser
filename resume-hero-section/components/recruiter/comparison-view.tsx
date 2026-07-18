import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import { CandidateResult } from "@/types/batch"
import { ScoreRing, RecommendationBadge, scoreColor } from "@/components/recruiter/shared"

/** Side-by-side comparison of selected candidates. */
export function ComparisonView({ candidates }: { candidates: CandidateResult[] }) {
  if (candidates.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/60 py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
          <Users className="size-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Select candidates to compare</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Tick 2 or more candidates in the Ranked Candidates tab to see a side-by-side comparison.
        </p>
      </div>
    )
  }

  const rows: { label: string; render: (c: CandidateResult) => React.ReactNode }[] = [
    { label: "Rank", render: (c) => <span className="font-bold">#{c.rank}</span> },
    { label: "Overall", render: (c) => <span className={`text-lg font-black ${scoreColor(c.overall_score)}`}>{c.overall_score}</span> },
    { label: "Category", render: (c) => <Badge variant="outline" className="font-semibold">{c.match_category}</Badge> },
    { label: "Recommendation", render: (c) => <RecommendationBadge rec={c.recommendation} /> },
    { label: "ATS Score", render: (c) => <span className="font-semibold">{c.ats_score}</span> },
    { label: "Experience", render: (c) => <span>{c.years_experience} yrs</span> },
    { label: "Skills Matched", render: (c) => <span className="font-semibold text-emerald-600">{c.matching_skills.length}</span> },
    { label: "Skills Missing", render: (c) => <span className="font-semibold text-rose-600">{c.missing_skills.length}</span> },
    {
      label: "Missing Skills",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.missing_skills.slice(0, 6).map((s, i) => (
            <Badge key={i} variant="outline" className="border-rose-200 bg-rose-50 text-xs text-rose-700">{s}</Badge>
          ))}
          {c.missing_skills.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
        </div>
      ),
    },
    {
      label: "Top Skills",
      render: (c) => (
        <div className="flex flex-wrap gap-1">
          {c.top_skills.slice(0, 6).map((s, i) => (
            <Badge key={i} variant="secondary" className="border-primary/10 bg-primary/5 text-xs text-primary">{s}</Badge>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-white shadow-sm">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="p-4 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">Metric</th>
            {candidates.map((c) => (
              <th key={c.candidate_id} className="p-4 text-center align-bottom">
                <div className="flex flex-col items-center gap-2">
                  <ScoreRing score={c.overall_score} size={72} stroke={6} />
                  <span className="max-w-[140px] truncate text-sm font-bold text-foreground">{c.name}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.label} className={ri % 2 === 0 ? "bg-white" : "bg-muted/20"}>
              <td className="p-4 text-sm font-semibold text-muted-foreground">{row.label}</td>
              {candidates.map((c) => (
                <td key={c.candidate_id} className="p-4 text-center text-sm text-foreground/80">{row.render(c)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
