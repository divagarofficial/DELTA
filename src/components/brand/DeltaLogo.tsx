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
 * Original official Delta 3D ribbon mark with speech bubble and connecting dots.
 * Ideal for navigation rails, compact status avatars, and loading screens.
 */
export function delta_logo_without_text({
  className = '',
  size = 36,
  height,
  width,
}: LogoProps) {
  const actualHeight = height || size;
  const actualWidth = width || Math.round(actualHeight * 1.096);

  return (
    <div
      style={{ width: actualWidth, height: actualHeight }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform hover:scale-105 ${className}`}
      role="img"
      aria-label="Delta"
    >
      <img
        src="/delta_logo_without_text.png"
        alt="Delta"
        width={actualWidth}
        height={actualHeight}
        loading="eager"
        decoding="async"
        className="w-full h-full object-contain pointer-events-none drop-shadow-sm"
      />
    </div>
  );
}

// Named alias with React PascalCase
export const DeltaLogoWithoutText = delta_logo_without_text;

/**
 * delta_logo_with_text
 * Original official Delta brand logo combining the 3D ribbon mark and bold Delta typography.
 * Natural aspect ratio is 3:1 (2172 x 724).
 */
export function delta_logo_with_text({
  className = '',
  size,
  height = 36,
  width,
}: LogoProps) {
  const actualHeight = size || height;
  const calculatedWidth = width || Math.round(actualHeight * 3.0);

  return (
    <div
      style={{ height: actualHeight, width: calculatedWidth }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-transform hover:opacity-95 ${className}`}
      role="img"
      aria-label="Delta - Everything connects"
    >
      <img
        src="/delta_logo_with_text.png"
        alt="Delta"
        width={calculatedWidth}
        height={actualHeight}
        loading="eager"
        decoding="async"
        className="w-full h-full object-contain pointer-events-none"
      />
    </div>
  );
}

// Named alias with React PascalCase
export const DeltaLogoWithText = delta_logo_with_text;

/**
 * DeltaLogo
 * Unified logo component that switches between original delta_logo_with_text and delta_logo_without_text.
 */
export function DeltaLogo({
  variant,
  showText,
  size = 36,
  height,
  width,
  className = '',
}: DeltaLogoProps) {
  const isWithText = variant ? variant === 'with_text' : showText !== false;

  if (!isWithText) {
    return (
      <DeltaLogoWithoutText
        size={size}
        height={height}
        width={width}
        className={className}
      />
    );
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
