"use client"

import { Button } from "@/components/ui/button"
import { VisualEcosystem } from "./visual-ecosystem"
import { Upload, Play, CheckCircle } from "lucide-react"
import { UploadDialog } from "./upload-dialog"
import { useResumeAnalysis } from "../../hooks/useResumeAnalysis"
import { useMatchAnalysis } from "../../hooks/useMatchAnalysis"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { LoadingOverlay } from "./loading-overlay"

const trustIndicators = [
  "ATS Analysis",
  "Skill Gap Detection", 
  "Resume Intelligence",
  "Career Recommendations",
]

export function HeroSection() {
  const { 
    analyze: analyzeAts, 
    isLoading: isAtsLoading, 
    data: atsData,
    error: atsError
  } = useResumeAnalysis();

  const { 
    analyze: analyzeMatch, 
    isLoading: isMatchLoading, 
    data: matchData,
    error: matchError 
  } = useMatchAnalysis();

  const { toast } = useToast();

  const isLoading = isAtsLoading || isMatchLoading;
  // Prefer matchData over atsData if both were somehow available, or just pass both and let ecosystem decide
  const activeData = matchData || atsData;

  useEffect(() => {
    if (atsError || matchError) {
      toast({
        title: "Analysis Failed",
        description: atsError || matchError,
        variant: "destructive"
      });
    }
  }, [atsError, matchError, toast]);

  const router = useRouter();

  useEffect(() => {
    if (activeData && !atsError && !matchError) {
      // Store the successful data in sessionStorage and navigate
      sessionStorage.setItem("resumeAnalysisResult", JSON.stringify(activeData));
      router.push("/results");
    }
  }, [activeData, atsError, matchError, router]);

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-background">
      <LoadingOverlay isVisible={isLoading} />
      {/* Subtle grid pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(#1E293B 1px, transparent 1px), linear-gradient(90deg, #1E293B 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top gradient accent */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-primary/5 via-secondary/3 to-transparent blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center px-6 py-20 lg:flex-row lg:items-center lg:justify-between lg:py-24">
        {/* Left Content */}
        <div className="z-10 flex max-w-xl flex-col items-center text-center lg:items-start lg:text-left">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <div className="size-1.5 animate-pulse rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary">AI-Powered Resume Analysis</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-balance text-4xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Transform Your Resume Into{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Career Insights
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mb-8 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Analyze ATS compatibility, identify skill gaps, and receive actionable recommendations powered by AI.
          </p>

          {/* CTAs */}
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <UploadDialog
              onAnalyzeAts={analyzeAts}
              onAnalyzeMatch={analyzeMatch}
              isLoading={isLoading}
            />
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 lg:justify-start">
            {trustIndicators.map((indicator) => (
              <div key={indicator} className="flex items-center gap-2">
                <CheckCircle className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">{indicator}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Visual Ecosystem */}
        <div className="relative mt-12 w-full max-w-2xl lg:mt-0 lg:flex-1">
          <VisualEcosystem />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  )
}
