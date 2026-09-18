'use client';

/**
 * ShelfPlayer — one lesson's whole shelf, in order.
 *
 * Book (with the Characters strip beside it) · Picture match · Sentence &
 * picture · Build it · Tracing. The order is the order the materials sit on a
 * real shelf, left to right, easiest first — and, like a real shelf, nothing is
 * locked: the strip along the top jumps anywhere, done or not.
 *
 * 🚨 IT OPENS ON THE BOOK. The letter card used to stand first and the guided
 * builder fourth; both were taken off the digital shelf on 2026-09-14 and the
 * reasons are recorded in ./stages.ts, which is the one place the shelf's order
 * lives. LetterCard.tsx is still on disk and is no longer mounted from here.
 *
 * NOTHING IS SCORED. Every bit of state here is React state in this tab: no
 * percentage, no star, no pass mark. `visited` exists so the strip can show
 * where a child has BEEN, not how well they did.
 *
 * ONE THING IS NOW SAVED, AND ONLY ONE (rule 11 of the Tracking Constitution):
 * finishing a tracked work emits a 'done' signal — child + work key, status
 * 'practicing', source 'digital' — through the one door. It happens ONLY when
 * this player was given a `childId` AND a `letter`; without both, emitDone()
 * writes nothing and this component behaves exactly as it did before (which is
 * every caller today — ParentLedLessons opens the shelf from the family portal,
 * where no child is identified). Nothing is guessed to fill that gap.
 *
 * The tracing workbook deliberately emits NOTHING: it is not one of the five
 * tracked works, so it has no key, and rule 1 says no key, no write.
 *
 * 🚨 EVERY STAGE NOW ENDS THE SAME WAY (2026-09-15). A finished work flashes
 * the green breath inside its own sheet — the flash the tracing surface always
 * had, now shared from ./WorkDone.tsx — and ONE green "Next" pill appears on
 * the right of the stage. The pill is drawn here, not inside the works: only
 * this file knows what "next" is, and five copies would be five chances to
 * drift. `finished[]` is the state behind it and is in-tab only; it is NOT
 * progress and is never written anywhere (see its own note below).
 *
 * 🚨 AND THE SHELF LOCKS THE PAGE WHILE IT IS OPEN. It is a full-screen
 * surface, not a document — the effect that does it, and the iPad bug that
 * forced it, are written out at the effect itself. Do not take it out without
 * reading that.
 *
 * SILENT for now — see v2-shelf/audio.ts.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { BookWorksLesson } from '@/lib/montree/dark-phonics/book-works';
import { emitDone, shelfWorkKey, type ShelfStageKey } from '@/lib/montree/tracking/done-signal';
import { buildShelfBook } from '@/lib/montree/dark-phonics/v2-shelf/books';
import { tracingBookFrom } from '@/lib/montree/dark-phonics/v2-shelf/tracing-book';
import {
  buildCharactersWork,
  buildWorks,
  characterIntroductions,
  charactersForBook,
} from '@/lib/montree/dark-phonics/v2-shelf/works';

import BookReader from './BookReader';
import CharacterStrip from './CharacterStrip';
import MatchWork from './MatchWork';
import ShelfStrip from './ShelfStrip';
import TraceBook from './TraceBook';
import { NextWork } from './WorkDone';
import { SHELF_STAGES } from './stages';

export default function ShelfPlayer({
  lesson,
  onClose,
  childId,
  letter,
  onStageDone,
  onLessonDone,
}: {
  lesson: BookWorksLesson;
  onClose: () => void;
  /**
   * Told each time a stage first says "finished". Optional and fire-and-forget:
   * the Dark Phonics hub counts stages with it, /parents passes nothing and the
   * shelf behaves exactly as it always has.
   */
  onStageDone?: (stageKey: string, index: number) => void;
  /**
   * Told when the LAST stage's pill (the one that reads "Done") is pressed,
   * just before onClose. The hub raises its share card on this; without it the
   * pill only ever closes the shelf, which is the /parents behaviour.
   */
  onLessonDone?: () => void;
  /**
   * The child working the shelf, when the caller knows who that is. Undefined
   * on every parent-portal / preview surface — and undefined means NOTHING is
   * written, not "write it against somebody".
   */
  childId?: string | null;
  /**
   * The Dark Phonics letter this shelf belongs to (`s`, `ck`, `qu`…), used to
   * build `dp:<letter>:<n>`. Falls back to the lesson's own letter, which is
   * the same value for every letter book on the shelf today; passed explicitly
   * so a caller teaching a second book for a letter can be exact.
   */
  letter?: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [visited, setVisited] = useState<boolean[]>(() =>
    SHELF_STAGES.map((_, i) => i === 0)
  );
  /**
   * Which stages have been finished, this sitting. Drives the one green "Next"
   * pill — see ./WorkDone.tsx.
   *
   * 🚨 IT IS A LATCH, AND IT IS NOT PROGRESS. Nothing here is scored, saved or
   * sent anywhere; it is the same kind of in-tab memory `visited` already is,
   * and it dies with the tab. It latches because lifting a card out of a
   * finished board drops the work's own phase back to 'play' — the child is
   * playing with what they made, which must not snatch the way out from under
   * them (the owner's word: the button "persists until tapped").
   */
  const [finished, setFinished] = useState<boolean[]>(() =>
    SHELF_STAGES.map(() => false)
  );

  const book = useMemo(() => buildShelfBook(lesson), [lesson]);
  const works = useMemo(() => buildWorks(lesson), [lesson]);
  // The preliminary Characters work stands BESIDE the book, not after it — the
  // child places a character as each page is read. See CharacterStrip.tsx.
  const characters = useMemo(() => buildCharactersWork(lesson), [lesson]);
  /**
   * Which page of the reader walks each character on. The strip gates the book
   * on it — see CharacterStrip. Derived from the very pages the reader paints
   * and the very cast the strip cuts out, so the two can never disagree.
   */
  const introductions = useMemo(
    () => characterIntroductions(book.pages, charactersForBook(lesson)),
    [book.pages, lesson]
  );
  // The tracing workbook is the reader with one page swapped, so it is derived
  // from the very book the child has just read — never rebuilt from the lesson.
  const workbook = useMemo(() => tracingBookFrom(book), [book]);

  const go = useCallback((i: number) => {
    const next = Math.max(0, Math.min(SHELF_STAGES.length - 1, i));
    setIndex(next);
    setVisited((v) => (v[next] ? v : v.map((seen, k) => seen || k === next)));
  }, []);

  /** One stage finished. Idempotent — a work may say so more than once. */
  const markFinished = useCallback((i: number) => {
    setFinished((f) => (f[i] ? f : f.map((done, k) => done || k === i)));
  }, []);

  /**
   * Report one finished work. Fire-and-forget, and a no-op unless BOTH the
   * child and the key are known — the guard lives in emitDone() so no call site
   * can forget it. A failure never reaches the child's screen.
   */
  const trackedLetter = letter ?? lesson.letter ?? null;
  const reportDone = useCallback(
    (stage: ShelfStageKey) => {
      void emitDone({
        childId,
        workKey: shelfWorkKey(trackedLetter, stage),
        source: 'digital',
      });
    },
    [childId, trackedLetter]
  );

  const stage = SHELF_STAGES[index];

  /**
   * 🚨 THE SHELF IS A SURFACE, NOT A PAGE — AND THIS IS WHY THE PIPS WERE
   * BEING CUT IN HALF ON AN iPAD (owner's report, 2026-09-15).
   *
   * app/globals.css has, and has always had, `body { min-height: 100vh }`. On
   * iOS Safari `vh` is the LARGE viewport — the one you get with the toolbar
   * retracted — while this player is sized in `dvh`, the viewport actually on
   * screen right now. With the toolbar showing, `100vh` is a toolbar-height
   * TALLER than `100dvh`, so the document overflowed the screen by exactly that
   * much and the page could scroll even though the shelf itself fitted.
   *
   * Nothing on the shelf asks to be scrolled, so nobody scrolled it on
   * purpose — but the works are dragged, and a finger that lands on the tray,
   * the sheet or a gap instead of on a card is a page drag. The page slid up by
   * the toolbar's height, and on an iPad the toolbar is at the TOP: the header
   * went under it and the numbered pips lost their top halves. It only happened
   * "once a work starts" because the book and the picker are the two stages
   * with nothing to drag.
   *
   * So: while the shelf is open, the document is not a scrolling page. The
   * `min-height` is taken off body (the overflow's actual source) and overflow
   * is pinned on both elements — belt and braces, since Safari has historically
   * honoured one and not the other. Every value is restored on unmount, so the
   * lesson PICKER and every other page in the app are untouched: this is the
   * full-screen surface's lock, not a global rule.
   */
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const before = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyMinHeight: body.style.minHeight,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.minHeight = '0';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = before.htmlOverflow;
      body.style.overflow = before.bodyOverflow;
      body.style.minHeight = before.bodyMinHeight;
      body.style.overscrollBehavior = before.bodyOverscroll;
    };
  }, []);

  /**
   * The arrows move along the shelf. They exist because the prev/next buttons
   * that used to sit under the work do not any more — the pips are the whole
   * navigation now, and a grown-up on a keyboard needs a way through that is
   * not a small round target. Ignored while a text field has the focus.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return;
      if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'ArrowRight') go(index + 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  const isLast = index === SHELF_STAGES.length - 1;
  const stageFinished = finished[index];

  /**
   * Tell the caller about a finished stage ONCE. `reported` is a ref, not
   * state, because re-rendering on a measurement nobody draws would be a
   * render per drag on the last card of a work.
   */
  const reported = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!onStageDone) return;
    if (!stageFinished) return;
    const key = stage.key;
    if (reported.current.has(key)) return;
    reported.current.add(key);
    onStageDone(key, index);
  }, [stageFinished, stage.key, index, onStageDone]);

  return (
    <div
      data-shelf-root
      className="flex min-h-[100dvh] flex-col gap-[8px] bg-[var(--dpl-bg)] text-[var(--dpl-ink)]"
      style={{
        fontFamily: 'var(--dpl-font-body)',
        // 🚨 NOTHING ON THE SHELF IS SELECTABLE (2026-09-17, per Tredoux, who
        // watched sentences turn blue while a child dragged a card).
        //
        // A work is a MATERIAL, not a document: a long press on a sentence chip
        // should pick the card up, not raise a selection handle and an iOS
        // "Copy / Look Up" callout over the sheet. The whole shelf therefore
        // opts out at the root — one declaration, inherited, rather than a
        // class remembered on each new surface — and every image additionally
        // refuses the native drag (`draggable={false}` plus -webkit-user-drag,
        // which Safari needs separately: without it a picture card is dragged
        // as a GHOST IMAGE by the browser and the real drag never starts).
        //
        // There is no input, textarea or contentEditable anywhere under here —
        // the child writes with a finger on a canvas — so nothing on the shelf
        // needs a caret or a selection to work.
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        // 🚨 THE 8px GUTTER IS NOW COMPOSED WITH THE SAFE-AREA INSETS rather
        // than set by px-/py- classes. The page declares viewport-fit=cover
        // (app/layout.tsx), so on a notched iPad or iPhone — and on ANY device
        // once this is installed to the home screen and the browser chrome is
        // gone — the insets are the only thing between the top bar and the
        // hardware. `env(..., 0px)` means every other screen keeps exactly the
        // 8px it had.
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(8px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(8px + env(safe-area-inset-right, 0px))',
        overscrollBehavior: 'none',
      }}
    >
      {/*
        ONE BAR. It used to be three — a title strip, a row of labelled shelf
        buttons, and a prev/next row under the work — which on a tablet in a
        child's hands ate about 190px of the page before the work began. The
        shelf itself is the navigation (pips, tappable in any order, exactly as
        the labelled strip was), so the other two rows had nothing left to do.
        Nothing was removed from the model: `index`, `visited` and `go()` are
        the same state the labelled strip drove.
      */}
      <header
        className="sticky z-30 flex h-[44px] flex-none items-center gap-[8px] rounded-[var(--dpl-r-md)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[8px]"
        // Belt and braces to the scroll lock above: if anything ever does make
        // this document scroll — a stage that genuinely outgrows a small phone,
        // an embedding surface we do not control — the shelf strip rides along
        // instead of sliding under the browser's own toolbar. `top` is the safe
        // inset, not 0, so the pinned bar clears a notch rather than hiding
        // behind it.
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the shelf"
          className="relative flex h-[30px] w-[30px] flex-none touch-manipulation items-center justify-center rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] text-[var(--dpl-ink2)] after:absolute after:-inset-[6px] after:content-['']"
          style={{ background: 'var(--dpl-timer-bg)' }}
        >
          <svg viewBox="0 0 16 16" className="h-[14px] w-[14px]" aria-hidden focusable="false">
            <path
              d="M10 2 4 8l6 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-center">
          <ShelfStrip
            compact
            stages={SHELF_STAGES}
            current={index}
            visited={visited}
            onPick={go}
          />
        </div>

        <span className="hidden flex-none whitespace-nowrap text-[10.5px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)] sm:inline">
          Lesson {lesson.lessonNumber} · {lesson.bookTitle}
        </span>
      </header>

      <section
        className="relative flex min-h-0 flex-1 flex-col gap-[8px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-stage-bg)] p-[var(--dpl-s3)]"
        style={{ boxShadow: 'var(--dpl-stage-shadow)' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {stage.key === 'book' ? (
              /* Work 1 — Characters. The strip IS the work; the reader
                 beside it is the book being read, which is not itself one of
                 the five tracked works and so reports nothing. */
              <CharacterStrip
                spec={characters}
                introductions={introductions}
                onDone={() => {
                  reportDone('characters');
                  markFinished(index);
                }}
              >
                {(gate) => (
                  <BookReader book={book} onDone={() => undefined} {...gate} />
                )}
              </CharacterStrip>
            ) : null}

            {'work' in stage ? (
              <WorkStage
                spec={works.find((w) => w.id === stage.work)}
                onDone={() => {
                  reportDone(stage.work as ShelfStageKey);
                  markFinished(index);
                }}
              />
            ) : null}

            {/* Tracing has no work key (it is not one of the five), so it
                stays SILENT to the tracker — see the note at the top of this
                file. It still tells the SHELF it is finished, which is a
                different thing entirely: nothing is written anywhere, the green
                pill simply appears, exactly as it does on the other four. The
                signal is the whole workbook being written, not one word — the
                per-word breath belongs to TraceSurface. */}
            {stage.key === 'trace' ? (
              <TraceBook book={workbook} onDone={() => markFinished(index)} />
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/*
          THE WAY ON. One pill, drawn once, over whichever stage is showing —
          never five copies inside five works. It appears when the work says it
          is finished and stays until it is tapped.

          On the last stage of the shelf there is nothing further along, so it
          reads "Done" and leaves the shelf — the same place the back chevron
          goes. A pill that looked like a button and did nothing would be worse
          than no pill at all.
        */}
        <AnimatePresence>
          {stageFinished ? (
            <NextWork
              key={stage.key}
              last={isLast}
              onNext={
                isLast
                  ? () => {
                      onLessonDone?.();
                      onClose();
                    }
                  : () => go(index + 1)
              }
            />
          ) : null}
        </AnimatePresence>
      </section>

    </div>
  );
}

/**
 * One work stage.
 *
 * 🚨 A MISSING WORK SAYS SO. `buildWorks()` returns all four for every lesson
 * on the shelf, so an absent one means the shelf and the builder have gone out
 * of step — and falling back to `works[0]` would answer that by silently
 * teaching Work 1 twice, which looks like a working shelf and is the hardest
 * kind of bug to notice. Better a plain sentence a grown-up can report.
 */
function WorkStage({
  spec,
  onDone,
}: {
  spec?: ReturnType<typeof buildWorks>[number];
  /** Reports Works 2-5 (shelf ids work1..work4) — see done-signal.ts. */
  onDone: () => void;
}) {
  if (!spec) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6px] text-center">
        <p
          className="text-[14px] font-bold text-[var(--dpl-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          This work is not ready yet
        </p>
        <p className="max-w-[36ch] text-[12px] text-[var(--dpl-ink2)]">
          Everything else on the shelf still works — take the next one along.
        </p>
      </div>
    );
  }
  return <MatchWork key={spec.id} spec={spec} onDone={onDone} />;
}
