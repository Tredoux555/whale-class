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
 *
 * 🚨 IT TURNS PAGES TWO WAYS, AND ONLY ONE OF THEM IS A FINGER. The reader lets
 * a child pick up a corner. The tracing workbook must not: a slow drag across a
 * trace page is a child writing, not turning, and StPageFlip would take the word
 * away mid-letter. `interactive={false}` shuts every one of its input paths off
 * and leaves the book turned only by `onApi().flipNext()`.
 */

import HTMLFlipBook from 'react-pageflip';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import {
  SPREAD_MIN_WIDTH,
  type ShelfPage,
} from '@/lib/montree/dark-phonics/v2-shelf/books';
import type { TracingLeaf } from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';

import BookPageFace from './BookPageFace';

/** The page's aspect, height / width. A5-ish, like the printed reader. */
const RATIO = 1.36;

/** Anything this book can be asked to paint on a leaf. */
export type FlipLeaf = ShelfPage | TracingLeaf;

export interface FlipApi {
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
}

export interface FlipBookCoreProps {
  pages: readonly FlipLeaf[];
  /** Fired on every settled turn with the new leading page index. */
  onPage?: (index: number) => void;
  /** Handed the turn controls once the book exists. */
  onApi?: (api: FlipApi | null) => void;
  /**
   * Whether a finger may turn the pages. False for the tracing workbook, which
   * turns itself when a word is finished — see the file header.
   */
  interactive?: boolean;
  /**
   * Force one page (true) or a spread (false). Omitted, the wrapper's own width
   * decides. The tracing workbook sets it because it must also decide which
   * leaves to build, and the two answers have to be the same one.
   */
  portrait?: boolean;
  /**
   * Page aspect, height / width. Defaults to the printed reader's A5-ish 1.36.
   *
   * 🚨 THE TRACING WORKBOOK SETS A SHORTER PAGE, AND IT IS NOT A STYLE CHOICE.
   * On a tablet the book is height-limited: the stage is wider than two A5
   * pages need, so an A5 page leaves the width unspent and the traced word — a
   * word whose size IS the page's width — comes out too small for a four-year
   * old's finger. A shorter page spends that width and buys the word about half
   * its size again. The reader keeps A5: nothing there is sized off the width.
   */
  ratio?: number;
  /** Paint a leaf. Defaults to the reader's own printed face. */
  renderFace?: (page: FlipLeaf, index: number) => ReactNode;
}

/** The reader's own faces — everything the printed book already knows how to set. */
function defaultFace(page: FlipLeaf): ReactNode {
  if (page.kind === 'cover' || page.kind === 'spread' || page.kind === 'back') {
    return <BookPageFace page={page} />;
  }
  return null;
}

export default function FlipBookCore({
  pages,
  onPage,
  onApi,
  interactive = true,
  portrait: portraitProp,
  ratio = RATIO,
  renderFace,
}: FlipBookCoreProps) {
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

  const portrait = portraitProp ?? (!box || box.w < SPREAD_MIN_WIDTH);
  // One page in portrait, two side by side in landscape — and never taller than
  // the space we actually have.
  const availableW = box ? (portrait ? box.w : box.w / 2) : 320;
  const availableH = box ? box.h : 440;
  const pageW = Math.max(180, Math.round(Math.min(availableW, availableH / ratio)));
  const pageH = Math.round(pageW * ratio);

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
          useMouseEvents={interactive}
          swipeDistance={24}
          showPageCorners={interactive}
          disableFlipByClick={!interactive}
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
              {renderFace ? renderFace(page, i) : defaultFace(page)}
            </div>
          ))}
        </HTMLFlipBook>
      ) : null}
    </div>
  );
}
