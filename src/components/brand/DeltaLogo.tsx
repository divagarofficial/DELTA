import React from 'react';

interface DeltaLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export function DeltaLogo({ className = '', size = 32, showText = true }: DeltaLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center shrink-0 drop-shadow-sm transition-transform hover:scale-105"
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="deltaLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366F1" />
              <stop offset="50%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#3730A3" />
            </linearGradient>
            <linearGradient id="deltaLogoGlow" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>

          {/* Delta Triangle Structure */}
          <polygon
            points="50,15 85,82 15,82"
            fill="none"
            stroke="url(#deltaLogoGrad)"
            strokeWidth="9"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Inner Geometric Prism */}
          <path d="M 50,34 L 70,74 L 30,74 Z" fill="url(#deltaLogoGrad)" fillOpacity="0.16" />

          {/* Three Interconnected Apex Nodes: Everything connects */}
          <circle cx="50" cy="15" r="5.5" fill="#38BDF8" />
          <circle cx="85" cy="82" r="5.5" fill="#6366F1" />
          <circle cx="15" cy="82" r="5.5" fill="#4338CA" />

          {/* Central Connecting Core */}
          <circle cx="50" cy="58" r="4" fill="url(#deltaLogoGlow)" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-foreground text-lg leading-none">
              Delta
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded-full bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300">
              Web
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium tracking-tight mt-0.5">
            Everything connects.
          </span>
        </div>
      )}
    </div>
  );
}
