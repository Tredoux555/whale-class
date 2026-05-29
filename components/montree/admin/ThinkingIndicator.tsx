// components/montree/admin/ThinkingIndicator.tsx
//
// While Tracy is processing (request in flight, before tokens stream OR
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
const GOLD_DIM = 'rgba(232,201,106,0.45)';
const TEXT_MUTED = 'rgba(255,255,255,0.40)';
const SANS = '"Inter", -apple-system, BlinkMacSystemFont, sans-serif';

export default function ThinkingIndicator({
  size = 36,
  progressLine = null,
  ariaLabel = 'Tracy is thinking',
}: ThinkingIndicatorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        width: '100%',
      }}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {/*
        Wrapper sized EXACTLY to the avatar with line-height:0 so there's
        no baseline gap below the inline element. Without these, the
        box-shadow on `.tracy-pulse` was painting an asymmetric halo —
        a few extra pixels of "wrapper" hung below the image, so the
        bottom side of the glow looked further out than the top.
      */}
      <span
        className="tracy-pulse"
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          lineHeight: 0,
          verticalAlign: 'top',
        }}
      >
        <TracyAvatar size={size} />
      </span>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 6 }}>
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
        .tracy-pulse {
          animation: tracyAvatarPulse 1.6s ease-in-out infinite;
          /* 🚨 Glow shape — May 29, 2026.
             border-radius on the .tracy-pulse wrapper controls the box-shadow
             halo's shape (NOT the inner avatar's shape — the <img> has its
             own border-radius). 22% produced a soft-square halo that the
             user reported as "not round". 50% makes the halo a perfect
             circle around the T-monogram avatar, which itself keeps its
             rounded-square crop. */
          border-radius: 50%;
          will-change: transform, box-shadow;
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
        @keyframes tracyAvatarPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(232, 201, 106, 0);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 0 6px rgba(232, 201, 106, 0.08),
              0 0 14px 2px ${GOLD_DIM};
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
          .tracy-dot {
            animation: none;
          }
          .tracy-dot {
            opacity: 0.7;
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
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="tracy-tool-spinner"
        style={{ flexShrink: 0 }}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="rgba(52,211,153,0.18)"
          strokeWidth="1.5"
        />
        <path
          d="M12 3 a9 9 0 0 1 9 9"
          stroke="#34d399"
          strokeWidth="1.75"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <style jsx>{`
        .tracy-tool-spinner {
          animation: tracyToolSpin 1s linear infinite;
        }
        @keyframes tracyToolSpin {
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .tracy-tool-spinner {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
