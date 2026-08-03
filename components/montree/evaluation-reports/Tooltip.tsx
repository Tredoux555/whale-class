'use client';

/**
 * Montree Milestones — the hover layer for the reflection charts.
 *
 * ┌─────────────────────────────────────────────────────────────────────────────────┐
 * │ 🚫 NEVER-PARENT. Not for app/montree/parent/** or components/parent/**.          │
 * └─────────────────────────────────────────────────────────────────────────────────┘
 *
 * An on-screen chart is interactive by default, so every mark here has a tooltip. The
 * tooltip carries the exact numbers, which means the chart itself never needs a label
 * on every segment.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { T } from './tokens';

export interface TooltipState { x: number; y: number; content: ReactNode }

export function useTooltip() {
  const [tip, setTip] = useState<TooltipState | null>(null);

  const show = useCallback((event: { clientX: number; clientY: number; currentTarget: EventTarget | null }, content: ReactNode) => {
    const host = (event.currentTarget as HTMLElement | null)?.closest('[data-viz-root]') as HTMLElement | null;
    const box = host?.getBoundingClientRect();
    setTip({
      x: box ? event.clientX - box.left : event.clientX,
      y: box ? event.clientY - box.top : event.clientY,
      content,
    });
  }, []);

  const hide = useCallback(() => setTip(null), []);

  return { tip, show, hide };
}

export function TooltipLayer({ tip }: { tip: TooltipState | null }) {
  if (!tip) return null;
  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        left: tip.x,
        top: tip.y,
        transform: 'translate(-50%, calc(-100% - 12px))',
        pointerEvents: 'none',
        background: 'rgba(6,16,10,0.97)',
        border: '1px solid rgba(52,211,153,0.28)',
        borderRadius: 10,
        padding: '9px 12px',
        fontFamily: T.sans,
        fontSize: 12,
        color: T.textPrimary,
        lineHeight: 1.55,
        whiteSpace: 'nowrap',
        boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
        zIndex: 40,
      }}
    >
      {tip.content}
    </div>
  );
}

/** Wraps a chart so the tooltip can position itself against the chart, not the page. */
export function VizRoot({ children }: { children: ReactNode }) {
  return (
    <div data-viz-root style={{ position: 'relative' }}>
      {children}
    </div>
  );
}
