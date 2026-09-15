'use client';

/**
 * WorkDone — the one way the shelf says "that's finished", for every work.
 *
 * Until 2026-09-15 each stage said it differently: the picture/sentence/builder
 * works flashed a green inset glow (MatchWork), the tracing surface had its own
 * hand-rolled copy of the same glow on a CSS transition, and the Characters
 * strip said nothing at all — a child could box the last character and get no
 * answer from the material. And none of the five offered a way ONWARDS: the
 * numbered pips in the top bar were the only navigation, which is a small round
 * target for a four-year-old who has just finished something.
 *
 * So there is one treatment now, and it is the one the owner already liked —
 * the tracing flash — used everywhere:
 *
 *   1. <CompletionGlow/>  the green breath, inside the work's own surface.
 *   2. <NextWork/>        a big green pill on the RIGHT of the work area.
 *
 * 🚨 THE GLOW BELONGS TO THE WORK, THE BUTTON BELONGS TO THE SHELF. The glow is
 * rendered by whichever component owns the cream sheet (it is an INSET shadow —
 * it has to be drawn by the thing it is inside). The button is rendered ONCE by
 * ShelfPlayer over the stage, because only ShelfPlayer knows what "next" is and
 * a per-work copy would be five chances for the five works to drift apart.
 *
 * 🚨 THE PILL IS ON THE RIGHT EDGE, VERTICALLY CENTRED, NOT BOTTOM-RIGHT. The
 * bottom-right corner of every work stage is already taken by ControlCard's
 * round "Control" button, and the tracing stage's "Start again" sits bottom
 * centre. Mid-right is the one edge that is free in all five stages.
 */

import { motion } from 'framer-motion';

/**
 * The green breath. One shot: in, hold, out — then it is gone, and nothing on
 * the sheet has moved.
 *
 * Mount it (or remount it with a fresh `key`) to play it; it animates to
 * opacity 0 and stays there, so a parent that leaves it mounted draws nothing.
 * `pointer-events-none` throughout: a child's finger must still reach the cards
 * underneath while it plays.
 */
export const COMPLETION_GLOW_MS = 1400;

export function CompletionGlow({
  radius = 'var(--dpl-r-md)',
  colour = 'var(--dpl-slide-accent-2)',
  z = 20,
}: {
  /** Match the surface's own corner radius, or the glow squares it off. */
  radius?: string;
  colour?: string;
  z?: number;
}) {
  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{ duration: COMPLETION_GLOW_MS / 1000, times: [0, 0.25, 1] }}
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: z,
        borderRadius: radius,
        boxShadow: `inset 0 0 60px -6px ${colour}`,
      }}
    />
  );
}

/**
 * The way on.
 *
 * It PERSISTS once it appears — it is not a toast. A child who finishes a work
 * and then goes back to look at it must still find the way out of it, and a
 * button that had timed out would send them back to the pips.
 *
 * On the last stage of the shelf there is nowhere further along, so the caller
 * passes `last` and the pill becomes "Done", which leaves the shelf entirely
 * (the same place the back chevron goes). A pill that looked like a button and
 * did nothing would be worse than no pill.
 */
export function NextWork({
  onNext,
  last = false,
}: {
  onNext: () => void;
  last?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-50 flex items-center pr-[10px]">
      <motion.button
        type="button"
        onClick={onNext}
        initial={{ opacity: 0, scale: 0.72, x: 18 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: 12, transition: { duration: 0.16 } }}
        transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.7 }}
        data-work-next={last ? 'done' : 'next'}
        aria-label={last ? 'Done — back to the lessons' : 'Next work'}
        className="pointer-events-auto flex h-[64px] min-w-[64px] touch-manipulation items-center gap-[8px] rounded-[var(--dpl-r-pill)] px-[22px] text-[15px] font-bold uppercase tracking-[0.1em]"
        style={{
          background: 'var(--dpl-next-bg)',
          color: 'var(--dpl-next-ink)',
          fontFamily: 'var(--dpl-font-display)',
          boxShadow:
            '0 14px 34px -14px rgba(0,0,0,0.75), 0 0 0 3px rgba(255,255,255,0.14)',
        }}
      >
        <span>{last ? 'Done' : 'Next'}</span>
        <svg
          viewBox="0 0 16 16"
          className="h-[16px] w-[16px] flex-none"
          aria-hidden
          focusable="false"
        >
          {last ? (
            <path
              d="M3 8.6 6.4 12 13 4.6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M6 2.5 11.5 8 6 13.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </motion.button>
    </div>
  );
}
