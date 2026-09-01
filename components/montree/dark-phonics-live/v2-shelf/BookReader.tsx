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
 */

import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import type { ShelfBook } from '@/lib/montree/dark-phonics/v2-shelf/books';

import BookPageFace from './BookPageFace';

/** How long the flip book has to appear before we stop waiting for it. */
const FLIP_TIMEOUT_MS = 4000;

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
}: {
  book: ShelfBook;
  /** Called when the child turns past the last page. */
  onDone: () => void;
}) {
  const [mode, setMode] = useState<'flip' | 'plain'>('flip');
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const apiRef = useRef<FlipApi | null>(null);

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
        playAudio('page', page.kind === 'spread' ? page.sentence : 'turn');
        return next;
      });
    },
    [book.pages, last, mode, onDone]
  );

  const handlePage = useCallback(
    (i: number) => {
      setIndex(i);
      if (i >= last) onDone();
    },
    [last, onDone]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-[8px]">
      <div className="relative flex min-h-0 flex-1 flex-col">
        {mode === 'flip' ? (
          <FlipBookCore pages={book.pages} onPage={handlePage} onApi={onApi} />
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

        {/* Edge taps. Kept short and vertically centred so they never sit on the
            corners StPageFlip wants for its own drag. */}
        <button
          type="button"
          onClick={() => turn(-1)}
          aria-label="Previous page"
          className="absolute left-0 top-1/2 h-[38%] w-[48px] -translate-y-1/2 touch-manipulation rounded-r-[var(--dpl-r-sm)] text-[20px]"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--dpl-ink2)' }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => turn(1)}
          aria-label="Next page"
          className="absolute right-0 top-1/2 h-[38%] w-[48px] -translate-y-1/2 touch-manipulation rounded-l-[var(--dpl-r-sm)] text-[20px]"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--dpl-ink2)' }}
        >
          ›
        </button>
      </div>

      <div className="flex flex-none items-center justify-center gap-[10px]">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
          {index === 0
            ? 'Cover'
            : index >= last
              ? 'The end'
              : `Page ${index} of ${last - 1}`}
        </span>
      </div>
    </div>
  );
}
