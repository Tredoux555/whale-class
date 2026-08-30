'use client';

/**
 * The preview harness itself. One local cursor drives both roles:
 *   - as TEACHER you get the Back/Next, round, ✓/✗ and Reset controls;
 *   - as STUDENT you can actually drag the pictures.
 * Switching roles keeps the state, so you can mark a question as the teacher,
 * flip to the student, drag a picture, and flip back to see it land.
 */

import { useState } from 'react';

import BookWorks from '@/components/montree/dark-phonics-live/activities/BookWorks';
import { getBookWorks } from '@/lib/montree/dark-phonics/book-works';
import {
  DEFAULT_ACTIVITY_STATE,
  type LiveActivityState,
} from '@/lib/montree/dark-phonics/live-activities';

const INITIAL: LiveActivityState = {
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

/** Every lesson the book activity covers today. */
const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function Lesson1PreviewClient() {
  const [role, setRole] = useState<'teacher' | 'parent'>('teacher');
  const [lesson, setLesson] = useState(1);
  const [state, setState] = useState<LiveActivityState>(INITIAL);
  const data = getBookWorks(lesson);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--dpl-chrome)] text-[14px] text-[var(--dpl-ink2)]">
        No book activity is authored for lesson {lesson}.
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[var(--dpl-bg)] px-[18px] py-[20px] text-[var(--dpl-ink)]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      <div className="mx-auto flex w-full max-w-[1040px] flex-col gap-[14px]">
        {/* harness bar */}
        <div className="flex flex-wrap items-center gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[14px] py-[10px]">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
            book works preview · nothing saved
          </span>
          <span className="mx-1 h-[18px] w-px bg-[var(--dpl-line)]" />
          <label className="flex items-center gap-[7px] text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
            lesson
            <select
              value={lesson}
              onChange={(e) => {
                setLesson(Number(e.target.value));
                setState(INITIAL);
              }}
              className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[9px] py-[6px] text-[12px] text-[var(--dpl-ink)]"
              style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
            >
              {LESSONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className="mx-1 h-[18px] w-px bg-[var(--dpl-line)]" />
          {(['teacher', 'parent'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={[
                'rounded-[var(--dpl-r-sm)] border px-[12px] py-[7px] text-[11.5px] font-semibold',
                role === r
                  ? 'border-[var(--dpl-accent2)] text-[var(--dpl-accent2)]'
                  : 'border-[var(--dpl-line)] text-[var(--dpl-ink2)]',
              ].join(' ')}
              style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
            >
              {r === 'teacher' ? 'Teacher screen' : 'Student screen'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setState(INITIAL)}
            className="ml-auto rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[12px] py-[7px] text-[11.5px] font-semibold text-[var(--dpl-ink2)]"
            style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
          >
            Start the lesson over
          </button>
        </div>

        {/* the stage + cream slide, same shell the live classroom uses */}
        <section
          className="flex min-h-[640px] flex-col gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-stage-bg)] p-[var(--dpl-s3)]"
          style={{ boxShadow: 'var(--dpl-stage-shadow)' }}
        >
          <div className="flex items-center gap-[6px] px-[6px]">
            <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-1)]" />
            <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-2)]" />
            <i className="block h-2 w-2 rounded-full bg-[var(--dpl-dot-3)]" />
            <span className="ml-2 text-[10.5px] uppercase tracking-[0.12em] text-[var(--dpl-ink3)]">
              courseware · {role === 'teacher' ? 'teacher' : 'student'} view
            </span>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col gap-[var(--dpl-s3)] rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-edge)] bg-[var(--dpl-slide-bg)] px-[30px] pb-7 pt-[26px] text-[var(--dpl-slide-ink)]"
            style={{ boxShadow: 'var(--dpl-slide-shadow)' }}
          >
            <BookWorks
              data={data}
              state={state}
              role={role}
              onPatch={(patch) => setState((s) => ({ ...s, ...patch }))}
              onStudentPatch={(patch) => setState((s) => ({ ...s, ...patch }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
