'use client';

/**
 * Single-tap binding for the child-facing item screen.
 *
 * The rules here are from ARCHITECTURE.md §6-D2 and each one is there because of how a
 * three- or four-year-old actually touches a tablet:
 *
 *  • Response registers on POINTER UP with NO dwell-time floor. Children under four hold a
 *    press for up to ~5 s; a dwell timer would read a careful child as an unresponsive one.
 *  • 12 px movement tolerance — a finger that slides is still a tap, a drag is not.
 *  • A debounce runs AFTER a registered response so an excited double-tap cannot skip the
 *    next item. It never runs before one: `lastAt` starts at 0 for every new item, so the
 *    FIRST touch on a freshly rendered screen always lands. A dead window at the start of
 *    an item is invisible to an adult and maddening to a child.
 *  • Sequence items ("touch them in the order you hear") use a shorter guard, because those
 *    taps are all part of one answer and come quickly.
 *
 * No double-tap, no drag, no swipe, no pinch, anywhere in the runner.
 */
import { useCallback, useEffect, useRef } from 'react';

export const TAP_GUARD_SINGLE_MS = 400;
export const TAP_GUARD_SEQUENCE_MS = 250;
const MOVE_TOLERANCE_PX = 12;

export interface TapBinding {
  onPointerDown: (e: { clientX: number; clientY: number }) => void;
  onPointerUp: (e: { clientX: number; clientY: number }) => void;
  onPointerCancel: () => void;
  onPointerLeave: () => void;
  style: { touchAction: 'manipulation'; userSelect: 'none'; WebkitUserSelect: 'none' };
}

export function useTapGuard(guardMs: number, resetKey?: string | number) {
  const lastAt = useRef(0);
  const origin = useRef<{ x: number; y: number; armed: boolean }>({ x: 0, y: 0, armed: false });
  const guard = useRef(guardMs);
  guard.current = guardMs;

  // A new item (or a re-shown practice item) clears the guard, so the first touch lands.
  useEffect(() => {
    lastAt.current = 0;
    origin.current = { x: 0, y: 0, armed: false };
  }, [resetKey]);

  const reset = useCallback(() => {
    lastAt.current = 0;
    origin.current = { x: 0, y: 0, armed: false };
  }, []);

  const bind = useCallback((handler: () => void): TapBinding => ({
    onPointerDown: (e) => {
      origin.current = { x: e.clientX ?? 0, y: e.clientY ?? 0, armed: true };
    },
    onPointerUp: (e) => {
      if (!origin.current.armed) return;
      origin.current.armed = false;
      const dx = Math.abs((e.clientX ?? 0) - origin.current.x);
      const dy = Math.abs((e.clientY ?? 0) - origin.current.y);
      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) return;
      const now = Date.now();
      if (lastAt.current && now - lastAt.current < guard.current) return;
      lastAt.current = now;
      handler();
    },
    onPointerCancel: () => { origin.current.armed = false; },
    onPointerLeave: () => { origin.current.armed = false; },
    style: { touchAction: 'manipulation', userSelect: 'none', WebkitUserSelect: 'none' },
  }), []);

  return { bind, reset };
}

export default useTapGuard;
