'use client';

/**
 * TraceWork — the last work on the shelf: write the word with a finger.
 *
 * The stroke model is the repo's own a–z letter-strokes definition — the SAME
 * source the printed tracing worksheets render from — laid out into a word by
 * v2-shelf/strokes.ts. The shape a child draws here is therefore the shape they
 * copy on paper, by construction rather than by resemblance.
 *
 * THE RULES OF THE TRACE, all borrowed from the shipped Book Works tracer
 * because they were learned on real four-year-olds:
 *
 *   · FORWARD ONLY. Progress is an index into one flat run of samples across
 *     every stroke of every letter, in writing order. It never runs backwards.
 *   · A SHORT LOOK-AHEAD. A finger may only advance a little way per move, so
 *     dropping a finger on the last letter finishes nothing.
 *   · A GENEROUS CORRIDOR. The viewBox is 120 tall; the tolerance is ~14 units.
 *     This is a small finger on a tablet, not a mouse.
 *   · LIFTING KEEPS PROGRESS. A child can pause between strokes — which is
 *     exactly what correct letter formation requires — and carry on.
 *
 * NO SCORE. Finishing plays the word and glows once. Nothing is kept.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import { buildWordTrace } from '@/lib/montree/dark-phonics/v2-shelf/strokes';

/** Samples spread across the whole word, in proportion to real stroke length. */
const TRACE_SAMPLES = 320;
/** Hit corridor, in viewBox units (the frame is 120 tall). */
const TOLERANCE = 14;
/** Fraction of the word a single move may jump. */
const MAX_JUMP = 0.06;
/** Where the trace counts as finished. */
const DONE_AT = 98;
/** Pen weight, in viewBox units. */
const PEN = 11;
const PATH_UNITS = 1000;

export default function TraceWork({
  word,
  onDone,
}: {
  word: string;
  onDone: () => void;
}) {
  const model = useMemo(() => buildWordTrace(word), [word]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const samplesRef = useRef<Array<{ x: number; y: number }> | null>(null);
  const drawingRef = useRef(false);
  const doneFiredRef = useRef(false);

  /**
   * Measured ONCE, into state rather than a ref: the render stays pure (no ref
   * reads while rendering — the start dot needs a coordinate, not a live path)
   * and every consumer sees the same numbers.
   */
  const [geom, setGeom] = useState<{
    counts: number[];
    starts: Array<{ x: number; y: number }>;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [touched, setTouched] = useState(false);
  const [glow, setGlow] = useState(false);
  const glowTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (glowTimer.current !== null) window.clearTimeout(glowTimer.current);
    },
    []
  );

  /**
   * Sample every stroke in draw order, allocating points in proportion to each
   * stroke's real length — so a flat index IS arc-length progress through the
   * whole word.
   *
   * 🚨 THIS IS A REF CALLBACK ON THE <svg>, NOT AN EFFECT. React attaches child
   * refs before the parent's, so by the time this runs every measurement path
   * is in the document — and measuring here means the geometry is ready in the
   * same commit the paths appear in, instead of one cascading render later. The
   * callback's identity is keyed to `model`, so a new word re-measures itself.
   *
   * The numbers are viewBox units, so they never need re-taking on resize.
   */
  const attachSvg = useCallback(
    (svg: SVGSVGElement | null) => {
      svgRef.current = svg;
      if (!svg) return;
      const els = pathRefs.current.slice(0, model.strokes.length);
      if (!model.strokes.length || els.some((e) => !e)) return;
      const lengths = els.map((e) => e!.getTotalLength());
      const total = lengths.reduce((a, b) => a + b, 0);
      if (total <= 0) return;
      const pts: Array<{ x: number; y: number }> = [];
      const counts: number[] = [];
      const starts: Array<{ x: number; y: number }> = [];
      model.strokes.forEach((stroke, k) => {
        const n = Math.max(10, Math.round((TRACE_SAMPLES * lengths[k]) / total));
        counts.push(n);
        const head = els[k]!.getPointAtLength(0);
        // getPointAtLength is in the path's OWN space — put it back in the word.
        starts.push({ x: head.x + stroke.dx, y: head.y });
        for (let i = 0; i < n; i++) {
          const p = els[k]!.getPointAtLength((lengths[k] * i) / (n - 1));
          pts.push({ x: p.x + stroke.dx, y: p.y });
        }
      });
      samplesRef.current = pts;
      setGeom({ counts, starts });
    },
    [model]
  );

  const advance = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const pts = samplesRef.current;
      if (!pts) return;
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());

      setProgress((prev) => {
        const current = Math.round((prev / 100) * (pts.length - 1));
        const limit = Math.min(
          pts.length - 1,
          current + Math.max(4, Math.round(pts.length * MAX_JUMP))
        );
        let best = -1;
        let bestDist = TOLERANCE;
        for (let i = current; i <= limit; i++) {
          const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y);
          if (d <= bestDist) {
            bestDist = d;
            best = i;
          }
        }
        if (best <= current) return prev;
        let pct = Math.round((best / (pts.length - 1)) * 100);
        if (pct >= DONE_AT) pct = 100;
        if (pct <= prev) return prev;

        if (pct === 100 && !doneFiredRef.current) {
          doneFiredRef.current = true;
          playAudio('word', word);
          setGlow(true);
          if (glowTimer.current !== null) window.clearTimeout(glowTimer.current);
          glowTimer.current = window.setTimeout(() => setGlow(false), 1000);
          onDone();
        }
        return pct;
      });
    },
    [onDone, word]
  );

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    setTouched(true);
    drawingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }
    advance(e);
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drawingRef.current) return;
    advance(e);
  };
  const up = () => {
    drawingRef.current = false;
  };

  const reset = () => {
    doneFiredRef.current = false;
    setProgress(0);
    setTouched(false);
  };

  /** How far through stroke k the finger is, 0..1. */
  const strokeFraction = (k: number) => {
    if (!geom) return progress >= 100 ? 1 : 0;
    const total = geom.counts.reduce((a, b) => a + b, 0);
    const idx = (progress / 100) * (total - 1);
    const start = geom.counts.slice(0, k).reduce((a, b) => a + b, 0);
    const span = Math.max(1, geom.counts[k] - 1);
    return Math.max(0, Math.min(1, (idx - start) / span));
  };

  const activeStroke = (() => {
    for (let k = 0; k < model.strokes.length; k++) {
      if (strokeFraction(k) < 1) return k;
    }
    return model.strokes.length - 1;
  })();

  const done = progress >= 100;

  if (!model.strokes.length) {
    return (
      <p className="text-[13px] text-[var(--dpl-ink2)]">
        There is no stroke model for “{word}” yet.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[8px]">
      <header className="flex flex-none flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
        <h2
          className="text-[14px] font-bold text-[var(--dpl-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          Tracing · {word}
        </h2>
        <p className="text-[12px] text-[var(--dpl-ink2)]">
          {done
            ? 'You wrote the whole word.'
            : 'Start on the green dot and follow the letter with one finger.'}
        </p>
      </header>

      <div
        className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-[var(--dpl-r-md)] border p-[10px] transition-shadow"
        style={{
          background: 'var(--dpl-slide-bg)',
          borderColor: 'var(--dpl-slide-edge)',
          boxShadow: glow ? 'inset 0 0 60px -6px var(--dpl-slide-accent-2)' : 'none',
        }}
      >
        <svg
          ref={attachSvg}
          viewBox={model.viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="min-h-0 w-full flex-1 touch-none select-none"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="img"
          aria-label={done ? `the word ${word}, traced` : `trace the word ${word}`}
        >
          {/* the three-line school rule, so the word sits where it does on paper */}
          {[
            { y: 15, dash: '3 7' },
            { y: 40, dash: '5 6' },
            { y: 88, dash: undefined },
          ].map((rule) => (
            <line
              key={rule.y}
              x1={-40}
              x2={model.width + 40}
              y1={rule.y}
              y2={rule.y}
              stroke="var(--dpl-slide-line)"
              strokeWidth={1.4}
              strokeDasharray={rule.dash}
            />
          ))}

          {/* geometry reference — never painted, only measured */}
          {model.strokes.map((s, k) => (
            <path
              key={`m-${k}`}
              ref={(el) => {
                pathRefs.current[k] = el;
              }}
              d={s.d}
              fill="none"
              stroke="none"
            />
          ))}

          {/* the word, waiting */}
          {model.strokes.map((s, k) => (
            <path
              key={`b-${k}`}
              d={s.d}
              transform={s.transform}
              fill="none"
              stroke="var(--dpl-slide-line)"
              strokeWidth={PEN}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={done || k === activeStroke ? 1 : 0.55}
            />
          ))}

          {/* filled in behind the finger */}
          {model.strokes.map((s, k) => {
            const f = strokeFraction(k);
            if (f <= 0) return null;
            return (
              <path
                key={`f-${k}`}
                d={s.d}
                transform={s.transform}
                pathLength={PATH_UNITS}
                fill="none"
                stroke={done ? 'var(--dpl-slide-accent-2)' : 'var(--dpl-slide-accent)'}
                strokeWidth={PEN}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${f * PATH_UNITS} ${PATH_UNITS}`}
              />
            );
          })}

          {/* the tittles of i and j — drawn, never traced: a dot is not a stroke */}
          {model.dots.map((dot, i) => (
            <circle
              key={`d-${i}`}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r + 1.5}
              fill={done ? 'var(--dpl-slide-accent-2)' : 'var(--dpl-slide-ink3)'}
            />
          ))}

          {/* start here — on the stroke the child is on, until they touch it */}
          {!done && geom?.starts[activeStroke] ? (
            <StartDot at={geom.starts[activeStroke]} pulse={!touched} />
          ) : null}
        </svg>

        <div className="pointer-events-none absolute inset-x-0 bottom-[8px] flex justify-center">
          <button
            type="button"
            onClick={reset}
            className="pointer-events-auto min-h-[40px] rounded-[var(--dpl-r-pill)] border px-[18px] text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{
              borderColor: 'var(--dpl-slide-line)',
              color: 'var(--dpl-slide-ink2)',
              background: 'var(--dpl-slide-bg)',
              fontFamily: 'var(--dpl-font-display)',
            }}
          >
            Start again
          </button>
        </div>
      </div>

      <p
        aria-live="polite"
        className="flex-none text-center text-[11px] uppercase tracking-[0.14em]"
        style={{ color: done ? 'var(--dpl-live-ink)' : 'var(--dpl-ink3)' }}
      >
        {done ? `${word} — written` : `${progress}%`}
      </p>
    </div>
  );
}

/**
 * The green "start here" dot.
 *
 * It is handed a coordinate MEASURED FROM THE SAME SAMPLING PASS the trace
 * itself uses, rather than reading the live path element during render — so it
 * can never mark a point the tracer does not agree is the start, and the render
 * stays free of ref reads.
 */
function StartDot({ at, pulse }: { at: { x: number; y: number }; pulse: boolean }) {
  return (
    <circle cx={at.x} cy={at.y} r={PEN * 0.62} fill="var(--dpl-slide-accent-2)">
      {pulse ? (
        <animate
          attributeName="r"
          values={`${PEN * 0.5};${PEN * 0.9};${PEN * 0.5}`}
          dur="1.4s"
          repeatCount="indefinite"
        />
      ) : null}
    </circle>
  );
}
