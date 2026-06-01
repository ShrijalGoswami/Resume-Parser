"use client"

export function AnimatedConnections() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 700 500"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Enhanced gradients */}
        <linearGradient id="pathGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5B8CFF" stopOpacity="0.1" />
          <stop offset="30%" stopColor="#5B8CFF" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#7DD3FC" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#A78BFA" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="pathGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.1" />
          <stop offset="30%" stopColor="#A78BFA" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#7DD3FC" stopOpacity="0.6" />
          <stop offset="70%" stopColor="#5B8CFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0.1" />
        </linearGradient>

        {/* Particle glow filters */}
        <filter id="particleGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Gradient for particles */}
        <radialGradient id="particleBlue">
          <stop offset="0%" stopColor="#5B8CFF" stopOpacity="1" />
          <stop offset="70%" stopColor="#5B8CFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="particleCyan">
          <stop offset="0%" stopColor="#7DD3FC" stopOpacity="1" />
          <stop offset="70%" stopColor="#7DD3FC" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#7DD3FC" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="particlePurple">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="1" />
          <stop offset="70%" stopColor="#A78BFA" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Curved path from Resume to AI Core */}
      <path
        d="M 130 250 Q 200 200, 280 230 T 350 250"
        stroke="url(#pathGradient1)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 140 260 Q 210 300, 290 270 T 350 250"
        stroke="url(#pathGradient1)"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />

      {/* Curved path from AI Core to Insights */}
      <path
        d="M 350 250 Q 420 220, 500 240 T 570 250"
        stroke="url(#pathGradient2)"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 350 250 Q 420 280, 500 260 T 560 260"
        stroke="url(#pathGradient2)"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />

      {/* Primary data particles - Resume to AI */}
      <g filter="url(#particleGlow)">
        <circle r="5" fill="url(#particleBlue)">
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M 130 250 Q 200 200, 280 230 T 350 250"
          />
          <animate attributeName="r" values="5;6;5" dur="1s" repeatCount="indefinite" />
        </circle>
      </g>
      
      <g filter="url(#particleGlow)">
        <circle r="3" fill="url(#particleCyan)">
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M 140 260 Q 210 300, 290 270 T 350 250"
            begin="1s"
          />
        </circle>
      </g>

      <g filter="url(#particleGlow)">
        <circle r="4" fill="url(#particleBlue)">
          <animateMotion
            dur="3.5s"
            repeatCount="indefinite"
            path="M 130 250 Q 200 200, 280 230 T 350 250"
            begin="2s"
          />
        </circle>
      </g>

      <g filter="url(#particleGlow)">
        <circle r="2.5" fill="url(#particleCyan)">
          <animateMotion
            dur="4.5s"
            repeatCount="indefinite"
            path="M 140 260 Q 210 300, 290 270 T 350 250"
            begin="3s"
          />
        </circle>
      </g>

      {/* Primary data particles - AI to Insights */}
      <g filter="url(#particleGlow)">
        <circle r="5" fill="url(#particlePurple)">
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M 350 250 Q 420 220, 500 240 T 570 250"
            begin="0.5s"
          />
          <animate attributeName="r" values="5;6;5" dur="1.2s" repeatCount="indefinite" />
        </circle>
      </g>

      <g filter="url(#particleGlow)">
        <circle r="3" fill="url(#particleCyan)">
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M 350 250 Q 420 280, 500 260 T 560 260"
            begin="1.5s"
          />
        </circle>
      </g>

      <g filter="url(#particleGlow)">
        <circle r="4" fill="url(#particlePurple)">
          <animateMotion
            dur="3.5s"
            repeatCount="indefinite"
            path="M 350 250 Q 420 220, 500 240 T 570 250"
            begin="2.5s"
          />
        </circle>
      </g>

      <g filter="url(#particleGlow)">
        <circle r="2.5" fill="url(#particleBlue)">
          <animateMotion
            dur="4.5s"
            repeatCount="indefinite"
            path="M 350 250 Q 420 280, 500 260 T 560 260"
            begin="3.5s"
          />
        </circle>
      </g>

      {/* Subtle micro particles for ambiance */}
      <circle r="1.5" fill="#5B8CFF" opacity="0.4">
        <animateMotion
          dur="6s"
          repeatCount="indefinite"
          path="M 130 250 Q 200 180, 280 210 T 350 250"
          begin="0.3s"
        />
      </circle>
      <circle r="1" fill="#A78BFA" opacity="0.4">
        <animateMotion
          dur="6s"
          repeatCount="indefinite"
          path="M 350 250 Q 420 200, 500 220 T 570 250"
          begin="0.8s"
        />
      </circle>

      {/* Ambient floating particles around center */}
      <g filter="url(#softGlow)" opacity="0.5">
        <circle cx="300" cy="200" r="2" fill="#7DD3FC">
          <animate attributeName="cy" values="200;180;200" dur="5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.8;0.5" dur="5s" repeatCount="indefinite" />
        </circle>
        <circle cx="400" cy="300" r="1.5" fill="#A78BFA">
          <animate attributeName="cy" values="300;320;300" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.7;0.4" dur="6s" repeatCount="indefinite" />
        </circle>
        <circle cx="250" cy="280" r="1.5" fill="#5B8CFF">
          <animate attributeName="cx" values="250;240;250" dur="7s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0.6;0.3" dur="7s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  )
}
