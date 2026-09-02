'use client';

/**
 * The printed faces of the tracing workbook.
 *
 * Page for page the reader's own book with one page swapped, exactly as the
 * printed workbook is built (see v2-shelf/tracing-book.ts): the same cover art
 * under a TRACE THE STORY badge, the same scene art on the right-hand page, the
 * same back cover — and, in place of the story text, a guide row.
 *
 * The guide row is the school three-line rule with the word set faintly on it
 * and the child's ink laid over the top; that whole surface is TraceSurface, so
 * the shape on glass is the shape on paper.
 */

import type { TracingLeaf } from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';

import TraceSurface from './TraceSurface';

/**
 * How much of the page's width the guide row takes.
 *
 * 🚨 THIS IS A CHILD'S FINGER, NOT A LAYOUT PREFERENCE. The word is drawn as
 * big as the row is wide, so every point given back to the margin comes
 * straight off the x-height. This is of the page's CONTENT box, inside its
 * printed margin — about 85% of the whole page, which is the most it can give
 * while still reading as a workbook page rather than ink running off the paper.
 */
const GUIDE_WIDTH = '92%';

export default function TraceBookFace({
  leaf,
  armed,
  resetKey,
  onComplete,
}: {
  leaf: TracingLeaf;
  /** True only on the page the child is actually on. */
  armed: boolean;
  resetKey: number;
  onComplete: () => void;
}) {
  if (leaf.kind === 'trace-cover') {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-[10px] p-[16px] text-center"
        style={{ background: '#0f0b18', color: '#f7f2e2' }}
      >
        <span
          className="rounded-[var(--dpl-r-pill)] px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.18em]"
          style={{ background: '#8e2f2f', color: '#ffeede' }}
        >
          {leaf.badge}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- static public art, no known intrinsic size */}
        <img
          src={leaf.art}
          alt=""
          className="min-h-0 w-auto max-w-[86%] flex-1 rounded-[8px] bg-white object-contain"
        />
        <h2
          className="text-[clamp(15px,2.2vw,26px)] font-bold leading-tight"
          style={{ fontFamily: 'var(--dpl-font-display)', color: '#e9c86a' }}
        >
          {leaf.title}
        </h2>
      </div>
    );
  }

  if (leaf.kind === 'trace-back') {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-[8px] p-[18px] text-center"
        style={{ background: '#0f0b18', color: '#f7f2e2' }}
      >
        <span
          className="leading-none"
          style={{
            fontFamily: 'var(--dpl-font-display)',
            fontSize: 'clamp(48px,8vw,104px)',
            color: '#e9c86a',
          }}
        >
          {leaf.letter}
        </span>
        <p className="text-[13px] italic" style={{ color: '#b6ad95' }}>
          You wrote the whole of {leaf.title}.
        </p>
      </div>
    );
  }

  if (leaf.kind === 'trace-art') {
    return (
      <div
        className="flex h-full w-full flex-col gap-[8px] p-[14px]"
        style={{ background: 'var(--dpl-slide-bg)', color: 'var(--dpl-slide-ink)' }}
      >
        {/* The folio belongs to the trace page; the picture facing it is the
            same leaf of paper and does not carry a second number. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static public art, no known intrinsic size */}
        <img src={leaf.art} alt="" className="min-h-0 w-full flex-1 object-contain" />
      </div>
    );
  }

  const { page } = leaf;
  return (
    <div
      data-trace-page={page.number}
      className="flex h-full w-full flex-col gap-[6px] p-[14px]"
      style={{ background: 'var(--dpl-slide-bg)', color: 'var(--dpl-slide-ink)' }}
    >
      <p
        className="flex-none text-center text-[clamp(12px,1.4vw,17px)] italic leading-[1.2]"
        style={{ color: 'var(--dpl-slide-ink2)' }}
      >
        {page.lead || page.sentence}
      </p>
      {/* The guide row: as wide as the page can honestly give it, and centred
          in whatever is left under the lead-in. A child's finger needs the
          word big — see GUIDE_WIDTH. */}
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="flex h-full flex-col justify-center"
          style={{ width: GUIDE_WIDTH }}
        >
          {/* Keyed on the reset count: "Start again" builds a clean surface
              rather than asking this one to forget. */}
          <TraceSurface
            key={`${page.word}-${resetKey}`}
            word={page.word}
            armed={armed}
            onComplete={onComplete}
          />
        </div>
      </div>
      <span
        className="flex-none text-center text-[10px]"
        style={{ color: 'var(--dpl-slide-ink3)' }}
      >
        {page.number}
      </span>
    </div>
  );
}
