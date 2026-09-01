'use client';

/**
 * FlipBookCore — StPageFlip, wrapped.
 *
 * Kept in its own file so BookReader can pull it in with next/dynamic and
 * `ssr: false`: StPageFlip measures real DOM on construction and cannot be
 * rendered on the server at all.
 *
 * 🚨 SIZE IS MEASURED HERE, NOT DELEGATED. StPageFlip's `size: 'stretch'` reads
 * its parent at construction time and does not reflow cleanly afterwards, which
 * on a tablet means a rotate leaves the book the old shape. So the wrapper is
 * measured with a ResizeObserver, the page size is computed to a fixed 3:4, and
 * the book is REMOUNTED (via `key`) whenever that size changes by more than a
 * few pixels. A remount costs one render and buys a book that is always the
 * right shape; a stale book is a bug a child cannot work around.
 *
 * 🚨 THE INSTANCE COMES FROM onInit, NOT FROM THE REF. Under next/dynamic the
 * forwarded ref is unreliable (the loaded module is a memo wrapper), so the
 * page-turn buttons drive the object handed to `onInit`.
 */

import HTMLFlipBook from 'react-pageflip';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import type { ShelfPage } from '@/lib/montree/dark-phonics/v2-shelf/books';

import BookPageFace from './BookPageFace';

/** The page's aspect, height / width. A5-ish, like the printed reader. */
const RATIO = 1.36;
/** Below this wrapper width a spread will not fit — show one page at a time. */
const PORTRAIT_BELOW = 720;

interface FlipApi {
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
}

export interface FlipBookCoreProps {
  pages: ShelfPage[];
  /** Fired on every settled turn with the new leading page index. */
  onPage?: (index: number) => void;
  /** Handed the turn controls once the book exists. */
  onApi?: (api: FlipApi | null) => void;
}

export default function FlipBookCore({ pages, onPage, onApi }: FlipBookCoreProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setBox((prev) => {
        const w = Math.round(r.width);
        const h = Math.round(r.height);
        // Ignore sub-8px noise: every change here costs a remount.
        if (prev && Math.abs(prev.w - w) < 8 && Math.abs(prev.h - h) < 8) return prev;
        return { w, h };
      });
    };
    // ResizeObserver fires once on observe(), so this is also the first measure.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleInit = useCallback(
    (e: { object?: FlipApi }) => {
      if (e?.object && onApi) onApi(e.object);
    },
    [onApi]
  );

  const handleFlip = useCallback(
    (e: { data?: number }) => {
      const index = typeof e?.data === 'number' ? e.data : 0;
      const page = pages[index];
      playAudio('page', page && page.kind === 'spread' ? page.sentence : 'turn');
      onPage?.(index);
    },
    [onPage, pages]
  );

  useEffect(() => () => onApi?.(null), [onApi]);

  const portrait = !box || box.w < PORTRAIT_BELOW;
  // One page in portrait, two side by side in landscape — and never taller than
  // the space we actually have.
  const availableW = box ? (portrait ? box.w : box.w / 2) : 320;
  const availableH = box ? box.h : 440;
  const pageW = Math.max(180, Math.round(Math.min(availableW, availableH / RATIO)));
  const pageH = Math.round(pageW * RATIO);

  return (
    <div ref={wrapRef} className="flex min-h-0 flex-1 items-center justify-center">
      {box ? (
        <HTMLFlipBook
          key={`${pageW}x${pageH}-${portrait ? 'p' : 'l'}-${pages.length}`}
          className="dpv2-flipbook"
          style={{}}
          width={pageW}
          height={pageH}
          size="fixed"
          minWidth={180}
          maxWidth={900}
          minHeight={240}
          maxHeight={1300}
          startPage={0}
          drawShadow
          flippingTime={700}
          usePortrait={portrait}
          startZIndex={0}
          autoSize={false}
          maxShadowOpacity={0.4}
          showCover
          mobileScrollSupport={false}
          clickEventForward={false}
          useMouseEvents
          swipeDistance={24}
          showPageCorners
          disableFlipByClick={false}
          onInit={handleInit}
          onFlip={handleFlip}
        >
          {pages.map((page, i) => (
            // data-density is cosmetic: `showCover` already makes StPageFlip
            // treat the first and last leaves as stiff covers. Stated here so
            // nobody reads it as the thing doing that work.
            <div
              key={i}
              className="dpv2-page"
              data-density={i === 0 || i === pages.length - 1 ? 'hard' : 'soft'}
            >
              <BookPageFace page={page} />
            </div>
          ))}
        </HTMLFlipBook>
      ) : null}
    </div>
  );
}
