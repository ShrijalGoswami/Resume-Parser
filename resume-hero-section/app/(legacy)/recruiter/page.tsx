"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft, UploadCloud, FileText, X, Users, Loader2, Sparkles,
  Trophy, BarChart3, GitCompareArrows, Eye, AlertCircle, RotateCcw,
} from "lucide-react"
import { analyzeBatch } from "@/services/api"
import { BatchAnalysisResponse, CandidateResult } from "@/types/batch"
import { CandidateDetailDialog } from "@/components/recruiter/candidate-detail"
import { AnalyticsPanel } from "@/components/recruiter/analytics-panel"
import { ComparisonView } from "@/components/recruiter/comparison-view"
import { ScoreRing, RecommendationBadge, scoreColor } from "@/components/recruiter/shared"

const ALLOWED = [".pdf", ".docx"]
const MAX_COMPARE = 4

function isAllowed(file: File): boolean {
  const lower = file.name.toLowerCase()
  return ALLOWED.some((ext) => lower.endsWith(ext))
}

export default function RecruiterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [jobDescription, setJobDescription] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<BatchAnalysisResponse | null>(null)

  const [detail, setDetail] = useState<CandidateResult | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState("ranked")

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming)
    const valid = arr.filter(isAllowed)
    const skipped = arr.length - valid.length
    if (skipped > 0) {
      toast({ title: "Some files skipped", description: `${skipped} file(s) were not PDF or DOCX.`, variant: "destructive" })
    }
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      const merged = [...prev]
      for (const f of valid) {
        const key = `${f.name}:${f.size}`
        if (!seen.has(key)) { seen.add(key); merged.push(f) }
      }
      return merged
    })
  }, [toast])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx))

  const runAnalysis = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "Job description required", description: "Paste the job description first.", variant: "destructive" }); return
    }
    if (files.length === 0) {
      toast({ title: "No resumes", description: "Add at least one resume (PDF or DOCX).", variant: "destructive" }); return
    }
    setIsAnalyzing(true)
    try {
      const res = await analyzeBatch(jobDescription.trim(), files)
      setResult(res)
      setSelected(new Set())
      setTab("ranked")
      if (res.analytics.failed > 0) {
        toast({ title: "Analysis complete", description: `${res.analytics.succeeded} ranked · ${res.analytics.failed} could not be processed.` })
      }
    } catch (err) {
      toast({
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Unexpected error running batch analysis.",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const reset = () => {
    setResult(null); setFiles([]); setJobDescription(""); setSelected(new Set()); setTab("ranked")
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_COMPARE) next.add(id)
      else toast({ title: "Comparison limit", description: `You can compare up to ${MAX_COMPARE} candidates.` })
      return next
    })
  }

  const openDetail = (c: CandidateResult) => { setDetail(c); setDetailOpen(true) }

  const succeeded = result?.candidates.filter((c) => c.status === "success") ?? []
  const failed = result?.candidates.filter((c) => c.status === "failed") ?? []
  const selectedCandidates = succeeded.filter((c) => selected.has(c.candidate_id))

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] pb-24">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to Analyzer
          </Button>
          {result && (
            <Button variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="size-4" /> New Analysis
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary">
            <Sparkles className="size-4" /> Recruiter Workspace
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Rank candidates against a role</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Upload one job description and a batch of resumes. HireLens parses, scores, and ranks every candidate with explainable AI.
          </p>
        </div>

        {!result ? (
          /* ── Upload workspace ─────────────────────────────────────────── */
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <label htmlFor="jd" className="mb-3 block text-sm font-bold text-foreground">Job Description</label>
                <Textarea
                  id="jd"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description, including required skills, experience, and responsibilities…"
                  className="h-72 resize-none"
                />
                <p className="mt-2 text-xs text-muted-foreground">{jobDescription.trim().length} characters</p>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-white shadow-sm">
              <CardContent className="p-6">
                <span className="mb-3 block text-sm font-bold text-foreground">Resumes ({files.length})</span>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                    dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <UploadCloud className="size-6 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">Drag & drop resumes here</p>
                  <p className="mt-1 text-sm text-muted-foreground">or click to browse · PDF or DOCX</p>
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = "" }}
                  />
                </div>

                {files.length > 0 && (
                  <div className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {files.map((f, i) => (
                      <div key={`${f.name}:${f.size}`} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                        <FileText className="size-4 shrink-0 text-primary" />
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground/80">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                        <button onClick={(e) => { e.stopPropagation(); removeFile(i) }} className="text-muted-foreground hover:text-rose-500" aria-label={`Remove ${f.name}`}>
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-2">
              <Button size="lg" onClick={runAnalysis} disabled={isAnalyzing} className="h-14 w-full gap-2 rounded-xl text-base shadow-lg">
                {isAnalyzing ? (
                  <><Loader2 className="size-5 animate-spin" /> Analyzing {files.length} resume{files.length === 1 ? "" : "s"}…</>
                ) : (
                  <><Sparkles className="size-5" /> Rank {files.length || ""} Candidate{files.length === 1 ? "" : "s"}</>
                )}
              </Button>
              {isAnalyzing && (
                <div className="mt-4 overflow-hidden rounded-full bg-muted">
                  <div className="h-1.5 w-1/3 animate-[loading_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Results workspace ────────────────────────────────────────── */
          <div>
            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <Card className="border-border/60 bg-white shadow-sm"><CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="size-5" /></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Ranked</p><p className="text-2xl font-black">{result.analytics.succeeded}<span className="text-base font-medium text-muted-foreground">/{result.analytics.total}</span></p></div>
              </CardContent></Card>
              <Card className="border-border/60 bg-white shadow-sm"><CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600"><Trophy className="size-5" /></div>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase text-muted-foreground">Top Candidate</p><p className="truncate text-xl font-black">{result.analytics.top_candidate_name || "—"}</p></div>
              </CardContent></Card>
              <Card className="border-border/60 bg-white shadow-sm"><CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="size-5" /></div>
                <div><p className="text-xs font-semibold uppercase text-muted-foreground">Average Score</p><p className={`text-2xl font-black ${scoreColor(result.analytics.average_score)}`}>{result.analytics.average_score}</p></div>
              </CardContent></Card>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <TabsList>
                  <TabsTrigger value="ranked" className="gap-1.5"><Trophy className="size-4" /> Ranked</TabsTrigger>
                  <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="size-4" /> Analytics</TabsTrigger>
                  <TabsTrigger value="compare" className="gap-1.5"><GitCompareArrows className="size-4" /> Compare {selected.size > 0 && `(${selected.size})`}</TabsTrigger>
                </TabsList>
                {tab === "ranked" && selected.size >= 2 && (
                  <Button size="sm" onClick={() => setTab("compare")} className="gap-1.5"><GitCompareArrows className="size-4" /> Compare {selected.size}</Button>
                )}
              </div>

              {/* Ranked table */}
              <TabsContent value="ranked" className="mt-0">
                <div className="overflow-x-auto rounded-2xl border border-border/60 bg-white shadow-sm">
                  <table className="w-full min-w-[820px] border-collapse">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/30 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        <th className="p-4 w-10"></th>
                        <th className="p-4 w-14">Rank</th>
                        <th className="p-4">Candidate</th>
                        <th className="p-4">Score</th>
                        <th className="p-4">Recommendation</th>
                        <th className="p-4">Exp</th>
                        <th className="p-4">Top Skills</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {succeeded.map((c) => (
                        <tr key={c.candidate_id} className="border-b border-border/40 transition-colors hover:bg-muted/20">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selected.has(c.candidate_id)}
                              onChange={() => toggleSelect(c.candidate_id)}
                              className="size-4 cursor-pointer accent-[var(--primary)]"
                              aria-label={`Select ${c.name}`}
                            />
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-black ${c.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{c.rank}</span>
                          </td>
                          <td className="p-4">
                            <button onClick={() => openDetail(c)} className="text-left">
                              <p className="font-bold text-foreground hover:text-primary">{c.name}</p>
                              <p className="text-xs text-muted-foreground">{c.email || c.filename}</p>
                            </button>
                          </td>
                          <td className="p-4"><span className={`text-lg font-black ${scoreColor(c.overall_score)}`}>{c.overall_score}</span></td>
                          <td className="p-4"><RecommendationBadge rec={c.recommendation} /></td>
                          <td className="p-4 text-sm font-medium text-foreground/80">{c.years_experience} yrs</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {c.top_skills.slice(0, 3).map((s, i) => (
                                <Badge key={i} variant="secondary" className="border-primary/10 bg-primary/5 text-xs text-primary">{s}</Badge>
                              ))}
                              {c.top_skills.length > 3 && <span className="text-xs text-muted-foreground">+{c.top_skills.length - 3}</span>}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <Button size="sm" variant="outline" onClick={() => openDetail(c)} className="gap-1.5"><Eye className="size-3.5" /> View</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {failed.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-800"><AlertCircle className="size-4" /> {failed.length} file(s) could not be processed</p>
                    <ul className="space-y-1">
                      {failed.map((c) => (
                        <li key={c.candidate_id} className="text-sm text-rose-700/80"><span className="font-medium">{c.filename}</span> — {c.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="analytics" className="mt-0">
                <AnalyticsPanel analytics={result.analytics} />
              </TabsContent>

              <TabsContent value="compare" className="mt-0">
                <ComparisonView candidates={selectedCandidates} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <CandidateDetailDialog candidate={detail} open={detailOpen} onOpenChange={setDetailOpen} jobDescription={result?.job_description ?? ""} />
    </div>
  )
}
