'use client';

/**
 * The parent-led lesson: picker → player, one page, two views via state
 * (the same shape /montree/parent/appointments uses).
 *
 * AUTH — copied verbatim in behaviour from the parent dashboard's guard
 * (app/montree/parent/dashboard/page.tsx, "Session 113 V2 Parent audit F-1.3"):
 * the httpOnly cookie is the only authority. On mount we GET
 * /api/montree/parent/auth/access-code; anything other than an authenticated
 * response bounces to /montree/parent, which itself forwards to the unified
 * login. Nothing renders before that check resolves, so a logged-out visitor
 * sees a splash and then the login page — never lesson content.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import BookWorks from '@/components/montree/dark-phonics-live/activities/BookWorks';
import {
  bookWorksStepTitles,
  getBookWorks,
  type BookWorksLesson,
} from '@/lib/montree/dark-phonics/book-works';
import {
  DEFAULT_ACTIVITY_STATE,
  type LiveActivityState,
} from '@/lib/montree/dark-phonics/live-activities';

/** Lessons that have a book activity today. */
const LESSON_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Convenience only — which lesson to offer first next time. Never progress. */
const LAST_LESSON_KEY = 'montree_parent_last_lesson';

/**
 * A fresh cursor. `voice: 0` is belt-and-braces — BookWorks pins the voice off
 * for role="solo" regardless, but a lesson should never START from a state that
 * even claims otherwise.
 */
const FRESH: LiveActivityState = {
  ...DEFAULT_ACTIVITY_STATE,
  step: 0,
  bookPage: 0,
  round: 0,
  qIndex: 0,
  marks: [],
  matched: [],
  drop: '',
  trace: 0,
  voice: 0,
};

type Phase = 'checking' | 'ready';

export default function ParentLessonsClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [openLesson, setOpenLesson] = useState<number | null>(null);
  const [state, setState] = useState<LiveActivityState>(FRESH);
  const [suggested, setSuggested] = useState(1);

  /* ------------------------------------------------------------- auth ---- */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/montree/parent/auth/access-code', {
          credentials: 'same-origin',
        });
        if (cancelled) return;
        if (!res.ok) {
          router.push('/montree/parent');
          return;
        }
        const data = (await res.json().catch(() => ({}))) as { authenticated?: boolean };
        if (cancelled) return;
        if (!data?.authenticated) {
          router.push('/montree/parent');
          return;
        }
        // Read the remembered lesson here, after the await, rather than in a
        // second effect: it keeps this component free of synchronous setState
        // inside an effect body, and the value is only ever a convenience.
        try {
          const raw = window.localStorage.getItem(LAST_LESSON_KEY);
          const n = raw ? Number(raw) : NaN;
          if (LESSON_NUMBERS.includes(n)) setSuggested(n);
        } catch {
          /* a remembered lesson is a convenience, never a requirement */
        }
        setPhase('ready');
      } catch {
        if (!cancelled) router.push('/montree/parent');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const open = useCallback((n: number) => {
    setState(FRESH);
    setOpenLesson(n);
    try {
      window.localStorage.setItem(LAST_LESSON_KEY, String(n));
    } catch {
      /* ignore */
    }
  }, []);

  const close = useCallback(() => {
    setOpenLesson(null);
    setState(FRESH);
  }, []);

  if (phase === 'checking') return <Splash message="Opening your lessons…" />;

  const lesson = openLesson === null ? null : getBookWorks(openLesson);
  if (lesson) return <Player lesson={lesson} state={state} setState={setState} onClose={close} />;

  return <Picker suggested={suggested} onOpen={open} />;
}

/* ========================================================================== */
/* Picker                                                                     */
/* ========================================================================== */

function Picker({ suggested, onOpen }: { suggested: number; onOpen: (n: number) => void }) {
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
              Sit next to your child with the tablet between you. You read and tap the
              buttons; they touch the pictures. Nothing is saved and nothing is scored.
            </p>
          </div>
          <Link
            href="/montree/parent/dashboard"
            className="ml-auto rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[14px] py-[9px] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--dpl-ink2)] no-underline"
            style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
          >
            Back
          </Link>
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
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Player                                                                     */
/* ========================================================================== */

function Player({
  lesson,
  state,
  setState,
  onClose,
}: {
  lesson: BookWorksLesson;
  state: LiveActivityState;
  setState: React.Dispatch<React.SetStateAction<LiveActivityState>>;
  onClose: () => void;
}) {
  const titles = bookWorksStepTitles(lesson);
  const step = Math.min(Math.max(state.step ?? 0, 0), titles.length - 1);
  // One handler for both callbacks: on a single shared device the parent's
  // controls and the child's answers are the same piece of local state.
  const patch = useCallback(
    (p: Partial<LiveActivityState>) => setState((s) => ({ ...s, ...p })),
    [setState]
  );

  return (
    <div
      className="flex min-h-[100dvh] flex-col gap-[10px] bg-[var(--dpl-bg)] px-[12px] py-[12px] text-[var(--dpl-ink)]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      {/* slim parent bar */}
      <div className="flex flex-wrap items-center gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[12px] py-[8px]">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
          Lesson {lesson.lessonNumber} · {titles[step]}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[12px] py-[7px] text-[11px] font-semibold text-[var(--dpl-ink2)]"
          style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
        >
          End lesson
        </button>
      </div>

      {/* the lit slide, same shell as the classroom */}
      <section
        className="flex min-h-0 flex-1 flex-col gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-stage-bg)] p-[var(--dpl-s3)]"
        style={{ boxShadow: 'var(--dpl-stage-shadow)' }}
      >
        <div
          className="flex min-h-0 flex-1 flex-col gap-[var(--dpl-s3)] rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-edge)] bg-[var(--dpl-slide-bg)] px-[30px] pb-7 pt-[26px] text-[var(--dpl-slide-ink)]"
          style={{ boxShadow: 'var(--dpl-slide-shadow)' }}
        >
          <BookWorks
            key={lesson.lessonNumber}
            data={lesson}
            state={state}
            role="solo"
            onPatch={patch}
            onStudentPatch={patch}
          />
        </div>
      </section>
    </div>
  );
}

function Splash({ message }: { message: string }) {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-[var(--dpl-chrome)] px-6 text-center text-[14px] text-[var(--dpl-ink2)]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      {message}
    </div>
  );
}
