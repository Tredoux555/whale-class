// lib/story/PullRefreshIndicator.tsx
// Visual indicator that follows the pull-to-refresh gesture.
// Renders nothing when idle; expands from the top of the viewport during
// pull, holds at threshold while refresh is in flight, then collapses.
//
// Two visual variants for the two surfaces:
//   - 'parent' (default): subtle dark gradient — matches the parent-facing
//     story page's quiet aesthetic (white text on whatever is below).
//   - 'admin': bright slate panel — readable on the admin dashboard's
//     mixed light/dark UI.

'use client';

import { CSSProperties } from 'react';

export type PullIndicatorVariant = 'parent' | 'admin';

interface Props {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
  variant?: PullIndicatorVariant;
}

export default function PullRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold,
  variant = 'parent',
}: Props) {
  if (pullDistance === 0 && !isRefreshing) return null;

  const ready = pullDistance >= threshold;

  const wrapper: CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: pullDistance,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 9999,
    overflow: 'hidden',
    transition: isRefreshing ? 'none' : 'height 0.18s ease-out',
    background:
      variant === 'admin'
        ? 'linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.55) 70%, transparent 100%)'
        : 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 70%, transparent 100%)',
  };

  const label: CSSProperties = {
    color: 'white',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0.2,
    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
    paddingBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    opacity: Math.min(1, pullDistance / Math.max(1, threshold * 0.55)),
  };

  const arrow: CSSProperties = {
    display: 'inline-block',
    transform: ready ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.15s ease',
    fontSize: 16,
  };

  const spinner: CSSProperties = {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.35)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'pull-refresh-spin 0.8s linear infinite',
  };

  return (
    <div style={wrapper} aria-hidden="true">
      <style>{`
        @keyframes pull-refresh-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
      <div style={label}>
        {isRefreshing ? (
          <>
            <span style={spinner} />
            Refreshing…
          </>
        ) : (
          <>
            <span style={arrow}>↓</span>
            {ready ? 'Release to refresh' : 'Pull to refresh'}
          </>
        )}
      </div>
    </div>
  );
}
