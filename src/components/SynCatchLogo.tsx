import { useRef } from 'react';
import { SynCatchLogoAnimated, type SynCatchLogoHandle } from './SynCatchLogoAnimated';

interface SynCatchLogoProps {
  className?: string;
  /** Render the mark in currentColor instead of brand colors (for use on accent fills). */
  monochrome?: boolean;
  /** Adapt the mark to the active theme accent instead of the brand palette. */
  themed?: boolean;
  title?: string;
}

const BRAND_BLUE = '#3E8BFF';
const BRAND_FOG = '#F4F5F8';

/**
 * SynCatch brandmark — a loop dissolving into dots just before it closes:
 * always in motion, always almost in sync. The two dots are the "catch"
 * landing at the loop's open end.
 *
 * Geometry: arc r=37 centered at (50,50) sweeping ~255°, with two dots
 * continuing the circle through the gap.
 */
export const SYNCATCH_LOOP = 'M 15.2 62.7 A 37 37 0 1 1 71.3 80.3';
export const SYNCATCH_STROKE_WIDTH = 16;
export const SYNCATCH_DOTS = [
  { cx: 50, cy: 87, r: 7 },
  { cx: 28.8, cy: 80.3, r: 4.5 },
] as const;

export function SynCatchLogo({ className, monochrome = false, themed = false, title = 'SynCatch' }: SynCatchLogoProps) {
  const loopPaint = monochrome ? 'currentColor' : themed ? 'rgb(var(--accent-soft))' : BRAND_FOG;
  const dotPaint = monochrome ? 'currentColor' : themed ? 'rgb(var(--accent))' : BRAND_BLUE;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      <path d={SYNCATCH_LOOP} stroke={loopPaint} strokeWidth={SYNCATCH_STROKE_WIDTH} strokeLinecap="round" />
      {/* The "catch" — dots landing where the loop closes */}
      {SYNCATCH_DOTS.map((dot) => (
        <circle key={dot.cx} cx={dot.cx} cy={dot.cy} r={dot.r} fill={dotPaint} />
      ))}
    </svg>
  );
}

/**
 * Full SynCatch wordmark — logo + name. With `themed`, the mark and the "Catch"
 * half of the name follow the theme accent; otherwise they stay brand blue.
 */
export function SynCatchWordmark({
  className,
  logoClassName = 'h-7 w-7',
  textClassName = 'text-base font-bold tracking-tight',
  themed = false,
  animated = false,
}: {
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  themed?: boolean;
  /** Use the animated mark; it spins into sync when the wordmark is hovered. */
  animated?: boolean;
}) {
  const logoRef = useRef<SynCatchLogoHandle>(null);
  return (
    <div
      className={`flex items-center gap-2 ${className ?? ''}`}
      onMouseEnter={animated ? () => logoRef.current?.play() : undefined}
    >
      {animated ? (
        <SynCatchLogoAnimated ref={logoRef} className={logoClassName} themed={themed} />
      ) : (
        <SynCatchLogo className={logoClassName} themed={themed} />
      )}
      <span className={textClassName}>
        <span className="text-text-primary">Syn</span>
        <span style={{ color: themed ? 'rgb(var(--accent))' : BRAND_BLUE }}>Catch</span>
      </span>
    </div>
  );
}
