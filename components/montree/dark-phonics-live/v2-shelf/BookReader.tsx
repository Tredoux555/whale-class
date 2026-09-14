'use client';

/**
 * BookReader — the reader, as a book.
 *
 * StPageFlip (react-pageflip) does the turning: real page geometry, a shadow
 * that follows the fold, a corner you can pick up with a finger. It is loaded
 * with `next/dynamic` and `ssr: false` because it measures live DOM on
 * construction.
 *
 * 🚨 THERE IS A FALLBACK, AND IT IS NOT DECORATION. If the chunk never arrives
 * (an offline tablet, a blocked CDN, a failed hydration) a child would be left
 * staring at an empty frame with no way through the book. So the plain pager —
 * a dependency-free CSS 3D card turn — renders immediately, is what `loading`
 * shows, and becomes permanent if the flip book has not announced itself within
 * FLIP_TIMEOUT_MS. Same pages, same faces, same buttons: the lesson always
 * works, the flip is the bonus.
 *
 * 🚨 THE BOOK CAN BE HELD SHUT GOING FORWARD, and the Characters work holds it:
 * a page that walks a character on may not be turned past until that character
 * is in its box (see CharacterStrip and forwardLockedAt() in v2-shelf/works.ts).
 * The reader knows nothing about characters — it is handed `forwardLocked` and
 * reports refusals through `onBlockedForward`. Every forward route asks: the
 * arrow, the cover, the plain pager's own turn, the tap, and StPageFlip's
 * corner drag (stopped inside FlipBookCore). Back is never gated.
 */

import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import type { ShelfBook } from '@/lib/montree/dark-phonics/v2-shelf/books';

import BookPageFace from './BookPageFace';

/** How long the flip book has to appear before we stop waiting for it. */
const FLIP_TIMEOUT_MS = 4000;
/** How long the "put the character in its box" line stays up, in ms. */
const BLOCKED_MS = 1500;

interface FlipApi {
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
}

const FlipBookCore = dynamic(() => import('./FlipBookCore'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-0 flex-1 items-center justify-center text-[12px] text-[var(--dpl-ink3)]">
      Opening the book…
    </div>
  ),
});

export default function BookReader({
  book,
  onDone,
  forwardLocked = false,
  onBlockedForward,
  onPage,
}: {
  book: ShelfBook;
  /** Called when the child turns past the last page. */
  onDone: () => void;
  /** Hold the book shut going forward. Back is always open. */
  forwardLocked?: boolean;
  /** A forward turn was asked for and refused. */
  onBlockedForward?: () => void;
  /** Every settled turn: the leading page, and how many leaves are on screen. */
  onPage?: (index: number, visible: number) => void;
}) {
  const [mode, setMode] = useState<'flip' | 'plain'>('flip');
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [blockedNote, setBlockedNote] = useState(false);
  const apiRef = useRef<FlipApi | null>(null);
  const blockedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (blockedTimer.current !== null) window.clearTimeout(blockedTimer.current);
    },
    []
  );

  /**
   * One refusal, however it arrived — the arrow, a tap, or a corner grab the
   * flip book never got to see. The line under the book is this component's;
   * the nudge on the box and the card belongs to whoever owns them, so the
   * parent is told too.
   */
  const refuse = useCallback(() => {
    setBlockedNote(true);
    if (blockedTimer.current !== null) window.clearTimeout(blockedTimer.current);
    blockedTimer.current = window.setTimeout(() => setBlockedNote(false), BLOCKED_MS);
    onBlockedForward?.();
  }, [onBlockedForward]);

  // If the flip book never announces itself, the plain pager takes over for
  // good — a child must never be stuck on a blank frame.
  useEffect(() => {
    if (mode !== 'flip') return;
    const t = window.setTimeout(() => {
      if (!apiRef.current) setMode('plain');
    }, FLIP_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [mode]);

  const onApi = useCallback((api: FlipApi | null) => {
    apiRef.current = api;
  }, []);

  const last = book.pages.length - 1;

  const turn = useCallback(
    (delta: 1 | -1) => {
      if (delta === 1 && forwardLocked) {
        refuse();
        return;
      }
      setDir(delta);
      if (mode === 'flip' && apiRef.current) {
        if (delta === 1) apiRef.current.flipNext();
        else apiRef.current.flipPrev();
        return;
      }
      setIndex((i) => {
        const next = i + delta;
        if (next < 0) return 0;
        if (next > last) {
          onDone();
          return last;
        }
        const page = book.pages[next];
        playAudio('page', page.kind === 'text' ? page.sentence : 'turn');
        return next;
      });
    },
    [book.pages, last, mode, onDone, forwardLocked, refuse]
  );

  const handlePage = useCallback(
    (i: number, visible = 1) => {
      setIndex(i);
      onPage?.(i, visible);
      if (i >= last) onDone();
    },
    [last, onDone, onPage]
  );

  // The plain pager has no flip book to report its posture, so it says so
  // itself: one page, always.
  useEffect(() => {
    if (mode === 'plain') onPage?.(index, 1);
  }, [mode, index, onPage]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-[8px]">
      <div className="relative flex min-h-0 flex-1 flex-col">
        {mode === 'flip' ? (
          <FlipBookCore
            pages={book.pages}
            onPage={handlePage}
            onApi={onApi}
            forwardLocked={forwardLocked}
            onBlockedForward={refuse}
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center [perspective:1600px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ rotateY: dir === 1 ? 62 : -62, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: dir === 1 ? -62 : 62, opacity: 0 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full max-w-[520px] overflow-hidden rounded-[6px] [backface-visibility:hidden] [transform-style:preserve-3d]"
                style={{ boxShadow: '0 18px 44px -22px rgba(0,0,0,0.8)' }}
              >
                <BookPageFace page={book.pages[index]} />
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* THE COVER OPENS BY BEING TAPPED (2026-09-02). A four-year-old
            picks a book up and opens it; they do not look for a button that
            says so. So the whole cover is the way in — and only the cover, so
            a tap anywhere on an open page still belongs to the page. */}
        {index === 0 ? (
          <button
            type="button"
            data-book-cover
            onClick={() => turn(1)}
            aria-label="Open the book"
            className="absolute inset-0 z-10 cursor-pointer bg-transparent"
          />
        ) : null}

        {/* Edge taps. Kept short and vertically centred so they never sit on the
            corners StPageFlip wants for its own drag. */}
        <button
          type="button"
          onClick={() => turn(-1)}
          aria-label="Previous page"
          className="absolute left-0 top-1/2 z-20 h-[38%] w-[48px] -translate-y-1/2 touch-manipulation rounded-r-[var(--dpl-r-sm)] text-[20px]"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--dpl-ink2)' }}
        >
          ‹
        </button>
        {/* Dimmed, never DISABLED: a disabled button leaves the keyboard and
            stops answering, so a child who presses it is told nothing. This one
            still takes the press and still says why. */}
        <button
          type="button"
          onClick={() => turn(1)}
          aria-label="Next page"
          aria-disabled={forwardLocked || undefined}
          data-forward-locked={forwardLocked ? 'yes' : 'no'}
          className="absolute right-0 top-1/2 z-20 h-[38%] w-[48px] -translate-y-1/2 touch-manipulation rounded-l-[var(--dpl-r-sm)] text-[20px] transition-opacity"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--dpl-ink2)',
            opacity: forwardLocked ? 0.3 : 1,
          }}
        >
          ›
        </button>
      </div>

      <div className="relative flex flex-none items-center justify-center gap-[10px]">
        {/* The one sentence the reader says. Muted, brief, and it never moves
            the counter — a line that reflows the page is a line that startles. */}
        <span
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 text-center text-[11px] tracking-[0.06em] transition-opacity"
          style={{
            color: 'var(--dpl-accent2, var(--dpl-ink2))',
            opacity: blockedNote ? 1 : 0,
          }}
        >
          {blockedNote ? 'Put the character in its box first' : ''}
        </span>
        <span
          data-book-page={index}
          className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)] transition-opacity"
          style={{ opacity: blockedNote ? 0 : 1 }}
        >
          {index === 0
            ? 'Cover'
            : index >= last
              ? 'The end'
              : `Page ${index + 1} of ${last + 1}`}
        </span>
      </div>
    </div>
  );
}
