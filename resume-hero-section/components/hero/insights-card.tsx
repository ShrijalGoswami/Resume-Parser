"use client"

import { TrendingUp, CheckCircle2, AlertCircle, Zap, ChevronDown } from "lucide-react"
import { useState, useEffect } from "react"

interface InsightsCardProps {
  data?: any;
  isLoading?: boolean;
}

export function InsightsCard({ data, isLoading }: InsightsCardProps) {
  let score = 87;
  let scoreLabel = "ATS Score";
  let tips: string[] = ["Strong technical skills", "Keywords optimized", "Add leadership examples"];
  let numSkills = 12;

  if (data) {
    if (data.match_analysis) {
      score = data.match_analysis.job_match_score;
      scoreLabel = "Match Score";
      tips = data.match_analysis.candidate_strengths || [];
    } else if (data.analysis) {
      score = data.analysis.ats_score;
      scoreLabel = "ATS Score";
      tips = data.analysis.ats_tips || [];
    }
    
    if (data.resume_data?.skills) {
      numSkills = data.resume_data.skills.length;
    }
  }

  const displayTips = tips.slice(0, 3);

  const [animatedScore, setAnimatedScore] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const stepTime = duration / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      const ease = 1 - Math.pow(1 - progress, 4); // easeOutQuart
      setAnimatedScore(Math.round(score * ease));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setAnimatedScore(score);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [score]);

  const getExplanation = (tip: string) => {
    const lowerTip = tip.toLowerCase();
    if (lowerTip.includes("technical")) return "Your technical skill section contains strong role-relevant technologies and demonstrates good domain alignment.";
    if (lowerTip.includes("keyword")) return "Most ATS-relevant keywords are already present in the resume, improving discoverability.";
    if (lowerTip.includes("leadership")) return "Adding leadership-oriented project descriptions can further improve resume impact.";
    return "This insight was identified by our AI engine to help improve your overall resume impact and ATS compatibility.";
  }

  return (
    <div 
      className="group relative w-56 lg:w-64"
      style={{ 
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* 3D Shadow layers for depth */}
      <div className="absolute inset-0 translate-y-2 rounded-2xl bg-foreground/5 blur-xl transition-transform duration-500 group-hover:translate-y-3" />
      <div className="absolute inset-0 translate-y-1 rounded-2xl bg-accent/5 blur-lg" />
      
      {/* Main card with 3D transform */}
      <div 
        className="relative rounded-2xl border border-white/40 bg-gradient-to-br from-white/90 via-white/80 to-white/70 p-5 shadow-[0_8px_32px_-8px_rgba(167,139,250,0.15),0_4px_16px_-4px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-500 group-hover:shadow-[0_16px_48px_-12px_rgba(167,139,250,0.25),0_8px_24px_-8px_rgba(0,0,0,0.1)] lg:p-6"
        style={{
          transform: 'rotateY(2deg) rotateX(1deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Inner highlight border */}
        <div className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-white/80 via-transparent to-transparent" />
        
        {/* Header */}
        <div className="relative mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-primary shadow-lg shadow-accent/25 lg:size-10">
              <TrendingUp className="size-4 text-white lg:size-5" />
            </div>
            <span className="text-sm font-semibold text-foreground lg:text-base">Insights</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-100 to-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 shadow-sm">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>

        {/* ATS Score - enhanced with glow */}
        <div className="group/score relative mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-primary/8 via-secondary/6 to-accent/8 p-3 shadow-inner transition-all duration-500 hover:shadow-[0_0_20px_rgba(91,140,255,0.2)] lg:p-4">
          <div className="absolute -right-4 -top-4 size-16 rounded-full bg-primary/10 blur-xl transition-all duration-500 group-hover/score:bg-primary/20 group-hover/score:scale-150" />
          <div className="relative mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[100px]">{scoreLabel}</span>
            <div className="flex items-center gap-1 transition-transform duration-300 group-hover/score:scale-110">
              <Zap className="size-3 text-primary transition-colors duration-300 group-hover/score:fill-primary/20" />
              <span className="text-xl font-bold text-primary lg:text-2xl">{animatedScore}%</span>
            </div>
          </div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-muted/60 shadow-inner">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-primary via-secondary to-primary shadow-[0_0_12px_rgba(91,140,255,0.5)] transition-all duration-1000" 
              style={{ width: `${score}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          </div>
        </div>

        {/* Skills Analysis - enhanced */}
        <div className="relative mb-4 space-y-1">
          {displayTips.map((tip: string, idx: number) => {
            const isExpanded = expandedIndex === idx;
            return (
              <div 
                key={idx} 
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="group/item flex flex-col gap-1 rounded-lg border border-transparent p-1.5 transition-all duration-300 hover:cursor-pointer hover:border-primary/10 hover:bg-primary/5 hover:scale-[1.02] hover:shadow-sm"
              >
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="flex size-5 items-center justify-center rounded-full bg-emerald-100 lg:size-6 flex-shrink-0 transition-transform duration-300 group-hover/item:scale-110">
                    <CheckCircle2 className="size-3 text-emerald-600 lg:size-3.5" />
                  </div>
                  <span className="flex-1 text-muted-foreground truncate font-medium transition-colors group-hover/item:text-foreground">{tip}</span>
                  <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                </div>
                
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? "max-h-24 opacity-100 mt-1" : "max-h-0 opacity-0"}`}
                >
                  <p className="text-[10px] text-muted-foreground leading-relaxed pl-8 pr-2 pb-1">
                    {getExplanation(tip)}
                  </p>
                </div>
              </div>
            );
          })}
          {displayTips.length === 0 && (
             <div className="text-xs text-muted-foreground italic pl-2">No tips available</div>
          )}
        </div>

        {/* Quick Stats - enhanced with gradients */}
        <div className="flex gap-2">
          <div className="flex-1 cursor-pointer rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 p-2.5 text-center shadow-inner transition-all duration-300 hover:-translate-y-1 hover:from-muted/80 hover:to-muted/50 hover:shadow-md lg:p-3">
            <p className="text-lg font-bold text-foreground lg:text-xl">{numSkills}</p>
            <p className="text-xs text-muted-foreground">Skills</p>
          </div>
          <div className="flex-1 cursor-pointer rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 p-2.5 text-center shadow-inner transition-all duration-300 hover:-translate-y-1 hover:from-muted/80 hover:to-muted/50 hover:shadow-md lg:p-3">
            <p className="text-lg font-bold text-foreground lg:text-xl">{tips.length}</p>
            <p className="text-xs text-muted-foreground">Tips</p>
          </div>
        </div>

        {/* Decorative gradients - enhanced */}
        <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-gradient-to-tr from-accent/15 via-primary/10 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -right-4 -top-4 size-24 rounded-full bg-gradient-to-bl from-secondary/10 to-transparent blur-xl" />
      </div>

      {/* Floating indicator */}
      <div className="absolute -left-2 -top-2 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary shadow-lg shadow-accent/30 lg:size-7">
        <span className="text-xs font-bold text-white">3</span>
      </div>
    </div>
  )
}
