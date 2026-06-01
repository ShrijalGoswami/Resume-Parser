"use client"

import { useEffect, useState } from "react"
import { Sparkles, FileSearch, Cpu, CheckCircle } from "lucide-react"

interface LoadingOverlayProps {
  isVisible: boolean;
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  const [phase, setPhase] = useState(0);

  const phases = [
    { text: "Uploading Resume...", icon: FileSearch },
    { text: "Extracting Skills & Experience...", icon: Cpu },
    { text: "Running ATS Analysis...", icon: Sparkles },
    { text: "Generating Career Insights...", icon: Sparkles },
    { text: "Preparing Report...", icon: CheckCircle },
  ];

  useEffect(() => {
    if (!isVisible) {
      setPhase(0);
      return;
    }

    const interval = setInterval(() => {
      setPhase((p) => Math.min(p + 1, phases.length - 1));
    }, 2500); // cycle through text every 2.5 seconds

    return () => clearInterval(interval);
  }, [isVisible, phases.length]);

  if (!isVisible) return null;

  const Icon = phases[phase].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md transition-opacity duration-500">
      <div className="flex flex-col items-center justify-center space-y-8 p-8 max-w-md w-full text-center">
        {/* Animated Icon Container */}
        <div className="relative flex size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 shadow-xl shadow-primary/10">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary/10 to-transparent animate-pulse" />
          <Icon className="size-10 text-primary animate-bounce" />
        </div>

        {/* Loading Text */}
        <div className="space-y-3">
          <h3 className="text-xl font-semibold text-foreground tracking-tight transition-all duration-300">
            {phases[phase].text}
          </h3>
          <p className="text-sm text-muted-foreground animate-pulse">
            Please wait while our AI engine processes your documents.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-[240px] h-2 rounded-full bg-muted overflow-hidden relative shadow-inner">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-secondary to-primary w-1/3 animate-[progress_2s_ease-in-out_infinite] shadow-[0_0_10px_rgba(91,140,255,0.5)] rounded-full" />
        </div>
      </div>
    </div>
  )
}
