"use client"

import { useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Download, Mail, Phone, CheckCircle2, AlertCircle, Zap, Target,
  LayoutGrid, Briefcase, GraduationCap, MessageSquareQuote, Bot,
} from "lucide-react"
import { CandidateResult } from "@/types/batch"
import { exportCandidateReport } from "@/services/api"
import { useToast } from "@/components/ui/use-toast"
import { ScoreRing, ScoreBar, RecommendationBadge } from "@/components/recruiter/shared"
import { CopilotPanel } from "@/components/recruiter/copilot-panel"

const ATS_MAX: Record<string, number> = {
  technical_skills: 30, projects: 25, experience: 20, education: 10, impact: 15,
}

export function CandidateDetailDialog({
  candidate,
  open,
  onOpenChange,
  jobDescription = "",
}: {
  candidate: CandidateResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
  jobDescription?: string
}) {
  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)

  if (!candidate) return null

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportCandidateReport(candidate)
    } catch {
      toast({ title: "Export failed", description: "Could not generate the candidate PDF.", variant: "destructive" })
    } finally {
      setIsExporting(false)
    }
  }

  const resume = candidate.resume_data
  const ats = candidate.ats_breakdown

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-border/60 bg-muted/30 px-6 py-5">
          <DialogTitle className="text-xl font-bold">{candidate.name || candidate.filename}</DialogTitle>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {candidate.email && <span className="flex items-center gap-1.5"><Mail className="size-3.5" />{candidate.email}</span>}
            {candidate.phone && <span className="flex items-center gap-1.5"><Phone className="size-3.5" />{candidate.phone}</span>}
          </div>
        </DialogHeader>

        <Tabs defaultValue="profile" className="px-6 py-6">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="copilot" className="gap-1.5"><Bot className="size-4" /> AI Copilot</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0 space-y-8">
          {/* Score + recommendation */}
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-border/60 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <ScoreRing score={candidate.overall_score} size={110} label="Overall" />
              <div>
                <Badge variant="outline" className="mb-2 font-semibold">{candidate.match_category}</Badge>
                <div><RecommendationBadge rec={candidate.recommendation} /></div>
                <div className="mt-2 text-sm text-muted-foreground">
                  ATS {candidate.ats_score} · {candidate.years_experience} yrs · similarity {(candidate.semantic_similarity * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            <Button onClick={handleExport} disabled={isExporting} className="gap-2">
              <Download className="size-4" />
              {isExporting ? "Generating…" : "Export PDF"}
            </Button>
          </div>

          {/* Summary */}
          {candidate.summary && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground"><Target className="size-4 text-primary" /> Recruiter Summary</h3>
              <p className="rounded-xl border border-border/50 bg-muted/20 p-4 text-sm leading-relaxed text-foreground/80">{candidate.summary}</p>
              {candidate.recommendation_explanation && (
                <p className="mt-3 border-l-4 border-amber-200 pl-4 text-sm italic text-foreground/70">{candidate.recommendation_explanation}</p>
              )}
            </section>
          )}

          {/* Overall score breakdown */}
          {candidate.score && candidate.score.components.length > 0 && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground"><LayoutGrid className="size-4 text-indigo-500" /> Score Breakdown</h3>
              <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {candidate.score.components.map((c) => (
                  <ScoreBar key={c.key} label={c.name} earned={c.earned} max={c.max} colorClass="bg-indigo-500" />
                ))}
              </div>
            </section>
          )}

          {/* ATS breakdown */}
          {ats && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground"><LayoutGrid className="size-4 text-primary" /> ATS Structure</h3>
              <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                {Object.entries(ATS_MAX).map(([key, max]) => (
                  <ScoreBar
                    key={key}
                    label={key.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}
                    earned={(ats as unknown as Record<string, number>)[key] ?? 0}
                    max={max}
                    colorClass="bg-primary"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Skill match */}
          {(candidate.matching_skills.length > 0 || candidate.missing_skills.length > 0) && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground"><Zap className="size-4 text-amber-500" /> Skill Match</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm font-bold text-emerald-700">Matching ({candidate.matching_skills.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.matching_skills.map((s, i) => (
                      <Badge key={i} variant="secondary" className="border-emerald-200 bg-emerald-50 font-medium text-emerald-700">✓ {s}</Badge>
                    ))}
                    {candidate.matching_skills.length === 0 && <span className="text-sm text-muted-foreground">None identified</span>}
                  </div>
                </div>
                <div>
                  <p className="mb-3 text-sm font-bold text-rose-700">Missing ({candidate.missing_skills.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.missing_skills.map((s, i) => (
                      <Badge key={i} variant="outline" className="border-rose-200 bg-rose-50 font-medium text-rose-700">✕ {s}</Badge>
                    ))}
                    {candidate.missing_skills.length === 0 && <span className="text-sm text-muted-foreground">None — full coverage</span>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Strengths / weaknesses */}
          {(candidate.strengths.length > 0 || candidate.weaknesses.length > 0) && (
            <section className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 className="size-4 text-emerald-600" /> Strengths</h3>
                <ul className="space-y-2.5">
                  {candidate.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-rose-800"><AlertCircle className="size-4 text-rose-600" /> Weaknesses</h3>
                <ul className="space-y-2.5">
                  {candidate.weaknesses.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80"><AlertCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />{w}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Interview questions */}
          {candidate.interview_questions.length > 0 && (
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-foreground"><MessageSquareQuote className="size-4 text-violet-500" /> Suggested Interview Questions</h3>
              <ol className="space-y-3">
                {candidate.interview_questions.map((q, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-border/50 bg-white p-4 text-sm text-foreground/80">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">{i + 1}</span>
                    {q}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Experience + education */}
          {resume && (resume.experience.length > 0 || resume.education.length > 0) && (
            <section className="grid gap-6 sm:grid-cols-2">
              {resume.experience.length > 0 && (
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground"><Briefcase className="size-4 text-primary" /> Experience</h3>
                  <div className="space-y-3">
                    {resume.experience.map((e, i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-white p-4">
                        <p className="font-bold text-foreground">{e.role || "Role"}</p>
                        <p className="text-sm text-primary">{e.company}</p>
                        <p className="text-xs text-muted-foreground">{e.duration}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {resume.education.length > 0 && (
                <div>
                  <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground"><GraduationCap className="size-4 text-primary" /> Education</h3>
                  <div className="space-y-3">
                    {resume.education.map((e, i) => (
                      <div key={i} className="rounded-xl border border-border/50 bg-white p-4">
                        <p className="font-bold text-foreground">{e.degree || "Degree"}</p>
                        <p className="text-sm text-primary">{e.institution}</p>
                        <p className="text-xs text-muted-foreground">{e.duration}{e.gpa ? ` · ${e.gpa}` : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
          </TabsContent>

          <TabsContent value="copilot" className="mt-0">
            <CopilotPanel candidate={candidate} jobDescription={jobDescription} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
