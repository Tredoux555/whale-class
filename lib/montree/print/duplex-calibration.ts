// lib/montree/print/duplex-calibration.ts
//
// The duplex calibration "gizmo", lifted out of
// app/montree/library/tools/phonics-fast/bingo/page.tsx so that every duplex
// print tool can share ONE calibration per printer instead of each tool
// keeping its own.
//
// What it is: a small X/Y nudge, in millimetres, applied to the BACK pages of
// a duplex print job only, to absorb whatever mechanical duplex offset a
// particular printer still has after the structural CSS fix (`@page{margin:0}`).
// It is a property of the PRINTER, not of any print job, so it persists in
// localStorage under a GLOBAL key — DEFAULT_DUPLEX_CALIBRATION_STORAGE_KEY.
//
// The bingo page still owns its own older, page-scoped key
// (`montree.phonicsFast.callingCards.duplexCalibration.v1`) and is deliberately
// NOT modified here; it can migrate to this hook later by passing that key in.
//
// Clamp, step and hydration behaviour are identical to bingo's, on purpose.

'use client';

import { useCallback, useEffect, useState } from 'react';

/** The global, per-printer key. One calibration serves every duplex tool. */
export const DEFAULT_DUPLEX_CALIBRATION_STORAGE_KEY = 'montree.print.duplexCalibration.v1';

/** Slider bounds and step, shared by the UI and the clamp. */
export const DUPLEX_OFFSET_LIMIT_MM = 3;
export const DUPLEX_OFFSET_STEP_MM = 0.5;

/**
 * Which axis the physical duplex flip mirrors, in the paper's own frame.
 *
 *  - 'vertical'   — top and bottom swap, left/right do not.
 *                   SHORT-edge flip of a PORTRAIT sheet (the flip cards),
 *                   and LONG-edge flip of a landscape sheet.
 *  - 'horizontal' — left and right swap, top/bottom do not.
 *                   SHORT-edge flip of a LANDSCAPE sheet (the sound-frame mat),
 *                   and LONG-edge flip of a portrait sheet (bingo's case).
 */
export type DuplexMirror = 'vertical' | 'horizontal';

/** Snap to the 0.5 mm step the sliders use and clamp to +/- 3 mm. */
export function clampDuplexOffset(mm: number): number {
  if (!Number.isFinite(mm)) return 0;
  const clamped = Math.min(DUPLEX_OFFSET_LIMIT_MM, Math.max(-DUPLEX_OFFSET_LIMIT_MM, mm));
  return Math.round(clamped / DUPLEX_OFFSET_STEP_MM) * DUPLEX_OFFSET_STEP_MM;
}

/**
 * The CSS to put on the BACK page of a duplex job — and only the back page.
 *
 * offsetX / offsetY are always stated in the TEACHER's frame: +X moves the
 * printed back-side content to the RIGHT and +Y moves it DOWN, as seen holding
 * the sheet with the FRONT side up. They are never negated in state or in
 * storage — the negation happens here, at the one point of use, because the
 * physical flip mirrors one axis:
 *
 *   'vertical'   mirror -> a +Y nudge in the back's own frame ends up moving
 *                the content UP once flipped, so Y is negated and X carries
 *                straight through.
 *   'horizontal' mirror -> the same argument on the other axis: X is negated
 *                and Y carries straight through. (This is bingo's case.)
 *
 * Returns '' at the 0/0 default, so an uncalibrated back page keeps exactly
 * the same box tree — and therefore exactly the same page fragmentation — as
 * the front page.
 */
export function backPageTransform(
  offsetX: number,
  offsetY: number,
  mirror: DuplexMirror = 'vertical'
): string {
  const x = clampDuplexOffset(offsetX);
  const y = clampDuplexOffset(offsetY);
  if (x === 0 && y === 0) return '';
  const dx = mirror === 'horizontal' ? -x : x;
  const dy = mirror === 'horizontal' ? y : -y;
  return `transform:translate(${dx}mm, ${dy}mm);`;
}

export interface DuplexCalibrationState {
  offsetX: number;
  offsetY: number;
  setOffsetX: (mm: number) => void;
  setOffsetY: (mm: number) => void;
  reset: () => void;
  /** True once the localStorage read has actually landed. */
  hydrated: boolean;
  /** Convenience: backPageTransform(offsetX, offsetY, mirror). */
  backPageStyle: (mirror?: DuplexMirror) => string;
  /** The key this instance reads and writes. */
  storageKey: string;
}

/**
 * Read/write the per-printer duplex calibration.
 *
 * The hydration guard is deliberately STATE, not a ref: within ONE React
 * effect flush (mount, and again on every pass of StrictMode's dev-only
 * double-invoke) a ref mutated by the read effect is already visible to the
 * write effect that runs immediately after it in the SAME synchronous flush,
 * so a ref would not block that first premature write — which would fire with
 * the write effect's stale pre-hydration closure (0/0) and clobber whatever
 * the read effect just loaded.
 */
export function useDuplexCalibration(
  storageKey: string = DEFAULT_DUPLEX_CALIBRATION_STORAGE_KEY
): DuplexCalibrationState {
  const [offsetX, setOffsetXRaw] = useState(0);
  const [offsetY, setOffsetYRaw] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { x?: number; y?: number };
        if (typeof parsed.x === 'number') setOffsetXRaw(clampDuplexOffset(parsed.x));
        if (typeof parsed.y === 'number') setOffsetYRaw(clampDuplexOffset(parsed.y));
      }
    } catch {
      // Corrupt or unavailable storage — safe to ignore, defaults to 0 mm.
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return; // don't persist until the read above has landed
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ x: offsetX, y: offsetY }));
    } catch {
      // Ignore write failures (private browsing / storage quota, etc).
    }
  }, [offsetX, offsetY, hydrated, storageKey]);

  const setOffsetX = useCallback((mm: number) => setOffsetXRaw(clampDuplexOffset(mm)), []);
  const setOffsetY = useCallback((mm: number) => setOffsetYRaw(clampDuplexOffset(mm)), []);
  const reset = useCallback(() => { setOffsetXRaw(0); setOffsetYRaw(0); }, []);
  const backPageStyle = useCallback(
    (mirror: DuplexMirror = 'vertical') => backPageTransform(offsetX, offsetY, mirror),
    [offsetX, offsetY]
  );

  return { offsetX, offsetY, setOffsetX, setOffsetY, reset, hydrated, backPageStyle, storageKey };
}
