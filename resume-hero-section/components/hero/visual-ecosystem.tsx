"use client"

import { ResumeCard } from "./resume-card"
import { AICore } from "./ai-core"
import { InsightsCard } from "./insights-card"
import { AnimatedConnections } from "./animated-connections"

interface VisualEcosystemProps {
  data?: any;
  isLoading?: boolean;
}

export function VisualEcosystem({ data, isLoading }: VisualEcosystemProps) {
  return (
    <div className="relative flex min-h-[500px] w-full items-center justify-center lg:min-h-[600px]">
      {/* Deep background ambient layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Primary ambient glow - left */}
        <div className="absolute -left-32 top-1/4 size-96 rounded-full bg-gradient-to-br from-primary/8 via-primary/4 to-transparent blur-3xl" />
        
        {/* Secondary ambient glow - right */}
        <div className="absolute -right-32 bottom-1/4 size-96 rounded-full bg-gradient-to-bl from-accent/8 via-accent/4 to-transparent blur-3xl" />
        
        {/* Center ambient pulse */}
        <div className="absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 animate-[ambient-pulse_8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 blur-3xl" />
        
        {/* Subtle grid pattern for depth */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(91, 140, 255, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(91, 140, 255, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Animated connection paths */}
      <AnimatedConnections />

      {/* Floating elements container with 3D perspective */}
      <div 
        className="relative flex items-center gap-4 lg:gap-12"
        style={{ 
          perspective: '2000px',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Resume Card - floating animation with 3D tilt */}
        <div 
          className="animate-[float-3d_7s_ease-in-out_infinite]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <ResumeCard data={data} isLoading={isLoading} />
        </div>

        {/* AI Core - centered with breathing glow */}
        <div className="relative mx-2 lg:mx-6">
          {/* Core connection point indicator */}
          <div className="absolute left-1/2 top-1/2 -z-10 size-64 -translate-x-1/2 -translate-y-1/2 animate-[core-breathe_4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary/10 via-secondary/15 to-accent/10 blur-2xl lg:size-80" />
          <AICore />
        </div>

        {/* Insights Card - floating animation with delay and 3D tilt */}
        <div 
          className="animate-[float-3d_8s_ease-in-out_infinite_0.5s]"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <InsightsCard data={data} isLoading={isLoading} />
        </div>
      </div>

      {/* Floating decorative orbs for extra depth */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[15%] size-3 animate-[float_5s_ease-in-out_infinite] rounded-full bg-primary/30 blur-sm" />
        <div className="absolute right-[15%] top-[20%] size-2 animate-[float_6s_ease-in-out_infinite_1s] rounded-full bg-accent/30 blur-sm" />
        <div className="absolute bottom-[20%] left-[20%] size-2 animate-[float_7s_ease-in-out_infinite_2s] rounded-full bg-secondary/30 blur-sm" />
        <div className="absolute bottom-[25%] right-[10%] size-3 animate-[float_5.5s_ease-in-out_infinite_0.5s] rounded-full bg-primary/20 blur-sm" />
        <div className="absolute bottom-[40%] left-[5%] size-1.5 animate-[float_8s_ease-in-out_infinite_1.5s] rounded-full bg-accent/25 blur-sm" />
        <div className="absolute right-[5%] top-[40%] size-1.5 animate-[float_7.5s_ease-in-out_infinite_2.5s] rounded-full bg-secondary/25 blur-sm" />
      </div>
    </div>
  )
}
