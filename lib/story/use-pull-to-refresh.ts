// lib/story/use-pull-to-refresh.ts
// Mobile pull-to-refresh hook for the Story messaging system.
// Touch-only by design — desktop users use the browser's native refresh.
//
// Activates only when the page is scrolled to the very top. Uses passive
// touch listeners attached at window level so it works regardless of which
// element the touch starts on. Uses refs (not deps) for current pull state
// so listeners attach once per mount, not per gesture.
//
// Behavior:
//   1. Touch starts at scrollY=0 → arm gesture, capture start Y
//   2. Touch moves down → linearly map to pullDistance with 0.5x damping
//      (rubber-band feel) up to maxPull
//   3. Touch ends past threshold → fire onRefresh, hold indicator at
//      threshold height until refresh promise settles
//   4. Touch ends before threshold → snap back to 0
//
// onRefresh can be sync or async. Errors are swallowed so a failed fetch
// doesn't leave the indicator stuck. Caller is responsible for surfacing
// errors via their own state.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UsePullToRefreshOptions {
  /** Called when the user releases past `threshold`. Awaited if it returns a Promise. */
  onRefresh: () => Promise<void> | void;
  /** Pull distance (px) past which release fires onRefresh. Default 70. */
  threshold?: number;
  /** Visual cap (px) on how far the indicator extends. Default 110. */
  maxPull?: number;
  /** When true, listeners are attached but no-op (useful while modals are open). */
  disabled?: boolean;
}

export interface UsePullToRefreshState {
  /** Current visual pull distance in px. 0 when idle. */
  pullDistance: number;
  /** True from onRefresh start until its promise settles. */
  isRefreshing: boolean;
  /** Echo of the configured threshold for the indicator component. */
  threshold: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 110,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stash latest onRefresh in a ref so listener identity doesn't depend on it.
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  // Stash latest distance in a ref so handleEnd reads the current value
  // without making the effect re-run on every move.
  const pullDistanceRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const refreshingRef = useRef(false);
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const cancelGesture = useCallback(() => {
    startYRef.current = null;
    pullDistanceRef.current = 0;
    setPullDistance(0);
  }, []);

  useEffect(() => {
    const handleStart = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current) return;
      // Only arm at the top of the page — otherwise a scroll-up gesture
      // would steal the user's natural overscroll.
      if (window.scrollY > 0) {
        startYRef.current = null;
        return;
      }
      startYRef.current = e.touches[0].clientY;
    };

    const handleMove = (e: TouchEvent) => {
      if (disabledRef.current || refreshingRef.current) return;
      if (startYRef.current === null) return;
      const diff = e.touches[0].clientY - startYRef.current;
      if (diff <= 0) {
        if (pullDistanceRef.current !== 0) {
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
        return;
      }
      // 0.5x damping mimics native iOS rubber-band feel.
      const eased = Math.min(maxPull, diff * 0.5);
      pullDistanceRef.current = eased;
      setPullDistance(eased);
    };

    const handleEnd = async () => {
      if (refreshingRef.current) return;
      const distance = pullDistanceRef.current;
      const armed = startYRef.current !== null;
      startYRef.current = null;
      if (!armed) return;

      if (distance >= threshold) {
        refreshingRef.current = true;
        setIsRefreshing(true);
        // Hold the indicator at threshold height while the refresh runs.
        pullDistanceRef.current = threshold;
        setPullDistance(threshold);
        try {
          await onRefreshRef.current();
        } catch {
          // Swallow — caller surfaces errors via its own state.
        } finally {
          refreshingRef.current = false;
          setIsRefreshing(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleStart, { passive: true });
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleEnd, { passive: true });
    window.addEventListener('touchcancel', handleEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
    // We intentionally only re-attach if threshold/maxPull change. Other
    // values flow through refs.
  }, [threshold, maxPull]);

  // If the consumer flips `disabled` true mid-gesture, cancel cleanly so the
  // indicator doesn't stay stuck pulled down.
  useEffect(() => {
    if (disabled) cancelGesture();
  }, [disabled, cancelGesture]);

  return { pullDistance, isRefreshing, threshold };
}
