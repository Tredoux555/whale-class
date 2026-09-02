'use client';

/**
 * TraceSurface — one word, written with a finger.
 *
 * This is the tracing WORK ITSELF, with no chrome of its own: the caller owns
 * the heading, the page counter and the "Start again" button. It began life as
 * TraceWork (the single-word stage) and became a surface the day the tracing
 * stage turned into a book — every page of that book mounts one of these, and
 * only the page the child is on is armed.
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
 * 🚨 "START AGAIN" IS A REMOUNT, NOT A RESET. There is no clear() here and no
 * effect watching a reset counter: the caller keys the surface on the word and
 * its own reset count, so starting again throws the whole surface away and
 * builds a clean one. One way for a trace to be empty, and no way for a stale
 * sample run to survive it.
 *
 * 🚨 THE SURFACE MUST OWN THE POINTER. Inside the flip book, StPageFlip would
 * happily read a slow drag across a page as a page turn and take the child's
 * word away mid-letter. So: `touch-action: none`, pointer capture on the first
 * contact, and every pointer event stopped here rather than allowed to bubble
 * out to the book. The book is turned by this component finishing, never by a
 * finger.
 *
 * NO SCORE. Finishing plays the word and glows once. Nothing is kept.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import { buildWordTrace } from '@/lib/montree/dark-phonics/v2-shelf/strokes';

/** Samples spread across the whole word, in proportion to real stroke length. */
const TRACE_SAMPLES = 320;
/** Hit corridor, in viewBox units (the glyph frame is 120 tall). */
const TOLERANCE = 14;
/**
 * The corridor's FLOOR, in real screen pixels. The corridor above is in glyph
 * units, so it shrinks on screen exactly as the word does — fine for one big
 * hero word, useless for a whole traced sentence set small on a workbook page.
 * A fingertip is about 9mm whatever the word is doing, so the corridor is
 * whichever of the two is wider.
 */
const MIN_TOUCH_PX = 22;
/** Likewise the start dot: never smaller than this on screen. */
const MIN_DOT_PX = 11;
/** Air left around the ink when the view is cropped to it, in glyph units. */
const VIEW_PAD = 8;
/** Fraction of the word a single move may jump. */
const MAX_JUMP = 0.06;
/** Where the trace counts as finished. */
const DONE_AT = 98;
/** Pen weight, in viewBox units. */
const PEN = 11;
const PATH_UNITS = 1000;

export interface TraceSurfaceProps {
  /** The word to write. Lower case, letters only — see traceableForm(). */
  word: string;
  /**
   * Whether this surface accepts a finger. Exactly one page of the tracing book
   * is armed at a time; the rest render the same faint word, inert.
   */
  armed?: boolean;
  /** Fired once, the moment the word is finished. */
  onComplete?: () => void;
}

export default function TraceSurface({
  word,
  armed = true,
  onComplete,
}: TraceSurfaceProps) {
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
  /**
   * 🚨 THE VIEW IS CROPPED TO THE INK, AND THAT IS WHAT MAKES THE WORD BIG.
   * The laid-out word's own viewBox carries half a glyph cell of air at each
   * end and the full 120-unit ascender-to-descender frame, so a page fitting
   * that box spends a third of its width and height on nothing. Cropped to the
   * real bounding box of the strokes (plus the school rule and a little air),
   * the same page draws the same word about half as big again — which on a
   * tablet is the difference between a word a finger can follow and one it
   * cannot. Measured in the same pass as the samples; null until then, when the
   * model's own box is used.
   */
  const [view, setView] = useState<string | null>(null);
  /** Screen pixels per glyph unit, for the things that must not scale away. */
  const [scale, setScale] = useState(1);
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

      // Crop to the ink.
      //
      // 🚨 THE BOUNDS COME FROM THE SAMPLES, NOT FROM getBBox(). Every page of
      // the tracing book measures itself as it mounts, and StPageFlip keeps the
      // pages a child is not on `display:none` — where getBBox() reports zeros
      // while getTotalLength() keeps working. A crop taken from getBBox() would
      // therefore collapse to nothing on every page but the visible one, and
      // the word would be drawn spilling off the paper. The samples are the
      // same points the trace is judged against, in the same space, and they
      // are correct whether the page is on screen or not.
      let x0 = Infinity;
      let x1 = -Infinity;
      // The school rule is part of the picture and is never cropped away,
      // however short the word's own vertical reach.
      let y0 = 15;
      let y1 = 88;
      for (const pt of pts) {
        if (pt.x < x0) x0 = pt.x;
        if (pt.x > x1) x1 = pt.x;
        if (pt.y < y0) y0 = pt.y;
        if (pt.y > y1) y1 = pt.y;
      }
      if (Number.isFinite(x0) && x1 > x0) {
        const pad = VIEW_PAD + PEN / 2;
        setView(
          `${round(x0 - pad)} ${round(y0 - pad)} ${round(x1 - x0 + 2 * pad)} ${round(
            y1 - y0 + 2 * pad
          )}`
        );
      }
    },
    [model]
  );

  // How big a glyph unit currently is on screen. Watched rather than measured
  // once: the book is remeasured and remounted on a rotate, and a corridor
  // sized for the old shape would be the wrong width for the new one.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const read = () => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const s = Math.hypot(ctm.a, ctm.b);
      if (s > 0) setScale((prev) => (Math.abs(prev - s) < 0.01 ? prev : s));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(svg);
    return () => ro.disconnect();
  }, [view]);

  const advance = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const pts = samplesRef.current;
      if (!pts) return;
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const unit = Math.hypot(ctm.a, ctm.b) || 1;
      const tolerance = Math.max(TOLERANCE, MIN_TOUCH_PX / unit);

      setProgress((prev) => {
        const current = Math.round((prev / 100) * (pts.length - 1));
        const limit = Math.min(
          pts.length - 1,
          current + Math.max(4, Math.round(pts.length * MAX_JUMP))
        );
        let best = -1;
        let bestDist = tolerance;
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
          onComplete?.();
        }
        return pct;
      });
    },
    [onComplete, word]
  );

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!armed) return;
    e.preventDefault();
    // The book must never see this stroke as a drag on a page corner.
    e.stopPropagation();
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
    if (!armed || !drawingRef.current) return;
    e.stopPropagation();
    advance(e);
  };
  const up = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drawingRef.current) e.stopPropagation();
    drawingRef.current = false;
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
    <div
      data-trace-surface={word}
      data-armed={armed ? 'yes' : 'no'}
      data-progress={progress}
      className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-[var(--dpl-r-sm)] transition-shadow"
      style={{ boxShadow: glow ? 'inset 0 0 60px -6px var(--dpl-slide-accent-2)' : 'none' }}
    >
      <svg
        ref={attachSvg}
        viewBox={view ?? model.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="min-h-0 w-full flex-1 touch-none select-none"
        style={{ touchAction: 'none', pointerEvents: armed ? 'auto' : 'none' }}
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
        {armed && !done && geom?.starts[activeStroke] ? (
          <StartDot
            at={geom.starts[activeStroke]}
            r={Math.max(PEN * 0.62, MIN_DOT_PX / scale)}
            pulse={!touched}
          />
        ) : null}
      </svg>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * The green "start here" dot.
 *
 * It is handed a coordinate MEASURED FROM THE SAME SAMPLING PASS the trace
 * itself uses, rather than reading the live path element during render — so it
 * can never mark a point the tracer does not agree is the start, and the render
 * stays free of ref reads.
 */
function StartDot({
  at,
  r,
  pulse,
}: {
  at: { x: number; y: number };
  /** In glyph units, already floored to a real finger's worth of screen. */
  r: number;
  pulse: boolean;
}) {
  return (
    <circle cx={at.x} cy={at.y} r={r} fill="var(--dpl-slide-accent-2)">
      {pulse ? (
        <animate
          attributeName="r"
          values={`${r * 0.8};${r * 1.45};${r * 0.8}`}
          dur="1.4s"
          repeatCount="indefinite"
        />
      ) : null}
    </circle>
  );
}
