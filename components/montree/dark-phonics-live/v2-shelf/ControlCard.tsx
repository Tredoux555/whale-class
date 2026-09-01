'use client';

/**
 * ControlCard — the Montessori control of error, as a press-and-hold.
 *
 * Every printed work in this series ships a "control of error" sheet: the
 * completed work, for the child to check themselves against. On paper it lives
 * beside them and they glance at it. On glass a permanent second panel would
 * simply be the answer, always on — so it is held, not toggled: press, look,
 * release, carry on. Nothing about the work changes underneath.
 *
 * 🚨 IT MUST NOT DISTURB STATE. The overlay is a second, non-interactive
 * rendering of the same grid; the live work keeps every card exactly where the
 * child left it, and releasing returns them to it mid-thought.
 *
 * The button is deliberately in the bottom corner and deliberately round: it is
 * the only round thing on a sheet of squares, so a four-year-old finds it
 * without being told twice.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

export default function ControlCard({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const show = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }
    setOpen(true);
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="control"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            aria-hidden
            className="pointer-events-none absolute inset-0 z-30 flex flex-col overflow-hidden rounded-[var(--dpl-r-md)]"
            style={{ background: 'var(--dpl-slide-bg)' }}
          >
            <div
              className="flex flex-none items-center gap-[8px] px-[14px] pb-[6px] pt-[10px] text-[11px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--dpl-slide-accent)' }}
            >
              Control of error
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-[14px] pb-[14px]">
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onPointerDown={show}
        onPointerUp={hide}
        onPointerLeave={hide}
        onPointerCancel={hide}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold to see the finished work"
        className="absolute bottom-[10px] right-[10px] z-40 flex h-[64px] w-[64px] touch-none select-none flex-col items-center justify-center rounded-full border-2 text-[10px] font-bold uppercase leading-[1.1] tracking-[0.08em]"
        style={{
          borderColor: 'var(--dpl-slide-accent)',
          background: open ? 'var(--dpl-slide-accent)' : 'var(--dpl-slide-bg)',
          color: open ? 'var(--dpl-slide-on-accent)' : 'var(--dpl-slide-accent)',
          fontFamily: 'var(--dpl-font-display)',
          boxShadow: '0 6px 18px -8px rgba(0,0,0,0.45)',
        }}
      >
        <span aria-hidden className="text-[17px] leading-none">◎</span>
        <span className="mt-[3px]">Control</span>
      </button>
    </>
  );
}
