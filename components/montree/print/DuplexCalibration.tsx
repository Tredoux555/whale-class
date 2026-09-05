// components/montree/print/DuplexCalibration.tsx
//
// The shared "🎯 Duplex Calibration" card. Lifted out of the phonics-fast
// bingo page so every duplex print tool nudges the same per-printer numbers
// (see lib/montree/print/duplex-calibration.ts for the storage key and the
// sign convention).
//
// LANGUAGE: hardcoded English, the sanctioned exception used by the SATPIN /
// Dark Phonics print tooling. This card only ever appears on those tools.

'use client';

import React from 'react';

import { buildCalibrationSheetHtml } from '@/lib/montree/print/calibration-sheet';
import {
  DUPLEX_OFFSET_LIMIT_MM,
  DUPLEX_OFFSET_STEP_MM,
  type DuplexCalibrationState,
} from '@/lib/montree/print/duplex-calibration';
import { printHtmlDocument } from '@/lib/montree/print/print-window';

interface DuplexCalibrationProps {
  /** The value returned by useDuplexCalibration(). */
  calibration: DuplexCalibrationState;
  /** Optional extra line explaining what the nudge moves on THIS tool. */
  hint?: string;
}

export default function DuplexCalibration({ calibration, hint }: DuplexCalibrationProps) {
  const { offsetX, offsetY, setOffsetX, setOffsetY, reset } = calibration;

  const printTestSheet = () => {
    printHtmlDocument(
      buildCalibrationSheetHtml({
        offsetX,
        offsetY,
        // Always 'vertical': the test sheet is a fixed, tool-agnostic A4
        // portrait short-edge design of its own, not a preview of whatever
        // work the page is on, so its own flip is the one that applies.
        backPageStyle: calibration.backPageStyle('vertical'),
      })
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div>
          <div className="text-sm font-semibold text-gray-700">🎯 Duplex Calibration</div>
          <div className="text-xs text-gray-500">
            Nudges the BACK side only — use it if the fronts and the backs don&apos;t quite line up
            on your printer. Saved for this printer and used by every duplex work.
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-semibold w-4">X</span>
          <input
            type="range"
            min={-DUPLEX_OFFSET_LIMIT_MM}
            max={DUPLEX_OFFSET_LIMIT_MM}
            step={DUPLEX_OFFSET_STEP_MM}
            value={offsetX}
            onChange={(e) => setOffsetX(parseFloat(e.target.value))}
            className="accent-teal-600"
          />
          <span className="font-mono text-xs w-14 text-right">{offsetX.toFixed(1)}mm</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-semibold w-4">Y</span>
          <input
            type="range"
            min={-DUPLEX_OFFSET_LIMIT_MM}
            max={DUPLEX_OFFSET_LIMIT_MM}
            step={DUPLEX_OFFSET_STEP_MM}
            value={offsetY}
            onChange={(e) => setOffsetY(parseFloat(e.target.value))}
            className="accent-teal-600"
          />
          <span className="font-mono text-xs w-14 text-right">{offsetY.toFixed(1)}mm</span>
        </label>
        {(offsetX !== 0 || offsetY !== 0) && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-500 underline hover:text-gray-700"
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={printTestSheet}
          className="text-xs font-semibold px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          🖨️ Print calibration test sheet
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Hold the printed test sheet up to the light: the amber crosshair is the back, the black one
        is the front. Read how far apart they are on the 1&nbsp;mm ruler and type those two numbers
        in here. <b>X</b> is sideways (+ moves the back to the right), <b>Y</b> is up and down (+
        moves the back down), both as seen with the front side facing you.
        {hint ? ` ${hint}` : ''}
      </p>
    </div>
  );
}
