import React from 'react';

export interface LogoProps {
  className?: string;
  size?: number;
  height?: number;
  width?: number;
}

export interface DeltaLogoProps extends LogoProps {
  variant?: 'with_text' | 'without_text';
  showText?: boolean;
}

/**
 * delta_logo_without_text
 * Pure vector standalone mark for Delta without wordmark typography.
 * Ideal for navigation rails, avatars, compact status badges, and loading spinners.
 */
export function delta_logo_without_text({
  className = '',
  size = 32,
}: LogoProps) {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform hover:scale-105 ${className}`}
      role="img"
      aria-label="Delta"
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="deltaIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>
          <linearGradient id="deltaIconAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#E879F9" />
          </linearGradient>
          <filter id="deltaIconShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#7C3AED" floodOpacity="0.28" />
          </filter>
        </defs>

        {/* Outer Delta Polygon */}
        <polygon
          points="50,14 86,82 14,82"
          fill="none"
          stroke="url(#deltaIconGrad)"
          strokeWidth="8.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#deltaIconShadow)"
        />

        {/* Inner Connecting Core Structure */}
        <path d="M 50,30 L 72,74 L 28,74 Z" fill="url(#deltaIconGrad)" fillOpacity="0.16" />

        {/* Apex and Base Interconnected Nodes */}
        <circle cx="50" cy="14" r="5.5" fill="#C084FC" />
        <circle cx="86" cy="82" r="5.5" fill="#7C3AED" />
        <circle cx="14" cy="82" r="5.5" fill="#5B21B6" />

        {/* Central Pulse Nucleus */}
        <circle cx="50" cy="58" r="4" fill="url(#deltaIconAccent)" />
      </svg>
    </div>
  );
}

// Named alias with React PascalCase
export const DeltaLogoWithoutText = delta_logo_without_text;

/**
 * delta_logo_with_text
 * Fully integrated vector logo combining the Delta geometric mark with
 * crisp vector wordmark typography ("DELTA") and tagline ("EVERYTHING CONNECTS").
 * Uses currentColor for typography to blend automatically with light and dark themes without manual HTML text.
 */
export function delta_logo_with_text({
  className = '',
  size,
  height = 36,
  width,
}: LogoProps) {
  const actualHeight = size || height;
  const calculatedWidth = width || Math.round(actualHeight * 4.0625);

  return (
    <div
      style={{ height: actualHeight, width: calculatedWidth }}
      className={`relative inline-flex items-center shrink-0 select-none text-foreground transition-transform hover:opacity-95 ${className}`}
      role="img"
      aria-label="Delta - Everything connects"
    >
      <svg
        viewBox="0 0 260 64"
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="deltaWithGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#5B21B6" />
          </linearGradient>
          <linearGradient id="deltaWithAccent" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#E879F9" />
          </linearGradient>
          <filter id="deltaWithShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#7C3AED" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Delta Geometric Mark */}
        <g transform="translate(6, 4)">
          <polygon
            points="28,8 49,48 7,48"
            fill="none"
            stroke="url(#deltaWithGrad)"
            strokeWidth="5.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#deltaWithShadow)"
          />
          <polygon points="28,19 41,43 15,43" fill="url(#deltaWithGrad)" fillOpacity="0.16" />
          <circle cx="28" cy="8" r="3.8" fill="#C084FC" />
          <circle cx="49" cy="48" r="3.8" fill="#7C3AED" />
          <circle cx="7" cy="48" r="3.8" fill="#5B21B6" />
          <circle cx="28" cy="33" r="2.8" fill="url(#deltaWithAccent)" />
        </g>

        {/* DELTA Wordmark (Vector Typography) */}
        <text
          x="74"
          y="38"
          fill="currentColor"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontSize="29"
          fontWeight="800"
          letterSpacing="0.06em"
        >
          DELTA
        </text>

        {/* Subtitle: EVERYTHING CONNECTS */}
        <text
          x="75"
          y="52"
          fill="#7C3AED"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="0.22em"
        >
          EVERYTHING CONNECTS
        </text>

        {/* Subtle Web Capsule Badge */}
        <rect x="186" y="21" width="36" height="18" rx="9" fill="#7C3AED" fillOpacity="0.12" />
        <text
          x="204"
          y="33"
          textAnchor="middle"
          fill="#7C3AED"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontSize="9"
          fontWeight="700"
          letterSpacing="0.05em"
        >
          WEB
        </text>
      </svg>
    </div>
  );
}

// Named alias with React PascalCase
export const DeltaLogoWithText = delta_logo_with_text;

/**
 * DeltaLogo
 * Unified logo component that switches between delta_logo_with_text and delta_logo_without_text.
 */
export function DeltaLogo({
  variant,
  showText,
  size = 36,
  height,
  width,
  className = '',
}: DeltaLogoProps) {
  // Determine if logo with text is requested
  const isWithText = variant ? variant === 'with_text' : showText !== false;

  if (!isWithText) {
    return <DeltaLogoWithoutText size={size} className={className} />;
  }

  return (
    <DeltaLogoWithText
      size={size}
      height={height}
      width={width}
      className={className}
    />
  );
}
