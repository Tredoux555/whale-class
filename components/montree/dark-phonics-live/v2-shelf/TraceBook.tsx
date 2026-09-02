'use client';

/**
 * TraceBook — the tracing stage, as a book the child writes their way through.
 *
 * The printed tracing workbook is the reader with one page swapped (see
 * v2-shelf/tracing-book.ts), so this is the reader's own flip book with one
 * page swapped: same FlipBookCore, same covers, same facing art, and in place of
 * the story text a guide row the child writes the word on.
 *
 * 🚨 THE BOOK TURNS ITSELF, AND ONLY ITSELF. A finger on a trace page is
 * writing, never turning: `interactive={false}` shuts off every one of
 * StPageFlip's input paths, and the only page turn in this component comes from
 * a word being FINISHED — glow, say the word, half a second to see it, then
 * `flipNext()` and the next page arms. A child cannot get ahead of their own
 * hand, and cannot lose a half-written word to an accidental drag.
 *
 * 🚨 THE FALLBACK TURNS ITSELF TOO. If the flip chunk never arrives the plain
 * pager takes over — and because nothing here is turned by hand, a fallback that
 * only turned by hand would be a book with no way through it. It advances on the
 * same completion, by the same step.
 *
 * PORTRAIT IS A DIFFERENT BOOK, DELIBERATELY. On a phone the facing art pages
 * are not built at all (tracingLeaves({ spread: false })), so a child flips
 * word → word instead of past a picture between every one. The same measurement
 * decides the leaves and the layout — see SPREAD_MIN_WIDTH.
 */

import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { SPREAD_MIN_WIDTH } from '@/lib/montree/dark-phonics/v2-shelf/books';
import {
  tracingLeaves,
  type TracingBook,
} from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';

import TraceBookFace from './TraceBookFace';
import type { FlipApi, FlipLeaf } from './FlipBookCore';

/** How long the flip book has to appear before we stop waiting for it. */
const FLIP_TIMEOUT_MS = 4000;
/** A beat to see the finished word before the page turns. */
const TURN_PAUSE_MS = 500;
/**
 * The workbook's page shape, height / width — nearly square, against the
 * reader's A5 1.36.
 *
 * 🚨 IT IS SET BY THE X-HEIGHT, NOT BY TASTE. On a tablet the book is limited
 * by the stage's HEIGHT, so a tall page throws away width the stage has going
 * spare — and the traced word is sized off the page's width. A5 pages here draw
 * a word about 58px tall on a 1024×768 tablet, which a four-year-old's finger
 * cannot follow; this shape draws it above 90px, the size the old single-word
 * tracing stage had. Every printed thing in this series is A5, so this is the
 * one deliberate departure and it exists for the finger.
 */
const PAGE_RATIO = 1.02;

const FlipBookCore = dynamic(() => import('./FlipBookCore'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-0 flex-1 items-center justify-center text-[12px] text-[var(--dpl-ink3)]">
      Opening the book…
    </div>
  ),
});

export default function TraceBook({
  book,
  onDone,
}: {
  book: TracingBook;
  /** Called once the last word is written and the book has closed. */
  onDone: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [spread, setSpread] = useState(false);
  const [mode, setMode] = useState<'flip' | 'plain'>('flip');
  const [index, setIndex] = useState(0);
  const [resets, setResets] = useState<Record<number, number>>({});
  const apiRef = useRef<FlipApi | null>(null);
  const turnTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      setSpread(w >= SPREAD_MIN_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      if (turnTimer.current !== null) window.clearTimeout(turnTimer.current);
    },
    []
  );

  // If the flip book never announces itself, the plain pager takes over for
  // good — a child must never be stuck on a blank frame.
  useEffect(() => {
    if (mode !== 'flip') return;
    const t = window.setTimeout(() => {
      if (!apiRef.current) setMode('plain');
    }, FLIP_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [mode]);

  const { leaves, traceIndexes, backIndex } = useMemo(
    () => tracingLeaves(book, { spread }),
    [book, spread]
  );

  // A layout change rebuilds the leaves, so the old index would point at the
  // wrong page. Start the child on the page they were on, in the new shape.
  const traceOrdinalRef = useRef(0);
  useEffect(() => {
    setIndex((i) => (i === 0 ? 0 : (traceIndexes[traceOrdinalRef.current] ?? 0)));
  }, [traceIndexes]);

  const onApi = useCallback((api: FlipApi | null) => {
    apiRef.current = api;
  }, []);

  const step = spread ? 2 : 1;
  const done = index >= backIndex;
  const ordinal = traceIndexes.indexOf(index);
  useEffect(() => {
    if (ordinal >= 0) traceOrdinalRef.current = ordinal;
  }, [ordinal]);

  const settle = useCallback(
    (i: number) => {
      setIndex(i);
      if (i >= backIndex) onDone();
    },
    [backIndex, onDone]
  );

  const turnNext = useCallback(() => {
    if (mode === 'flip' && apiRef.current) {
      apiRef.current.flipNext();
      return;
    }
    setIndex((i) => {
      const next = Math.min(backIndex, i + step);
      if (next >= backIndex) onDone();
      return next;
    });
  }, [backIndex, mode, onDone, step]);

  /**
   * One word finished. The glow and the spoken word belong to the surface; this
   * only decides when the page turns — after a beat, so the child sees the word
   * they just wrote whole.
   */
  const handleComplete = useCallback(() => {
    if (turnTimer.current !== null) window.clearTimeout(turnTimer.current);
    turnTimer.current = window.setTimeout(turnNext, TURN_PAUSE_MS);
  }, [turnNext]);

  const startAgain = useCallback(() => {
    setResets((r) => ({ ...r, [index]: (r[index] ?? 0) + 1 }));
  }, [index]);

  const renderFace = useCallback(
    (leaf: FlipLeaf, i: number) => {
      if (
        leaf.kind === 'cover' ||
        leaf.kind === 'spread' ||
        leaf.kind === 'back'
      ) {
        return null;
      }
      return (
        <TraceBookFace
          leaf={leaf}
          armed={i === index}
          resetKey={resets[i] ?? 0}
          onComplete={handleComplete}
        />
      );
    },
    [handleComplete, index, resets]
  );

  const pageCount = traceIndexes.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[8px]">
      <header className="flex flex-none flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
        <h2
          className="text-[14px] font-bold text-[var(--dpl-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          Tracing · {book.title}
        </h2>
        <p className="text-[12px] text-[var(--dpl-ink2)]">
          {done
            ? 'You wrote the whole book.'
            : 'Start on the green dot and follow the word with one finger. The page turns itself.'}
        </p>
      </header>

      <div ref={wrapRef} className="relative flex min-h-0 flex-1 flex-col">
        {mode === 'flip' ? (
          <FlipBookCore
            pages={leaves}
            portrait={!spread}
            ratio={PAGE_RATIO}
            interactive={false}
            onPage={settle}
            onApi={onApi}
            renderFace={renderFace}
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center [perspective:1600px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ rotateY: 62, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: -62, opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full max-w-[520px] overflow-hidden rounded-[6px] [backface-visibility:hidden] [transform-style:preserve-3d]"
                style={{ boxShadow: '0 18px 44px -22px rgba(0,0,0,0.8)' }}
              >
                {renderFace(leaves[index], index)}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* The one thing a finger is allowed to turn: the cover. Every page
            after it is turned by the child finishing its word. */}
        {!done ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[6px] flex justify-center">
            <button
              type="button"
              onClick={ordinal >= 0 ? startAgain : turnNext}
              className="pointer-events-auto min-h-[40px] rounded-[var(--dpl-r-pill)] border px-[18px] text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{
                borderColor: 'var(--dpl-line)',
                color: 'var(--dpl-ink2)',
                background: 'var(--dpl-timer-bg)',
                fontFamily: 'var(--dpl-font-display)',
              }}
            >
              {ordinal >= 0 ? 'Start again' : 'Open the workbook'}
            </button>
          </div>
        ) : null}
      </div>

      <p
        aria-live="polite"
        data-trace-status
        className="flex-none text-center text-[11px] uppercase tracking-[0.14em]"
        style={{ color: done ? 'var(--dpl-live-ink)' : 'var(--dpl-ink3)' }}
      >
        {done
          ? 'All done'
          : ordinal >= 0
            ? `Page ${ordinal + 1} of ${pageCount}`
            : 'Cover'}
      </p>
    </div>
  );
}
