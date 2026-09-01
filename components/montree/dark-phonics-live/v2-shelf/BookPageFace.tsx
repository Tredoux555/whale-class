'use client';

/**
 * One printed face of the reader — cover, story spread, or back cover.
 *
 * Shared by the flip book and the no-JavaScript fallback pager, so a page looks
 * identical whichever is driving it.
 *
 * The story line is set the way the PAPER sets it: a small italic lead-in and
 * the literal last word big and bold ("Snake in my" · "sock!"). That split is
 * `splitBookLine()`'s rule, already applied in books.ts — this component only
 * paints it.
 */

import type { ShelfPage } from '@/lib/montree/dark-phonics/v2-shelf/books';

export default function BookPageFace({ page }: { page: ShelfPage }) {
  if (page.kind === 'cover') {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-[10px] p-[16px] text-center"
        style={{ background: '#0f0b18', color: '#f7f2e2' }}
      >
        <span
          className="text-[11px] uppercase tracking-[0.22em]"
          style={{ color: '#c8a24a' }}
        >
          Dark Phonics · {page.letter}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- static public art, no known intrinsic size */}
        <img
          src={page.art}
          alt=""
          className="min-h-0 w-auto max-w-[86%] flex-1 rounded-[8px] bg-white object-contain"
        />
        <h2
          className="text-[clamp(17px,2.4vw,28px)] font-bold leading-tight"
          style={{ fontFamily: 'var(--dpl-font-display)', color: '#e9c86a' }}
        >
          {page.title}
        </h2>
      </div>
    );
  }

  if (page.kind === 'back') {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-[8px] p-[18px] text-center"
        style={{ background: '#0f0b18', color: '#f7f2e2' }}
      >
        <span
          className="leading-none"
          style={{
            fontFamily: 'var(--dpl-font-display)',
            fontSize: 'clamp(56px,9vw,120px)',
            color: '#e9c86a',
          }}
        >
          {page.letter}
        </span>
        <p className="text-[13px] italic" style={{ color: '#b6ad95' }}>
          The end of {page.title}.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col gap-[8px] p-[14px]"
      style={{ background: 'var(--dpl-slide-bg)', color: 'var(--dpl-slide-ink)' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public art, no known intrinsic size */}
      <img
        src={page.art}
        alt=""
        className="min-h-0 w-full flex-1 object-contain"
      />
      <p className="text-center leading-[1.15]">
        {page.lead ? (
          <span
            className="block text-[clamp(13px,1.5vw,19px)] italic"
            style={{ color: 'var(--dpl-slide-ink2)' }}
          >
            {page.lead}
          </span>
        ) : null}
        <span
          className="block text-[clamp(24px,3.4vw,44px)] font-bold"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          {page.shout}
        </span>
      </p>
      <span
        className="flex-none text-center text-[10px]"
        style={{ color: 'var(--dpl-slide-ink3)' }}
      >
        {page.number}
      </span>
    </div>
  );
}
