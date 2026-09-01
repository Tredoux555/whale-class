'use client';

/**
 * LetterCard — the first thing off the shelf.
 *
 * Two faces, as on the printed card: the book's cover, then the letter of the
 * week set as big as the screen allows with the lesson's catchphrase under it.
 * Tap either side of the card (or swipe) to turn it over. Nothing is scored and
 * nothing is required — a child may sit on face two as long as they like.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';

const SWIPE_PX = 40;

export default function LetterCard({
  bookTitle,
  coverImage,
  letter,
  catchphrase,
  onDone,
}: {
  bookTitle: string;
  coverImage: string;
  letter: string;
  catchphrase?: string;
  /** Called when the child leaves the second face. */
  onDone: () => void;
}) {
  const [face, setFace] = useState<0 | 1>(0);
  const downX = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => {
      setFace((f) => {
        const next = f + dir;
        if (next < 0) return 0;
        if (next > 1) {
          onDone();
          return 1;
        }
        if (next === 1) playAudio('letter', letter);
        return next as 0 | 1;
      });
    },
    [letter, onDone]
  );

  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Capture, like every other surface on the shelf: a swipe that wanders off
    // the card mid-gesture must still deliver its pointerup here, or the card
    // is left holding a start position that nothing ever clears.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }
    downX.current = e.clientX;
  };

  /** A cancelled gesture (a system swipe, a lifted palm) turns no page. */
  const cancel = (e: ReactPointerEvent<HTMLDivElement>) => {
    downX.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const up = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = downX.current;
    downX.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (start === null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) > SWIPE_PX) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    // A plain tap: the left third goes back, everything else goes on.
    const box = e.currentTarget.getBoundingClientRect();
    go(e.clientX - box.left < box.width / 3 ? -1 : 1);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[10px]">
      <div
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={cancel}
        className="relative flex min-h-0 flex-1 touch-pan-y select-none items-center justify-center overflow-hidden rounded-[var(--dpl-r-md)] border"
        style={{
          background: 'var(--dpl-slide-bg)',
          borderColor: 'var(--dpl-slide-edge)',
          color: 'var(--dpl-slide-ink)',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {face === 0 ? (
            <motion.div
              key="cover"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full w-full flex-col items-center justify-center gap-[10px] p-[18px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static public art, no known intrinsic size */}
              <img
                src={coverImage}
                alt=""
                className="min-h-0 w-auto max-w-full flex-1 object-contain"
              />
              <h2
                className="text-center text-[clamp(20px,4.4vw,34px)] font-bold leading-tight"
                style={{ fontFamily: 'var(--dpl-font-display)' }}
              >
                {bookTitle}
              </h2>
            </motion.div>
          ) : (
            <motion.div
              key="letter"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-full w-full flex-col items-center justify-center gap-[6px] p-[18px]"
            >
              <span
                className="block leading-[0.8]"
                style={{
                  fontFamily: 'var(--dpl-font-display)',
                  fontSize: 'clamp(96px, 34vh, 300px)',
                  fontWeight: 700,
                  color: 'var(--dpl-slide-accent)',
                }}
              >
                {letter}
              </span>
              {catchphrase ? (
                <p
                  className="mt-[10px] max-w-[24ch] text-center text-[clamp(16px,3vw,26px)] italic"
                  style={{ color: 'var(--dpl-slide-ink2)' }}
                >
                  {catchphrase}
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        <span
          className="pointer-events-none absolute bottom-[10px] left-1/2 -translate-x-1/2 text-[11px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--dpl-slide-ink3)' }}
        >
          {face === 0 ? 'tap to turn the card' : 'tap to go to the book'}
        </span>
      </div>
    </div>
  );
}
