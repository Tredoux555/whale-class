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
 *
 * 🚨 THE TAP THAT TURNS THE PAGE IS OURS, NOT StPageFlip's (2026-09-14). Its
 * flip-by-click fires off a MOUSE click, so on a desktop a page turned when you
 * clicked it and on a tablet it did not — the touch path ends in its swipe
 * branch, and a tap is not a swipe, so nothing happened and only the arrows
 * worked. `disableFlipByClick` is therefore now ALWAYS on and the tap is
 * recognised here from POINTER events, which a mouse, a finger and a stylus all
 * speak: down and up within 10px and 400ms, over the book itself, not on a
 * button — right half forward, left half back. Corner drags are untouched
 * (that is still StPageFlip's `useMouseEvents`), and a drag can never be
 * mistaken for a tap because it fails the 10px test.
 *
 * 🚨 AND IT CAN BE HELD SHUT ONE WAY (2026-09-14). `forwardLocked` stops every
 * route FORWARD — the tap above, and StPageFlip's own corner drag and swipe —
 * while leaving every route BACK open, because the Characters work gates the
 * book on placing the character the page has just introduced. The library
 * offers no per-turn veto (`onFlip` fires after the fact and `onChangeState`
 * cannot cancel), and its `useMouseEvents` is read once when it attaches its
 * handlers, so it cannot be toggled on a live book. What it DOES do is attach
 * `mousedown` and `touchstart` to its own element: a capture-phase listener on
 * the wrapper above it therefore runs first and can stop a forward grab from
 * ever reaching it — see the effect below. A grab on the back half is let
 * through untouched, so a child can still pull the page they just read back.
 */

import HTMLFlipBook from 'react-pageflip';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { playAudio } from '@/lib/montree/dark-phonics/v2-shelf/audio';
import {
  isShelfPage,
  SPREAD_MIN_WIDTH,
  type ShelfPage,
} from '@/lib/montree/dark-phonics/v2-shelf/books';
import type { TracingLeaf } from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';

import BookPageFace from './BookPageFace';

/** The page's aspect, height / width. A5-ish, like the printed reader. */
const RATIO = 1.36;

/** A tap is a pointer that came down and went up in the same place, quickly. */
const TAP_SLOP_PX = 10;
const TAP_MS = 400;
/** Anything here handles its own press; a tap on it is never a page turn. */
const NOT_A_PAGE_TAP = 'button, a, input, select, textarea, [role="button"], [data-no-tap-turn]';

/** Anything this book can be asked to paint on a leaf. */
export type FlipLeaf = ShelfPage | TracingLeaf;

export interface FlipApi {
  flipNext: () => void;
  flipPrev: () => void;
  getCurrentPageIndex: () => number;
}

export interface FlipBookCoreProps {
  pages: readonly FlipLeaf[];
  /**
   * Fired on every settled turn with the new leading page index, and how many
   * leaves are on screen (1 in portrait, 2 in a spread) — a caller gating on
   * what the child can SEE needs both.
   */
  onPage?: (index: number, visible: number) => void;
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
  /**
   * Hold the book shut in the FORWARD direction only. Back is always open.
   * See the file header for how the library's own drag is stopped.
   */
  forwardLocked?: boolean;
  /** A forward turn was attempted and refused — the caller says so on screen. */
  onBlockedForward?: () => void;
}

/** The reader's own faces — everything the printed book already knows how to set. */
function defaultFace(page: FlipLeaf): ReactNode {
  return isShelfPage(page) ? <BookPageFace page={page} /> : null;
}

export default function FlipBookCore({
  pages,
  onPage,
  onApi,
  interactive = true,
  portrait: portraitProp,
  ratio = RATIO,
  renderFace,
  forwardLocked = false,
  onBlockedForward,
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

  /**
   * Tap to turn — see the file header. Held in a ref rather than state because
   * nothing on screen depends on where the finger went down.
   */
  const tapRef = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const apiRef = useRef<FlipApi | null>(null);
  /** How many leaves are on screen, for onPage — read inside a stable callback. */
  const visibleRef = useRef(1);
  /**
   * The lock and the book's rectangle, read by a NATIVE listener that must not
   * be torn down and rebuilt on every render (removing a capture listener the
   * library has already run past is how a drag slips through).
   */
  const lockRef = useRef({ locked: false, w: 0, h: 0 });

  const handleInit = useCallback(
    (e: { object?: FlipApi }) => {
      if (!e?.object) return;
      apiRef.current = e.object;
      onApi?.(e.object);
    },
    [onApi]
  );

  const handleFlip = useCallback(
    (e: { data?: number }) => {
      const index = typeof e?.data === 'number' ? e.data : 0;
      const page = pages[index];
      playAudio('page', page && page.kind === 'text' ? page.sentence : 'turn');
      onPage?.(index, visibleRef.current);
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
  /** The book's own rectangle inside the wrapper — the only tappable area. */
  const bookW = portrait ? pageW : pageW * 2;
  const bookH = pageH;

  const onPointerDownCapture = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.(NOT_A_PAGE_TAP)) {
        tapRef.current = null;
        return;
      }
      tapRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
    },
    [interactive]
  );

  const onPointerUpCapture = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const down = tapRef.current;
      tapRef.current = null;
      if (!interactive || !down || down.id !== e.pointerId) return;
      if (Date.now() - down.t > TAP_MS) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > TAP_SLOP_PX) return;
      const api = apiRef.current;
      if (!api) return;
      // Only over the book itself, which is centred in this wrapper.
      const r = e.currentTarget.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (Math.abs(e.clientY - cy) > bookH / 2) return;
      if (Math.abs(e.clientX - cx) > bookW / 2) return;
      if (e.clientX >= cx) {
        if (forwardLocked) {
          onBlockedForward?.();
          return;
        }
        api.flipNext();
      } else api.flipPrev();
    },
    [interactive, bookH, bookW, forwardLocked, onBlockedForward]
  );

  /**
   * Stop a FORWARD corner grab before StPageFlip's own handler sees it.
   *
   * Native, capture phase, on the wrapper: capture runs root → target, so this
   * fires before the `mousedown`/`touchstart` the library put on its own
   * element, and stopping propagation there means no drag ever begins. Only a
   * grab on the forward half is stopped; the back half is untouched. The
   * listener is installed ONCE and reads the live lock out of a ref — a
   * listener re-attached mid-gesture is a listener that misses it.
   *
   * 🚨 IT STOPS THE DRAG AND SAYS NOTHING (2026-09-17). It used to ring the
   * nudge itself, and the nudge is ALSO rung by the tap-up handler that owns
   * the refused turn — so one tap on a locked book produced two nudges on a
   * mouse and, on iOS, three: touchstart fires the guard, the tap fires
   * onPointerUpCapture, and the delayed synthetic mousedown fires the guard
   * again. A refused turn is one answer, so the guard now has exactly one job —
   * `stopPropagation()`, so StPageFlip never starts a drag — and the single
   * tap-up handler owns the nudge.
   */
  // Kept current in an effect rather than during render: the listener below
  // is installed once and reads these, and a ref written in the render body is
  // a ref written twice under StrictMode.
  useEffect(() => {
    lockRef.current = {
      locked: interactive && forwardLocked,
      w: bookW,
      h: bookH,
    };
    visibleRef.current = portrait ? 1 : 2;
  }, [interactive, forwardLocked, bookW, bookH, portrait]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const guard = (e: MouseEvent | TouchEvent) => {
      const { locked, w, h } = lockRef.current;
      if (!locked) return;
      const point = 'touches' in e ? e.touches[0] : e;
      if (!point) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (Math.abs(point.clientY - cy) > h / 2) return;
      if (point.clientX < cx || point.clientX > cx + w / 2) return;
      // Only this: the nudge belongs to the tap-up handler. See above.
      e.stopPropagation();
    };
    el.addEventListener('mousedown', guard, true);
    el.addEventListener('touchstart', guard, true);
    return () => {
      el.removeEventListener('mousedown', guard, true);
      el.removeEventListener('touchstart', guard, true);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="flex min-h-0 flex-1 items-center justify-center"
      data-tap-turn={interactive ? 'yes' : 'no'}
      onPointerDownCapture={onPointerDownCapture}
      onPointerUpCapture={onPointerUpCapture}
    >
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
          disableFlipByClick
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
              // Kills the 300ms tap delay a mobile browser otherwise waits out
              // before it decides a tap was not a double-tap zoom.
              style={{ touchAction: 'manipulation' }}
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
