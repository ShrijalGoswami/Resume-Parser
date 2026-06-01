"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, Download, Zap, AlertCircle, CheckCircle2, 
  Lightbulb, Target, Briefcase, FileText, User, Mail, Phone,
  GraduationCap, Medal, Code, LayoutGrid, Calendar, ChevronRight, Activity, TrendingUp
} from "lucide-react"
import { exportAtsReport, exportMatchReport } from "../../services/api"
import { useToast } from "@/components/ui/use-toast"

const categorizeSkills = (skills: string[]) => {
  const categories = {
    "Languages": ["python", "javascript", "typescript", "c++", "c#", "java", "ruby", "go", "rust", "php", "sql", "r", "swift", "kotlin", "html", "css"],
    "ML / AI": ["pytorch", "tensorflow", "keras", "scikit-learn", "pandas", "numpy", "langchain", "openai", "llm", "nlp", "machine learning", "deep learning", "cv", "computer vision", "huggingface", "bm25", "transformers"],
    "Backend / Frontend": ["react", "next.js", "vue", "angular", "svelte", "node.js", "express", "fastapi", "django", "flask", "spring", "asp.net", "graphql", "rest"],
    "Tools": ["git", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "jenkins", "github actions", "gitlab", "jira", "terraform", "ansible", "firebase", "supabase", "mongodb", "postgresql", "mysql", "redis", "kafka", "streamlit"]
  };

  const result: Record<string, string[]> = {
    "Languages": [],
    "ML / AI": [],
    "Backend / Frontend": [],
    "Tools": [],
    "Other Technologies": []
  };

  skills.forEach(skill => {
    const s = skill.toLowerCase();
    let categorized = false;
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(k => s.includes(k) || s === k)) {
        result[category].push(skill);
        categorized = true;
        break;
      }
    }
    if (!categorized) {
      result["Other Technologies"].push(skill);
    }
  });

  return result;
}

export default function ResultsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("resumeAnalysisResult");
      if (stored) {
        setData(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse session data", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-primary font-medium tracking-wide">Initializing Intelligence Dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="mb-8 flex size-20 items-center justify-center rounded-full bg-muted shadow-inner">
          <FileText className="size-10 text-muted-foreground" />
        </div>
        <h1 className="mb-4 text-3xl font-bold text-foreground text-center">No Analysis Available</h1>
        <p className="mb-8 max-w-md text-center text-muted-foreground">
          We couldn't find an active session. Please return to the homepage and upload your resume to generate a new analysis report.
        </p>
        <Button onClick={() => router.push("/")} className="gap-2 bg-primary">
          <ArrowLeft className="size-4" />
          Return to Analyzer
        </Button>
      </div>
    );
  }

  // Extract variables
  const isMatchMode = !!data.match_analysis;
  const analysisObj = isMatchMode ? data.match_analysis : data.analysis;
  const resumeObj = data.resume_data || {};
  
  const scoreLabel = isMatchMode ? "Match Score" : "ATS Score";
  const scoreValue = isMatchMode ? analysisObj.job_match_score : analysisObj.ats_score;
  const summary = analysisObj.candidate_summary || analysisObj.summary || "No summary provided.";
  const skills = resumeObj.skills || [];
  const categorizedSkills = categorizeSkills(skills);
  
  const strengths = analysisObj.candidate_strengths || analysisObj.ats_tips || [];
  const weaknesses = analysisObj.areas_for_improvement || analysisObj.improvement_areas || [];
  const recommendations = analysisObj.career_recommendations || [];
  const roles = analysisObj.recommended_roles || [];
  const readiness = analysisObj.interview_readiness || "";
  const matchCategory = analysisObj.match_category || "";
  const recommendationExplanation = analysisObj.recommendation_explanation || analysisObj.hiring_recommendation || "";
  const analysisVersion = analysisObj.analysis_version || "v1.1";

  const breakdown = analysisObj.score_breakdown || {};
  const experience = resumeObj.experience || [];
  const education = resumeObj.education || [];
  const projects = resumeObj.projects || [];
  const certifications = resumeObj.certifications || [];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (isMatchMode) {
        await exportMatchReport(data);
      } else {
        await exportAtsReport(data);
      }
    } catch (err) {
      console.error("Export failed", err);
      toast({
        title: "Export Failed",
        description: "An error occurred while generating the PDF.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] pb-24 relative overflow-hidden">
      {/* Background Decor */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(#1E293B 1px, transparent 1px), linear-gradient(90deg, #1E293B 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="pointer-events-none absolute left-0 top-0 h-[600px] w-full bg-gradient-to-b from-primary/5 via-transparent to-transparent" />

      {/* Navigation */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <Button variant="ghost" onClick={() => router.push("/")} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Back to Analyzer
        </Button>
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6">
        
        {/* 1. Unified Intelligence Hero */}
        <div className="mb-8 rounded-3xl border border-border/60 bg-white/60 p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
          <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-12">
            
            {/* Left: Profile & Actions */}
            <div className="flex flex-col items-center text-center md:items-start md:text-left flex-1">
              <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/10 shadow-inner">
                <User className="size-10 text-primary" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl lg:text-6xl mb-4">
                {resumeObj.name || "Candidate Profile"}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 text-base text-muted-foreground mb-8">
                {resumeObj.email && (
                  <span className="flex items-center gap-2"><Mail className="size-4" />{resumeObj.email}</span>
                )}
                {resumeObj.phone && (
                  <span className="flex items-center gap-2"><Phone className="size-4" />{resumeObj.phone}</span>
                )}
              </div>
              
              <Button size="lg" onClick={handleExport} disabled={isExporting} className="gap-2 h-14 px-8 rounded-xl bg-foreground text-background hover:bg-foreground/90 shadow-xl transition-all hover:-translate-y-1">
                <Download className="size-5" />
                {isExporting ? "Generating Report..." : "Download Intelligence Report"}
              </Button>
            </div>

            {/* Right: The Core ATS Ring */}
            <div className="relative flex size-56 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_0_50px_rgba(91,140,255,0.15)] md:size-64">
              <div className="absolute inset-2 rounded-full border-4 border-primary/10 border-dashed animate-[spin_60s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border border-border bg-gradient-to-br from-primary/5 to-transparent" />
              
              <div className="relative flex flex-col items-center justify-center">
                <span className="text-7xl font-black tracking-tighter text-primary md:text-8xl drop-shadow-sm">{scoreValue}</span>
                <span className="mt-1 text-sm font-bold tracking-widest text-muted-foreground uppercase">{scoreLabel}</span>
              </div>
              
              {/* Badges */}
              <div className="absolute -top-3 right-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-primary shadow-md border border-primary/10">
                {analysisVersion}
              </div>
              {matchCategory && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 border border-emerald-400">
                  {matchCategory}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* 2. Executive Summary */}
        <Card className="mb-12 border-border/50 bg-white shadow-sm overflow-hidden rounded-2xl">
          <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Target className="size-5 text-primary" /> Executive Summary
            </h2>
          </div>
          <CardContent className="p-6 md:p-8">
            <p className="text-lg leading-relaxed text-foreground/80 md:text-xl">
              {summary}
            </p>
          </CardContent>
        </Card>

        {/* 3. Resume Health Overview */}
        {(strengths.length > 0 || weaknesses.length > 0) && (
          <div className="mb-12">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-6">
              <Activity className="size-6 text-primary" /> Resume Health Overview
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-800 mb-6">
                  <CheckCircle2 className="size-5 text-emerald-600" /> Key Strengths
                </h3>
                <ul className="space-y-4">
                  {strengths.map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 mt-0.5">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                      </div>
                      <span className="text-base text-foreground/80 leading-relaxed font-medium">{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50/50 to-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-lg font-bold text-rose-800 mb-6">
                  <AlertCircle className="size-5 text-rose-600" /> Improvement Areas
                </h3>
                <ul className="space-y-4">
                  {weaknesses.map((w: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-100 mt-0.5">
                        <AlertCircle className="size-3.5 text-rose-600" />
                      </div>
                      <span className="text-base text-foreground/80 leading-relaxed font-medium">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 4. Visual Skills Intelligence */}
        {skills.length > 0 && (
          <div className="mb-12">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-6">
              <Zap className="size-6 text-amber-500" /> Skills Intelligence
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(categorizedSkills).map(([category, catSkills]) => {
                if (catSkills.length === 0) return null;
                return (
                  <div key={category} className="rounded-xl border border-border/60 bg-white p-5 shadow-sm transition-all hover:shadow-md">
                    <div className="mb-4 flex items-center gap-2 border-b border-border/50 pb-3">
                      <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
                        <Code className="size-4 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground tracking-tight">{category}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {catSkills.map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-primary/5 text-primary hover:bg-primary/10 transition-colors px-3 py-1 font-medium border border-primary/10">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Score Breakdown (if available) */}
        {Object.keys(breakdown).length > 0 && (
          <Card className="mb-12 border-border/50 bg-white shadow-sm overflow-hidden rounded-2xl">
            <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
              <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
                <LayoutGrid className="size-5 text-indigo-500" /> Score Breakdown
              </h2>
            </div>
            <CardContent className="p-6 md:p-8">
              <div className="grid gap-x-12 gap-y-6 md:grid-cols-2">
                {Object.entries(breakdown).map(([key, val]: [string, any]) => (
                  <div key={key}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-semibold text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-bold text-foreground">{val}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                      <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. Experience Spotlight */}
        {experience.length > 0 && (
          <div className="mb-12 space-y-6">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-6">
              <Briefcase className="size-6 text-primary" /> Experience Spotlight
            </h2>
            <div className="grid gap-6">
              {experience.map((exp: any, idx: number) => (
                <div key={idx} className="group relative rounded-2xl border border-border/60 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 md:p-8 overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{exp.role || "Role"}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-base">
                        <span className="font-bold text-primary flex items-center gap-1.5">
                          {exp.company || "Company"}
                        </span>
                        <span className="text-muted-foreground hidden sm:inline">•</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                          <Calendar className="size-4" />
                          {exp.duration || "Duration"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/20 rounded-xl p-5 border border-border/40">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">Key Contributions</h4>
                    <ul className="space-y-3">
                      {exp.description?.map((desc: string, i: number) => (
                        <li key={i} className="flex items-start gap-3">
                          <ChevronRight className="size-4 text-primary shrink-0 mt-0.5" />
                          <span className="text-foreground/80 text-sm md:text-base leading-relaxed">{desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Elevated Featured Projects */}
        {projects.length > 0 && (
          <div className="mb-12 space-y-6">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-6">
              <Code className="size-6 text-primary" /> Featured Projects
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {projects.map((proj: any, idx: number) => (
                <div key={idx} className="flex flex-col rounded-2xl border border-border/60 bg-white shadow-sm transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
                  <div className="bg-gradient-to-r from-muted/50 to-transparent p-6 border-b border-border/50">
                    <h3 className="text-xl font-bold text-foreground">{proj.title || "Project"}</h3>
                  </div>
                  <div className="p-6 grow">
                    <ul className="space-y-3">
                      {proj.description?.map((desc: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                          <div className="size-1.5 rounded-full bg-primary/40 shrink-0 mt-2" />
                          <span>{desc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education & Certifications */}
        <div className="mb-12 grid gap-6 md:grid-cols-2 items-start">
          {education.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-6">
                <GraduationCap className="size-6 text-primary" /> Education
              </h2>
              <div className="space-y-4">
                {education.map((edu: any, idx: number) => (
                  <div key={idx} className="rounded-xl border border-border/60 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                    <h3 className="text-lg font-bold text-foreground">{edu.degree || "Degree"}</h3>
                    <p className="mt-1 font-semibold text-primary">{edu.institution || "Institution"}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                        <Calendar className="size-4" />{edu.duration || "Duration"}
                      </span>
                      {edu.gpa && <span className="font-bold text-foreground/80 bg-muted px-2 py-1 rounded-md">{edu.gpa}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-6">
                <Medal className="size-6 text-primary" /> Certifications
              </h2>
              <div className="flex flex-wrap gap-3">
                {certifications.map((cert: string, idx: number) => (
                  <div key={idx} className="flex w-full sm:w-auto items-center gap-3 rounded-xl border border-border/60 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Medal className="size-5 text-primary" />
                    </div>
                    <span className="text-base font-semibold text-foreground leading-tight">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Strategic Insights */}
        {(recommendations.length > 0 || roles.length > 0 || readiness || recommendationExplanation) && (
          <div className="mb-12">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground mb-6">
              <TrendingUp className="size-6 text-primary" /> Strategic Insights
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-6">
                {recommendationExplanation && (
                  <Card className="border-border/60 bg-gradient-to-br from-amber-50/50 to-white shadow-sm rounded-2xl overflow-hidden">
                    <div className="bg-amber-100/30 px-6 py-4 border-b border-amber-100">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-amber-800">
                        <Lightbulb className="size-5 text-amber-600" /> Hiring Recommendation
                      </h3>
                    </div>
                    <CardContent className="p-6">
                      <p className="text-base text-foreground/80 leading-relaxed font-medium">
                        {recommendationExplanation}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {recommendations.length > 0 && (
                  <Card className="border-border/60 bg-white shadow-sm rounded-2xl">
                    <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                        <Target className="size-5 text-violet-500" /> Actionable Advice
                      </h3>
                    </div>
                    <CardContent className="p-6">
                      <ul className="space-y-4">
                        {recommendations.map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">{i+1}</span>
                            <span className="text-sm text-foreground/80 leading-relaxed font-medium">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {roles.length > 0 && (
                  <Card className="border-border/60 bg-white shadow-sm rounded-2xl">
                    <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                        <Briefcase className="size-5 text-blue-500" /> Recommended Roles
                      </h3>
                    </div>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap gap-2">
                        {roles.map((r: string, i: number) => (
                          <Badge key={i} variant="outline" className="border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 transition-colors py-2 px-4 text-sm">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {readiness && (
                  <Card className="border-border/60 bg-white shadow-sm rounded-2xl">
                    <div className="bg-muted/30 px-6 py-4 border-b border-border/50">
                      <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                        <LayoutGrid className="size-5 text-indigo-500" /> Interview Readiness
                      </h3>
                    </div>
                    <CardContent className="p-6">
                      <p className="text-base text-foreground/80 leading-relaxed italic border-l-4 border-indigo-200 pl-4 py-1">
                        "{readiness}"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
