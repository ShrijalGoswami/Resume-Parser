"use client"

export function AICore() {
  return (
    <div className="relative flex size-44 items-center justify-center lg:size-52">
      {/* Outer ambient glow layers */}
      <div className="absolute size-72 animate-[glow-breathe_4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-primary/8 via-secondary/10 to-accent/8 blur-3xl" />
      <div className="absolute size-60 animate-[glow-breathe_5s_ease-in-out_infinite_0.5s] rounded-full bg-gradient-to-br from-primary/10 via-transparent to-accent/10 blur-2xl" />
      
      {/* Outer rotating ring with gradient */}
      <div className="absolute size-48 animate-[spin_30s_linear_infinite] rounded-full lg:size-56">
        <div className="absolute inset-0 rounded-full border border-primary/20" style={{ borderStyle: 'dashed', borderSpacing: '8px' }} />
        <div className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_4px] shadow-primary/50" />
        <div className="absolute -right-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_10px_3px] shadow-accent/50" />
      </div>

      {/* Middle rotating ring */}
      <div className="absolute size-40 animate-[spin_20s_linear_infinite_reverse] rounded-full lg:size-48">
        <div className="absolute inset-0 rounded-full border border-secondary/15" />
        <div className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-secondary shadow-[0_0_10px_3px] shadow-secondary/50" />
        <div className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-primary/80 shadow-[0_0_12px_4px] shadow-primary/40" />
      </div>

      {/* Inner rotating ring */}
      <div className="absolute size-32 animate-[spin_15s_linear_infinite] rounded-full lg:size-40">
        <div className="absolute left-0 top-1/2 size-1 -translate-y-1/2 rounded-full bg-accent/80 shadow-[0_0_8px_2px] shadow-accent/40" />
        <div className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-secondary/80 shadow-[0_0_8px_2px] shadow-secondary/40" />
      </div>

      {/* Main glass sphere with 3D depth */}
      <div className="relative flex size-28 items-center justify-center lg:size-32">
        {/* Sphere shadow/depth */}
        <div className="absolute -bottom-2 size-24 rounded-full bg-foreground/5 blur-xl lg:size-28" />
        
        {/* Outer sphere shell */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white via-white/95 to-white/80 shadow-[0_8px_32px_-4px_rgba(91,140,255,0.3),0_4px_16px_-2px_rgba(167,139,250,0.2),inset_0_-8px_16px_-4px_rgba(91,140,255,0.1)]" />
        
        {/* Inner color gradient layer */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/15 via-secondary/25 to-accent/20 opacity-90" />
        
        {/* Glass reflection highlight - top */}
        <div className="absolute left-3 top-2 h-10 w-14 rounded-full bg-gradient-to-b from-white/80 to-transparent blur-sm lg:left-4 lg:h-12 lg:w-16" />
        
        {/* Secondary reflection */}
        <div className="absolute bottom-4 right-3 size-6 rounded-full bg-white/30 blur-sm lg:size-8" />

        {/* Core energy center */}
        <div className="relative z-10 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-[0_0_24px_4px_rgba(91,140,255,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] lg:size-16">
          {/* Core highlight */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-transparent to-white/40" />
          
          {/* Pulsing inner glow */}
          <div className="absolute inset-1 animate-[core-pulse_2s_ease-in-out_infinite] rounded-full bg-gradient-to-br from-white/20 to-transparent" />
          
          {/* AI Sparkle Icon */}
          <svg
            className="relative z-10 size-7 text-white drop-shadow-lg lg:size-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
            />
          </svg>
        </div>
      </div>

      {/* Floating micro particles */}
      <div className="absolute size-56 animate-[spin_40s_linear_infinite] lg:size-64">
        <div className="absolute left-[15%] top-[20%] size-1 rounded-full bg-primary/60" />
        <div className="absolute right-[20%] top-[30%] size-0.5 rounded-full bg-secondary/60" />
        <div className="absolute bottom-[25%] left-[25%] size-0.5 rounded-full bg-accent/60" />
        <div className="absolute bottom-[15%] right-[15%] size-1 rounded-full bg-primary/40" />
      </div>
    </div>
  )
}
