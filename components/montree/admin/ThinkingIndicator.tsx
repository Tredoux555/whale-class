// components/montree/admin/ThinkingIndicator.tsx
//
// While Astra is processing (request in flight, before tokens stream OR
// while a tool is running) the surface must always have something visibly
// alive. A static spinner reads as "frozen" — the principal pays per turn
// and a still surface makes her wonder whether anything is happening.
//
// What this gives:
//   1. Pulsing avatar — gentle gold breathe (scale 1.0 → 1.04, gold glow)
//   2. Three typing dots — sequential fade, dark gold
//   3. Optional progress text — italic dim line below dots when an SSE
//      tool_progress event is active (parsing / lookingUp / fetchingContext
//      / composing) — already wired in /api/montree/admin/principal-agent.
//
// 🚨 GLOW ARCHITECTURE — May 29, 2026 final fix.
// The halo is rendered by a ::before pseudo-element on .tracy-pulse
// that's absolutely positioned with inset:-10px. This puts the halo
// INSIDE the .tracy-pulse-wrap element's padding box — so even if a
// parent has overflow:hidden the halo can't get clipped at the bottom
// (or any edge). The halo is a radial-gradient with no hard ring edge,
// which looks naturally circular regardless of border-radius. The
// inner avatar keeps its own monogram shape (Astra "A").
//
// Used by:
//   - app/montree/admin/page.tsx (full chat surface)
//   - components/montree/admin/TracyFloat.tsx (cockpit-wide float)
//
// Design tokens match the dark forest cockpit palette. Animations live in
// a styled-jsx block so we don't pollute the global CSS.
'use client';

import TracyAvatar from './TracyAvatar';

interface ThinkingIndicatorProps {
  /** Avatar size in px (default 36 for chat page, 28 for float) */
  size?: number;
  /** Optional progress label (already i18n-resolved by the caller). */
  progressLine?: string | null;
  /** ARIA label for screen readers. Defaults to a generic "thinking". */
  ariaLabel?: string;
}

const GOLD = '#E8C96A';
const TEXT_MUTED = 'rgba(255,255,255,0.40)';
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

export default function ThinkingIndicator({
  size = 36,
  progressLine = null,
  ariaLabel = 'Astra is thinking',
}: ThinkingIndicatorProps) {
  return (
    <div
      style={{
        // 🚨 alignItems: 'center' — the avatar wrapper has 18px padding so
        // it's 18px taller on each side than its bare avatar. Without
        // center alignment, the dots column sits at the top of the row
        // while the avatar+halo center sits 18px below — dots appear ABOVE
        // the avatar's center, looks wrong. Center alignment puts both at
        // the same vertical midline regardless of padding math.
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
      }}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {/*
        Outer wrapper has padding equal to the halo's max reach (18px),
        so the halo lives INSIDE the wrapper's layout box and can't be
        clipped by any parent overflow boundary. flexShrink:0 prevents
        the wrapper from getting squeezed below the avatar+halo size
        when the row is tight.
      */}
      <span
        className="tracy-pulse-wrap"
        style={{
          position: 'relative',
          display: 'inline-block',
          padding: 18,
          lineHeight: 0,
          verticalAlign: 'top',
          flexShrink: 0,
        }}
      >
        <span
          className="tracy-pulse"
          style={{
            display: 'block',
            position: 'relative',
            width: size,
            height: size,
            borderRadius: '50%',
          }}
        >
          <TracyAvatar size={size} />
        </span>
      </span>
      {/* paddingTop: 0 — the outer flex container now centers vertically,
          so the dots column doesn't need padding to align with the avatar. */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          aria-hidden
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            paddingTop: 4,
          }}
        >
          <span className="tracy-dot tracy-dot-1" />
          <span className="tracy-dot tracy-dot-2" />
          <span className="tracy-dot tracy-dot-3" />
        </div>
        {progressLine && (
          <div
            style={{
              marginTop: 8,
              color: TEXT_MUTED,
              fontFamily: SANS,
              fontSize: 13,
              fontStyle: 'italic',
              lineHeight: 1.5,
              letterSpacing: 0.1,
            }}
          >
            {progressLine}
          </div>
        )}
      </div>

      <style jsx>{`
        /* Halo lives on a ::before pseudo-element of .tracy-pulse.
           inset:-10px puts it 10px outside the avatar on all sides;
           the wrapper's 18px padding above keeps everything inside the
           parent's layout box. Radial-gradient with no hard edge looks
           naturally circular. */
        .tracy-pulse::before {
          content: '';
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(232, 201, 106, 0.32) 0%,
            rgba(232, 201, 106, 0.12) 45%,
            rgba(232, 201, 106, 0) 72%
          );
          opacity: 0;
          animation: tracyHaloPulse 1.6s ease-in-out infinite;
          pointer-events: none;
          z-index: 0;
        }
        .tracy-pulse {
          animation: tracyAvatarBreathe 1.6s ease-in-out infinite;
          will-change: transform;
        }
        .tracy-pulse > * {
          position: relative;
          z-index: 1;
        }
        .tracy-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${GOLD};
          opacity: 0.35;
          animation: tracyDotFade 1.4s ease-in-out infinite;
        }
        .tracy-dot-1 {
          animation-delay: 0s;
        }
        .tracy-dot-2 {
          animation-delay: 0.2s;
        }
        .tracy-dot-3 {
          animation-delay: 0.4s;
        }
        @keyframes tracyHaloPulse {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.9);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        @keyframes tracyAvatarBreathe {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.04);
          }
        }
        @keyframes tracyDotFade {
          0%,
          80%,
          100% {
            opacity: 0.3;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tracy-pulse,
          .tracy-pulse::before,
          .tracy-dot {
            animation: none;
          }
          .tracy-dot {
            opacity: 0.7;
          }
          .tracy-pulse::before {
            opacity: 0.5;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Small inline spinner used inside tool chips (already-rendered surfaces) to
 * show "this tool is in flight". 14px, brand emerald, 1s linear infinite.
 * Caller wraps it next to the tool name; on success/failure caller swaps in
 * a check or x mark instead.
 */
export function ToolChipSpinner({ size = 14 }: { size?: number }) {
  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: 'toolChipSpin 1s linear infinite',
          color: '#34d399',
          flexShrink: 0,
        }}
        aria-hidden
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <style jsx>{`
        @keyframes toolChipSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
