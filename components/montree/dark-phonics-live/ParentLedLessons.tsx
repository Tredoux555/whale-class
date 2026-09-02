'use client';

/**
 * ParentLedLessons — the Dark Phonics SHELF at home: picker and player.
 *
 * The same Book Works lessons the live classroom teaches, rebuilt for ONE
 * shared tablet as a Montessori shelf: the letter card, the book to turn page
 * by page, the four printed manipulative works as drag-and-drop, and the word
 * to write with a finger. Parent and child sit side by side; the child's
 * surfaces are live and nobody is on a call.
 *
 * 🚨 THIS COMPONENT CONTAINS NO AUTH, ON PURPOSE. It is mounted from two
 * places with deliberately different doors:
 *   - /montree/parent/lessons — inside the parent portal, behind that portal's
 *     own cookie guard (unchanged; the guard lives in the page, not here);
 *   - /parents — the public Whale-Class door on teacherpotato.xyz, no login.
 * Because it holds nothing private (public curriculum art and text, all state
 * local to the tab), the same component is safe on both sides of that line.
 * Do not add a session check here — the portal page would then check twice and
 * the public page would break.
 *
 * DELIBERATELY LOCAL. No appointment, no live-state row, no PATCH, no
 * migration: the whole lesson is React state in this tab. Nothing is written
 * to a server, so the live classroom's sync contract is untouched by anything
 * here.
 *
 * SILENT. There is no digital voice here and no switch to turn one on: the
 * grown-up reading beside the child is the voice. Guidance is English only.
 * (v2-shelf/audio.ts is the seam for recorded clips, and is a no-op today.)
 *
 * 🚨 THE SHELF IS THE ONLY EXPERIENCE HERE NOW. Both doors used to offer a
 * choice between this and the older eight-step walked lesson (`BookWorks`);
 * the owner retired that choice, so the shelf loads directly and there is no
 * tab. BookWorks.tsx ITSELF IS NOT DEAD and must not be deleted — the live
 * classroom clients still render it. Only its mount here was removed.
 */

import { useCallback, useState, useSyncExternalStore } from 'react';

import ShelfPlayer from '@/components/montree/dark-phonics-live/v2-shelf/ShelfPlayer';
import {
  BOOK_WORKS_LESSON_NUMBERS,
  getBookWorks,
  type BookWorksLesson,
} from '@/lib/montree/dark-phonics/book-works';
import { RAW, displayN } from '@/lib/montree/dark-phonics/lessons';

/** Lessons that have a book activity today — derived, so gaps handle themselves. */
const LESSON_NUMBERS = BOOK_WORKS_LESSON_NUMBERS;

/** Convenience only — which lesson to offer first next time. Never progress. */
const LAST_LESSON_KEY = 'montree_parent_last_lesson';

/**
 * Lessons whose printed works exist on paper but whose book has no page text in
 * the repo yet, so the shelf cannot be built for them. They are SHOWN, greyed,
 * rather than hidden: a grown-up looking for their child's letter should find
 * out that it is coming, not silently fail to find it.
 *
 * Derived, never hand-listed — a lesson leaves this list the day its book text
 * lands, with no edit here.
 */
const SHELF_COMING_SOON: ReadonlyArray<{ n: number; sound: string; title: string }> =
  RAW.filter((l) => l.books?.some((b) => b.works) || l.reader?.works)
    .map((l) => ({ n: displayN(l.n), sound: l.sound, title: l.title }))
    .filter((l) => !BOOK_WORKS_LESSON_NUMBERS.includes(l.n));

/**
 * Read one localStorage key, hydration-safely.
 *
 * 🚨 NOT a `useState` initializer and NOT a `useEffect`. An initializer that
 * touches localStorage renders different HTML on the server and in the browser
 * (a hydration mismatch this repo has been bitten by before); an effect that
 * sets state on mount is a cascading render. `useSyncExternalStore` is the one
 * that is correct on both counts: the server snapshot is null, the client reads
 * the real value, and React reconciles the difference itself.
 *
 * The subscription is a no-op on purpose — these are read-once preferences, not
 * live state, and nothing else in the tab is expected to change them underneath.
 */
const NO_SUBSCRIBE = () => () => {};

function useStoredPreference(key: string): string | null {
  return useSyncExternalStore(
    NO_SUBSCRIBE,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null
  );
}

export interface ParentLedLessonsProps {
  /** Optional "leave" affordance — the portal passes its Back link target. */
  backHref?: string;
  backLabel?: string;
}

export default function ParentLedLessons({ backHref, backLabel = 'Back' }: ParentLedLessonsProps) {
  const [openLesson, setOpenLesson] = useState<number | null>(null);

  // A remembered lesson is a convenience, never progress and never a gate.
  const rememberedLesson = Number(useStoredPreference(LAST_LESSON_KEY));
  const suggested = LESSON_NUMBERS.includes(rememberedLesson) ? rememberedLesson : 1;

  const open = useCallback((n: number) => {
    setOpenLesson(n);
    try {
      window.localStorage.setItem(LAST_LESSON_KEY, String(n));
    } catch {
      /* private mode, cleared storage — the picker simply starts at lesson 1 */
    }
  }, []);

  const close = useCallback(() => setOpenLesson(null), []);

  const lesson = openLesson === null ? null : getBookWorks(openLesson);
  if (lesson) {
    return <ShelfPlayer key={lesson.lessonNumber} lesson={lesson} onClose={close} />;
  }

  return (
    <Picker
      suggested={suggested}
      onOpen={open}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
}

/* ========================================================================== */
/* Picker                                                                     */
/* ========================================================================== */

function Picker({
  suggested,
  onOpen,
  backHref,
  backLabel,
}: {
  suggested: number;
  onOpen: (n: number) => void;
  backHref?: string;
  backLabel: string;
}) {
  const lessons = LESSON_NUMBERS.map((n) => ({ n, data: getBookWorks(n) })).filter(
    (l): l is { n: number; data: BookWorksLesson } => !!l.data
  );

  return (
    <div
      className="min-h-[100dvh] bg-[var(--dpl-bg)] px-[18px] py-[22px] text-[var(--dpl-ink)]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-[18px]">
        <header className="flex flex-wrap items-center gap-[12px]">
          <div className="min-w-0">
            <h1
              className="text-[22px] font-bold text-[var(--dpl-ink)]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              Lessons at home
            </h1>
            <p className="mt-[3px] text-[13px] leading-[1.5] text-[var(--dpl-ink2)]">
              Sit next to your child with the tablet between you. Each lesson opens
              a shelf: the letter card, the book to turn page by page, the four
              paper works to rebuild, and the word to write. Take them in any
              order. Nothing is saved and nothing is scored.
            </p>
          </div>
          {backHref ? (
            <a
              href={backHref}
              className="ml-auto rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[14px] py-[9px] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--dpl-ink2)] no-underline"
              style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
            >
              {backLabel}
            </a>
          ) : null}
        </header>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-[14px]">
          {lessons.map(({ n, data }) => (
            <button
              key={n}
              type="button"
              onClick={() => onOpen(n)}
              className="flex touch-manipulation flex-col gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] p-[12px] text-left"
              style={{ background: 'var(--dpl-chrome2)', boxShadow: 'var(--dpl-shadow)' }}
            >
              <div className="flex items-center gap-[8px]">
                <span
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[var(--dpl-accent2)] text-[14px] font-bold lowercase text-[var(--dpl-accent2)]"
                  style={{ fontFamily: 'var(--dpl-font-display)' }}
                >
                  {data.letter}
                </span>
                <span className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
                  Lesson {n}
                  {n === suggested ? ' · last opened' : ''}
                </span>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */}
              <img
                src={data.coverImage}
                alt=""
                className="h-[130px] w-full rounded-[var(--dpl-r-md)] bg-white object-contain"
              />

              <span
                className="text-[14px] font-bold leading-tight text-[var(--dpl-ink)]"
                style={{ fontFamily: 'var(--dpl-font-display)' }}
              >
                {data.bookTitle}
              </span>
            </button>
          ))}

          {SHELF_COMING_SOON.map((l) => (
                <div
                  key={`soon-${l.n}`}
                  className="flex flex-col gap-[10px] rounded-[var(--dpl-r-lg)] border border-dashed border-[var(--dpl-line)] p-[12px] opacity-55"
                >
                  <div className="flex items-center gap-[8px]">
                    <span
                      className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[var(--dpl-line)] text-[13px] font-bold lowercase text-[var(--dpl-ink3)]"
                      style={{ fontFamily: 'var(--dpl-font-display)' }}
                    >
                      {l.sound}
                    </span>
                    <span className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
                      Lesson {l.n}
                    </span>
                  </div>
                  <div className="flex h-[130px] items-center justify-center rounded-[var(--dpl-r-md)] border border-dashed border-[var(--dpl-line)] text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
                    Coming soon
                  </div>
                  <span
                    className="text-[14px] font-bold leading-tight text-[var(--dpl-ink3)]"
                    style={{ fontFamily: 'var(--dpl-font-display)' }}
                  >
                    {l.title}
                  </span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
