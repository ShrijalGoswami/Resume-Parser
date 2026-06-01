"use client"

import { FileText, Star, Sparkles } from "lucide-react"

interface ResumeCardProps {
  data?: any;
  isLoading?: boolean;
}

export function ResumeCard({ data, isLoading }: ResumeCardProps) {
  const resumeData = data?.resume_data;
  const candidateName = resumeData?.candidate_name || "Sarah Chen";
  const role = resumeData?.experience?.[0]?.role || "Software Engineer";
  const skills = resumeData?.skills?.slice(0, 4) || ["React", "TypeScript", "Node.js", "AWS"];
  return (
    <div 
      className="group relative w-64 lg:w-72"
      style={{ 
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      {/* 3D Shadow layers for depth */}
      <div className="absolute inset-0 translate-y-2 rounded-2xl bg-foreground/5 blur-xl transition-transform duration-500 group-hover:translate-y-3" />
      <div className="absolute inset-0 translate-y-1 rounded-2xl bg-primary/5 blur-lg" />
      
      {/* Main card with 3D transform */}
      <div 
        className="relative rounded-2xl border border-white/40 bg-gradient-to-br from-white/90 via-white/80 to-white/70 p-5 shadow-[0_8px_32px_-8px_rgba(91,140,255,0.15),0_4px_16px_-4px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-500 group-hover:shadow-[0_16px_48px_-12px_rgba(91,140,255,0.25),0_8px_24px_-8px_rgba(0,0,0,0.1)] lg:p-6"
        style={{
          transform: 'rotateY(-2deg) rotateX(1deg)',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Inner highlight border */}
        <div className="pointer-events-none absolute inset-px rounded-2xl bg-gradient-to-br from-white/80 via-transparent to-transparent" />
        
        {/* Header */}
        <div className="relative mb-4 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/25 lg:size-12">
            <FileText className="size-5 text-white lg:size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground lg:text-base">Resume.pdf</p>
            <p className="text-xs text-muted-foreground">Last updated today</p>
          </div>
          <Sparkles className="ml-auto size-4 animate-pulse text-primary/60" />
        </div>

        {/* Candidate Preview - enhanced depth */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-muted/60 to-muted/30 p-3 shadow-inner lg:p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-accent/3" />
          <div className="relative mb-2 flex items-center gap-2">
            <div className="size-9 rounded-full bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 shadow-sm lg:size-10" />
            <div>
              <p className="text-sm font-medium text-foreground truncate max-w-[120px]">{candidateName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">{role}</p>
            </div>
          </div>
          <div className="relative flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span>5 years experience</span>
          </div>
        </div>

        {/* Skills Tags - enhanced */}
        <div className="flex flex-wrap gap-1.5 lg:gap-2 max-h-[60px] overflow-hidden">
          {skills.map((skill: string, index: number) => (
            <span
              key={skill}
              className="rounded-full bg-gradient-to-r from-primary/10 to-primary/5 px-2.5 py-1 text-xs font-medium text-primary shadow-sm transition-all duration-300 hover:from-primary/15 hover:to-primary/10 hover:shadow-md lg:px-3 lg:py-1.5 truncate max-w-[100px]"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Decorative gradients - enhanced */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -bottom-4 -left-4 size-24 rounded-full bg-gradient-to-tr from-accent/10 to-transparent blur-xl" />
      </div>

      {/* Floating indicator */}
      <div className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30 lg:size-7">
        <span className="text-xs font-bold text-white">1</span>
      </div>
    </div>
  )
}
