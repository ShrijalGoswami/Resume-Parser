import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Trophy, Gauge, Clock, TrendingUp, AlertTriangle } from "lucide-react"
import { BatchAnalytics } from "@/types/batch"
import { scoreColor } from "@/components/recruiter/shared"

const SCORE_ORDER = ["Excellent Match", "Strong Match", "Moderate Match", "Weak Match"]
const SCORE_COLORS: Record<string, string> = {
  "Excellent Match": "bg-emerald-500",
  "Strong Match": "bg-blue-500",
  "Moderate Match": "bg-amber-500",
  "Weak Match": "bg-rose-500",
}

function StatTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <Card className="border-border/60 bg-white shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={`truncate text-2xl font-black tracking-tight ${accent ?? "text-foreground"}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function BarRow({ label, count, total, colorClass }: { label: string; count: number; total: number; colorClass: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className="font-bold tabular-nums text-foreground">{count}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
        <div className={`h-full rounded-full ${colorClass} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AnalyticsPanel({ analytics }: { analytics: BatchAnalytics }) {
  const { succeeded } = analytics
  const recEntries = Object.entries(analytics.recommendation_distribution).sort((a, b) => b[1] - a[1])
  const maxSkill = Math.max(1, ...analytics.top_skills.map((s) => s.count))
  const maxMissing = Math.max(1, ...analytics.common_missing_skills.map((s) => s.count))

  return (
    <div className="space-y-8">
      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={<Users className="size-5" />} label="Candidates" value={`${analytics.succeeded}/${analytics.total}`} />
        <StatTile icon={<Gauge className="size-5" />} label="Average Score" value={`${analytics.average_score}`} accent={scoreColor(analytics.average_score)} />
        <StatTile icon={<Trophy className="size-5" />} label="Top Candidate" value={analytics.top_candidate_name || "—"} accent={scoreColor(analytics.top_candidate_score)} />
        <StatTile icon={<Clock className="size-5" />} label="Avg Experience" value={`${analytics.average_years_experience} yrs`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Score distribution */}
        <Card className="border-border/60 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-foreground"><TrendingUp className="size-4 text-primary" /> Candidate Distribution</h3>
            <div className="space-y-4">
              {SCORE_ORDER.map((k) => (
                <BarRow key={k} label={k} count={analytics.score_distribution[k] ?? 0} total={succeeded} colorClass={SCORE_COLORS[k]} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recommendation distribution */}
        <Card className="border-border/60 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-foreground"><Gauge className="size-4 text-primary" /> Recommendation Distribution</h3>
            <div className="space-y-4">
              {recEntries.length === 0 && <p className="text-sm text-muted-foreground">No recommendations available.</p>}
              {recEntries.map(([label, count]) => (
                <BarRow key={label} label={label} count={count} total={succeeded} colorClass="bg-primary" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top skills */}
        <Card className="border-border/60 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-foreground"><TrendingUp className="size-4 text-emerald-500" /> Top Skills in Pool</h3>
            <div className="space-y-3">
              {analytics.top_skills.length === 0 && <p className="text-sm text-muted-foreground">No skills detected.</p>}
              {analytics.top_skills.map((s) => (
                <BarRow key={s.skill} label={s.skill} count={s.count} total={maxSkill} colorClass="bg-emerald-500" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Common missing skills */}
        <Card className="border-border/60 bg-white shadow-sm">
          <CardContent className="p-6">
            <h3 className="mb-5 flex items-center gap-2 text-base font-bold text-foreground"><AlertTriangle className="size-4 text-rose-500" /> Common Skill Gaps</h3>
            <div className="space-y-3">
              {analytics.common_missing_skills.length === 0 && <p className="text-sm text-muted-foreground">No common gaps — strong pool.</p>}
              {analytics.common_missing_skills.map((s) => (
                <div key={s.skill} className="flex items-center justify-between">
                  <Badge variant="outline" className="border-rose-200 bg-rose-50 font-medium text-rose-700">{s.skill}</Badge>
                  <span className="text-sm font-bold text-muted-foreground">{s.count} candidates</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
