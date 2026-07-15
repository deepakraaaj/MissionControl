import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { SYNCATCH_DOTS, SYNCATCH_LOOP, SYNCATCH_STROKE_WIDTH } from './SynCatchLogo';

const BRAND_BLUE = '#3E8BFF';
const BRAND_FOG = '#F4F5F8';
const SUCCESS_GREEN = '#2BD17E';

type Phase = 'idle' | 'running' | 'done';

/** Imperative handle so a parent (e.g. a wordmark) can replay the animation. */
export interface SynCatchLogoHandle {
  play: () => void;
}

interface SynCatchLogoAnimatedProps {
  className?: string;
  /** Track the active theme accent instead of the brand palette. */
  themed?: boolean;
  /** Start the sweep automatically on mount. */
  autoPlay?: boolean;
  /** Loop the sweep → catch → reset cycle (implies autoPlay). */
  loop?: boolean;
  /** Replay the sweep when the pointer enters the mark. */
  playOnHover?: boolean;
  /** Sweep duration in ms. */
  duration?: number;
  title?: string;
}

/**
 * Animated SynCatch dissolve loop.
 * The loop spins while syncing, then settles with the lead dot pulsing
 * green — the catch landing — once the sync lands.
 */
export const SynCatchLogoAnimated = forwardRef<SynCatchLogoHandle, SynCatchLogoAnimatedProps>(
  function SynCatchLogoAnimated(
    { className, themed = false, autoPlay = false, loop = false, playOnHover = false, duration = 1200, title = 'SynCatch' },
    ref,
  ) {
  const [phase, setPhase] = useState<Phase>(() =>
    // Honour reduced-motion by skipping straight to the resolved (done) state.
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 'done'
      : 'idle',
  );
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const start = useCallback(() => {
    clearTimers();
    // Reset to idle without a transition, then kick into the sweep next frame.
    setPhase('idle');
    timers.current.push(
      window.setTimeout(() => {
        setPhase('running');
        timers.current.push(window.setTimeout(() => setPhase('done'), duration));
        if (loop) {
          timers.current.push(window.setTimeout(() => start(), duration + 1000));
        }
      }, 20),
    );
  }, [clearTimers, duration, loop]);

  useImperativeHandle(ref, () => ({ play: start }), [start]);

  const playFromHover = useCallback(() => {
    if (phase !== 'running') {
      start();
    }
  }, [phase, start]);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && (autoPlay || loop)) {
      const kick = window.setTimeout(start, 0);
      return () => {
        window.clearTimeout(kick);
        clearTimers();
      };
    }
    return clearTimers;
  }, [autoPlay, loop, start, clearTimers]);

  const loopPaint = themed ? 'rgb(var(--accent-soft))' : BRAND_FOG;
  const dotPaint = themed ? 'rgb(var(--accent))' : BRAND_BLUE;

  const sweeping = phase === 'running';
  const done = phase === 'done';

  const [leadDot, trailDot] = SYNCATCH_DOTS;

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="button"
      aria-label={`${title} — replay animation`}
      tabIndex={0}
      className={className}
      style={{ cursor: 'pointer' }}
      onClick={start}
      onMouseEnter={playOnHover ? playFromHover : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          start();
        }
      }}
    >
      <title>{title}</title>

      {/* The loop spins while syncing, pops when the sync lands */}
      <g
        style={{
          transformOrigin: '50px 50px',
          transform: sweeping ? 'rotate(360deg) scale(0.94)' : done ? 'rotate(0deg) scale(1.06)' : 'rotate(0deg) scale(1)',
          transition: sweeping
            ? `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`
            : done
              ? 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'transform 200ms ease',
        }}
      >
        <path d={SYNCATCH_LOOP} stroke={loopPaint} strokeWidth={SYNCATCH_STROKE_WIDTH} strokeLinecap="round" />
        <circle cx={trailDot.cx} cy={trailDot.cy} r={trailDot.r} fill={dotPaint} />

        {/* "Aachu" — the lead dot lands green when the catch is made */}
        <circle
          cx={leadDot.cx}
          cy={leadDot.cy}
          r={leadDot.r}
          fill={done ? SUCCESS_GREEN : dotPaint}
          style={{
            transformOrigin: `${leadDot.cx}px ${leadDot.cy}px`,
            transform: done ? 'scale(1.25)' : 'scale(1)',
            transition: done
              ? 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1) 120ms, fill 200ms ease 120ms'
              : 'transform 150ms ease, fill 150ms ease',
          }}
        />
      </g>
    </svg>
  );
  },
);
