'use client';

/**
 * Book Works — Lesson 1, the first online Dark Phonics lesson.
 *
 * Pre-decodable: the child cannot read a single word yet, so nothing here is
 * spelled. It is a sock, four pictures, one phrase, six spoken questions and a
 * potato. Seven steps, walked by the teacher with Back / Next: watch the song,
 * read the book page by page, then the sock, the matching, the phrase, the
 * spoken questions and the twist ending.
 *
 * 🚨 THIS IS THE FIRST ACTIVITY THE STUDENT TOUCHES. Steps 3 and 4 are
 * interactive on the PARENT device (the child drags), read-only mirrors on the
 * teacher's. Only LANDED RESULTS sync (`matched`, `drop`) — never a mid-drag
 * position, so the 2s poll is fast enough by construction. A wrong answer
 * shakes locally and is never written anywhere, and nothing the child does is
 * counted, totalled or paid for: the work itself is the whole point.
 *
 * Step 5 is deliberately NOT interactive for the child — the answer is spoken
 * out loud on the video call and the TEACHER marks it, because "yes" and "no"
 * are a speaking exercise, not a tapping one.
 *
 * Content comes from lib/montree/dark-phonics/book-works.ts (pure, derived
 * identically on both surfaces). Local overlay state exists only to hide the
 * 2s round-trip from the child's hand.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import {
  BOOK_WORKS_STEP_TITLES,
  findCard,
  splitBookLine,
  type BookCard,
  type BookWorksLesson,
} from '@/lib/montree/dark-phonics/book-works';
import { speakSentence, speakWord } from '@/lib/montree/dark-phonics/speech';
import type { LiveActivityState } from '@/lib/montree/dark-phonics/live-activities';

/** How long a local drag result outranks the polled server value. */
const OVERLAY_MS = 3000;
/** Pointer travel (px) above which a press counts as a drag, not a tap. */
const DRAG_THRESHOLD = 8;

/** The teacher's one-line note per step, parallel to BOOK_WORKS_STEP_TITLES. */
const TEACHER_NOTES: readonly string[] = [
  'Let\u2019s watch the video together.',
  'Let\u2019s read a book together.',
  'Hold the real thing up to the camera.',
  'They drag on their screen \u2014 you watch it land here.',
  'They drag on their screen \u2014 you watch it land here.',
  'They answer out loud. You mark it.',
  'The end of the book.',
];

export interface BookWorksProps {
  data: BookWorksLesson;
  state: LiveActivityState;
  role: 'teacher' | 'parent';
  /** Teacher only — the synced cursor (step / bookPage / round / qIndex / marks). */
  onPatch?: (patch: Partial<LiveActivityState>) => void;
  /** Parent only — the two student-owned keys. */
  onStudentPatch?: (patch: { matched?: string[]; drop?: string }) => void;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

export default function BookWorks({ data, state, role, onPatch, onStudentPatch }: BookWorksProps) {
  const isTeacher = role === 'teacher';
  const step = clamp(state.step ?? 0, 0, BOOK_WORKS_STEP_TITLES.length - 1);
  const bookPage = clamp(state.bookPage ?? 0, 0, data.pages.length - 1);
  const round = clamp(state.round ?? 0, 0, data.rounds.length - 1);
  const qIndex = clamp(state.qIndex ?? 0, 0, data.questions.length - 1);
  const marks = state.marks ?? [];

  /* ------------------------------------------------- student overlay ------ */
  // The child's own screen must respond instantly; the server is 2s behind.
  // The overlay wins for OVERLAY_MS, then the polled truth takes over — which
  // is also how a teacher's Reset reaches the child's screen.
  // The overlay is STAMPED with the cursor it was made under, and only counts
  // while that cursor still holds — so the teacher moving to another step or
  // round discards it by pure derivation, with no effect and no setState.
  const cursorKey = `${step}:${round}`;
  const [overlay, setOverlay] = useState<{ key: string; matched: string[]; drop: string } | null>(null);
  const overlayTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (overlayTimer.current !== null) window.clearTimeout(overlayTimer.current);
    },
    []
  );

  const pushOverlay = useCallback(
    (key: string, next: { matched: string[]; drop: string }) => {
      setOverlay({ key, ...next });
      if (overlayTimer.current !== null) window.clearTimeout(overlayTimer.current);
      overlayTimer.current = window.setTimeout(() => setOverlay(null), OVERLAY_MS);
    },
    []
  );

  const live = overlay && overlay.key === cursorKey ? overlay : null;
  const serverMatched = useMemo(() => state.matched ?? [], [state.matched]);
  const serverDrop = state.drop ?? '';
  const matched = live ? live.matched : serverMatched;
  const drop = live ? live.drop : serverDrop;

  /* --------------------------------------------------------- feedback ----- */
  const [wrongId, setWrongId] = useState<string | null>(null);
  const wrongTimer = useRef<number | null>(null);
  const shake = useCallback((id: string) => {
    setWrongId(id);
    if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => setWrongId(null), 480);
  }, []);
  useEffect(() => () => {
    if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
  }, []);

  // Step 3's ✓ gets ONE momentary response and leaves nothing behind: a soft
  // pulse on the picture, derived from the mark landing so BOTH screens do it,
  // gone in under a second. Nothing accumulates and nothing is displayed after
  // it fades — ✗ is answered by a calm re-read of the question instead.
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<number | null>(null);
  const marksKey = marks.join(',');
  const seenMarks = useRef(marksKey);
  useEffect(() => {
    const before = seenMarks.current;
    seenMarks.current = marksKey;
    if (before === marksKey || step !== 5) return;
    const prev = before ? before.split(',') : [];
    const next = marksKey ? marksKey.split(',') : [];
    const changed = next.findIndex((v, i) => v !== prev[i]);
    if (changed < 0 || next[changed] !== '1') return;
    setPulse(true);
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 900);
  }, [marksKey, step]);
  useEffect(() => () => {
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
  }, []);

  /* --------------------------------------------------------- step body ---- */

  let body: ReactNode = null;

  if (step === 0) {
    body = <StepVideo data={data} isTeacher={isTeacher} />;
  } else if (step === 1) {
    body = <StepBook data={data} page={bookPage} />;
  } else if (step === 2) {
    body = <StepSock data={data} isTeacher={isTeacher} />;
  } else if (step === 3) {
    body = (
      <StepMatch
        data={data}
        matched={matched}
        wrongId={wrongId}
        interactive={!isTeacher && !!onStudentPatch}
        onCorrect={(card) => {
          const next = matched.includes(card.id) ? matched : [...matched, card.id];
          pushOverlay(cursorKey, { matched: next, drop });
          speakWord(card.label);
          onStudentPatch?.({ matched: next });
        }}
        onWrong={shake}
      />
    );
  } else if (step === 4) {
    body = (
      <StepFind
        data={data}
        round={round}
        drop={drop}
        wrongId={wrongId}
        isTeacher={isTeacher}
        interactive={!isTeacher && !!onStudentPatch}
        onCorrect={(card) => {
          pushOverlay(cursorKey, { matched, drop: card.id });
          speakWord(card.label);
          onStudentPatch?.({ drop: card.id });
        }}
        onWrong={shake}
      />
    );
  } else if (step === 5) {
    body = <StepYesNo data={data} qIndex={qIndex} pulse={pulse} />;
  } else {
    body = <StepEnd data={data} />;
  }

  /* ----------------------------------------------------------- controls --- */

  const setStep = (next: number) => {
    const s = clamp(next, 0, BOOK_WORKS_STEP_TITLES.length - 1);
    if (s === step) return;
    // Moving between steps rewinds the book to page 1 and clears the student's
    // landed answers — each step starts from a clean board, and a stale `drop`
    // from the phrase step (4) must not leak onto the next one.
    onPatch?.({ step: s, bookPage: 0, round: 0, matched: [], drop: '' });
  };

  const mark = (correct: boolean) => {
    const next = [...marks];
    next[qIndex] = correct ? 1 : 0;
    // "Not yet" simply asks again, calmly, before moving on — no tally, no
    // penalty, nothing kept.
    if (!correct) speakSentence(data.questions[qIndex].question);
    const advance = qIndex < data.questions.length - 1 ? qIndex + 1 : qIndex;
    onPatch?.({ marks: next, qIndex: advance });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[16px]">
      {/*
        🚨 Turbopack rejects a NESTED <style jsx> (repo law — see CLAUDE.md).
        These keyframes are needed inside conditional step branches, so they are
        injected here, unconditionally, at the top of the component's return.
      */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes bw-breathe { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.035); } }
@keyframes bw-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
@keyframes bw-pop { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes bw-soft { from { box-shadow: 0 0 0 0 rgba(109,40,217,.34); } to { box-shadow: 0 0 0 16px rgba(109,40,217,0); } }
.bw-breathe { animation: bw-breathe 2.4s ease-in-out infinite; }
.bw-shake { animation: bw-shake .42s ease-in-out; }
.bw-pop { animation: bw-pop .28s ease-out; }
.bw-soft { animation: bw-soft .9s ease-out; }
@media (prefers-reduced-motion: reduce) { .bw-breathe, .bw-shake, .bw-pop, .bw-soft { animation: none; } }
`,
        }}
      />

      {/* activity header */}
      <div className="flex items-center gap-[12px]">
        <span
          className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-[var(--dpl-slide-accent)] text-[15px] font-bold text-[var(--dpl-slide-accent)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          {step + 1}
        </span>
        <div className="min-w-0">
          <div
            className="text-[16px] font-bold text-[var(--dpl-slide-ink)]"
            style={{ fontFamily: 'var(--dpl-font-display)' }}
          >
            {BOOK_WORKS_STEP_TITLES[step]}
            <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">
              {data.bookTitle}
            </span>
          </div>
          {isTeacher ? (
            <div className="truncate text-[12px] italic text-[var(--dpl-slide-ink3)]">
              {TEACHER_NOTES[step]}
            </div>
          ) : null}
        </div>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto">{body}</div>

      {/* teacher controls */}
      {isTeacher ? (
        <div className="flex flex-wrap items-center justify-center gap-[8px]">
          <Ctl label="◀ Back" onClick={() => setStep(step - 1)} disabled={step <= 0} />
          <Ctl
            label="Next ▶"
            onClick={() => setStep(step + 1)}
            disabled={step >= BOOK_WORKS_STEP_TITLES.length - 1}
            accent
          />

          {step === 1 ? (
            <>
              <Ctl
                label="◀ Page back"
                onClick={() => onPatch?.({ bookPage: Math.max(0, bookPage - 1) })}
                disabled={bookPage <= 0}
              />
              <Ctl
                label="Next page ▶"
                onClick={() => onPatch?.({ bookPage: Math.min(data.pages.length - 1, bookPage + 1) })}
                disabled={bookPage >= data.pages.length - 1}
              />
              <Ctl label="🔊 Read it" onClick={() => speakSentence(data.pages[bookPage].sentence)} />
              <Ctl
                label="Back to page 1"
                onClick={() => onPatch?.({ bookPage: 0 })}
                disabled={bookPage === 0}
              />
            </>
          ) : null}

          {step === 3 ? (
            <Ctl
              label="Start over"
              onClick={() => onPatch?.({ matched: [], drop: '' })}
              disabled={matched.length === 0}
            />
          ) : null}

          {step === 4 ? (
            <>
              <Ctl label="🔊 Read it" onClick={() => speakSentence(data.rounds[round].sentence)} />
              <Ctl
                label="Next picture ▶"
                onClick={() => onPatch?.({ round: Math.min(round + 1, data.rounds.length - 1), drop: '' })}
                disabled={round >= data.rounds.length - 1}
              />
              <Ctl label="Start over" onClick={() => onPatch?.({ drop: '' })} disabled={!drop} />
            </>
          ) : null}

          {step === 5 ? (
            <>
              <Ctl label="🔊 Ask it" onClick={() => speakSentence(data.questions[qIndex].question)} />
              <Ctl label="✓ Right" onClick={() => mark(true)} accent />
              <Ctl label="✗ Not yet" onClick={() => mark(false)} />
              <Ctl
                label="◀ Question back"
                onClick={() => onPatch?.({ qIndex: Math.max(0, qIndex - 1) })}
                disabled={qIndex <= 0}
              />
              <Ctl
                label="Start over"
                onClick={() => onPatch?.({ marks: [], qIndex: 0 })}
                disabled={qIndex === 0 && marks.length === 0}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ========================================================================== */
/* Step 0 — watch the song video                                              */
/* ========================================================================== */

/**
 * The lesson's song, big on the lit slide.
 *
 * Same graceful ladder as Stage's HeroMedia: bucket mp4 → the lesson's still
 * picture → a card of the book's own art, each step demoting itself on
 * `onError`. A class must never show a broken player.
 *
 * 🚨 NOT MUTED, and `controls` on BOTH surfaces. The child watches this on the
 * family's device, so the parent has to be able to press play and hear it —
 * the small muted preview in the letter-card column is a different thing for a
 * different purpose. Playback position is deliberately NOT synced: a 2s poll
 * cannot carry a playhead, and pretending otherwise would stutter. The teacher
 * says "press play" on the call, exactly as they would with a paper book.
 */
function StepVideo({ data, isTeacher }: { data: BookWorksLesson; isTeacher: boolean }) {
  const [rung, setRung] = useState<'video' | 'picture' | 'art'>('video');

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[12px]">
      <div className="flex min-h-0 w-full max-w-[720px] flex-1 items-center justify-center overflow-hidden rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-black">
        {rung === 'video' ? (
          <video
            src={data.videoUrl}
            poster={data.videoPosterUrl}
            controls
            playsInline
            preload="metadata"
            onError={() => setRung('picture')}
            className="max-h-full w-full object-contain"
          />
        ) : rung === 'picture' ? (
          /* eslint-disable-next-line @next/next/no-img-element -- media-proxy asset, no known intrinsic size */
          <img
            src={data.videoPosterUrl}
            alt={data.title}
            onError={() => setRung('art')}
            className="max-h-full w-full bg-white object-contain"
          />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */
          <img
            src={data.coverImage}
            alt={data.bookTitle}
            className="max-h-full w-full bg-white object-contain"
          />
        )}
      </div>

      <p
        className="text-center text-[22px] font-bold leading-tight text-[var(--dpl-slide-ink)]"
        style={{ fontFamily: 'var(--dpl-font-display)' }}
      >
        {TEACHER_NOTES[0]}
      </p>
      {isTeacher && rung !== 'video' ? (
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">
          song not playing &middot; showing the song card instead
        </p>
      ) : null}
    </div>
  );
}

/* ========================================================================== */
/* Step 1 — read the book, page by page                                       */
/* ========================================================================== */

/**
 * One page at a time, both screens showing the same page (teacher-owned
 * `bookPage`).
 *
 * TYPOGRAPHY IS LOCKED, not a style choice: small italic lead-in, then the
 * literal LAST WORD big and bold, nothing after it — the house rule from
 * build_a5_readers.py that every printed Dark Phonics reader follows. The
 * split comes from splitBookLine() so the screen and the paper can never
 * drift. Sizes are FIXED across pages: a child following along must see the
 * shout word land in the same place, at the same size, every single page.
 */
function StepBook({ data, page }: { data: BookWorksLesson; page: number }) {
  const current = data.pages[page];
  const { lead, shout } = splitBookLine(current.sentence);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[12px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */}
      <img
        src={current.art}
        alt=""
        className="min-h-0 w-full max-w-[560px] flex-1 rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-white object-contain"
      />

      <p className="max-w-[620px] text-center leading-[1.15]">
        {lead ? (
          <span className="text-[20px] italic text-[var(--dpl-slide-ink2)]">{lead} </span>
        ) : null}
        <span
          className="text-[40px] font-bold text-[var(--dpl-slide-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          {shout}
        </span>
      </p>

      {/* page dots — plain position markers, nothing earned */}
      <div className="flex items-center gap-[7px]" aria-label={`page ${page + 1} of ${data.pages.length}`}>
        {data.pages.map((_, i) => (
          <span
            key={i}
            className={[
              'block h-[7px] w-[7px] rounded-full',
              i === page ? 'bg-[var(--dpl-slide-accent)]' : 'bg-[var(--dpl-slide-line)]',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Step 2 — the sock                                                          */
/* ========================================================================== */

function StepSock({ data, isTeacher }: { data: BookWorksLesson; isTeacher: boolean }) {
  if (!isTeacher) {
    // Parent screen: the book, big. Nothing to do — the child is watching the
    // teacher hold up a real sock, not reading a UI.
    return (
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[14px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */}
        <img
          src={data.coverImage}
          alt={data.bookTitle}
          className="min-h-0 w-full flex-1 rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-white object-contain"
        />
        <p
          className="text-[30px] font-bold leading-tight text-[var(--dpl-slide-ink)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          {data.title}
        </p>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-[minmax(0,220px)_minmax(0,1fr)] items-start gap-[22px]">
      <div className="flex flex-col items-center gap-[8px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */}
        <img
          src={data.coverImage}
          alt={data.bookTitle}
          className="w-full rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-white object-contain"
        />
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">
          on their screen
        </span>
      </div>

      <ol className="flex flex-col gap-[10px]">
        {data.script.map((line, i) => (
          <li
            key={i}
            className="flex items-start gap-[12px] rounded-[var(--dpl-r-sm)] border border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] px-[14px] py-[10px]"
          >
            <span
              className="mt-[1px] flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[var(--dpl-slide-accent)] text-[11px] font-bold text-[var(--dpl-slide-on-accent)]"
              style={{ fontFamily: 'var(--dpl-font-display)' }}
            >
              {i + 1}
            </span>
            <span className="text-[14px] leading-[1.45] text-[var(--dpl-slide-ink)]">{line}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ========================================================================== */
/* Step 3 — match the pictures                                                */
/* ========================================================================== */

function StepMatch({
  data,
  matched,
  wrongId,
  interactive,
  onCorrect,
  onWrong,
}: {
  data: BookWorksLesson;
  matched: string[];
  wrongId: string | null;
  interactive: boolean;
  onCorrect: (card: BookCard) => void;
  onWrong: (id: string) => void;
}) {
  const rightCards = data.matchOrder
    .map((id) => findCard(data, id))
    .filter((c): c is BookCard => !!c);

  const { dragId, ghost, slotRef, startDrag, selectedId, tapSlot } = useCardDrag({
    interactive,
    onLand: (cardId, slotId) => {
      const card = findCard(data, cardId);
      if (!card) return;
      if (cardId === slotId) onCorrect(card);
      else onWrong(slotId);
    },
  });

  return (
    <div className="flex w-full flex-col items-center gap-[14px]">
      <p className="text-[13px] text-[var(--dpl-slide-ink2)]">
        {interactive ? 'Drag each picture to the one that looks the same.' : 'They are matching the pictures.'}
      </p>

      <div className="grid w-full max-w-[620px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-[46px] gap-y-[12px]">
        {/* left — the pictures to move */}
        <div className="flex flex-col gap-[12px]">
          {data.cast.map((card) => {
            const done = matched.includes(card.id);
            return (
              <CardTile
                key={card.id}
                card={card}
                muted={done}
                selected={selectedId === card.id}
                dragging={dragId === card.id}
                onPointerDown={(e) => startDrag(e, card.id, done)}
              />
            );
          })}
        </div>

        {/* right — the twins */}
        <div className="flex flex-col gap-[12px]">
          {rightCards.map((card) => {
            const done = matched.includes(card.id);
            return (
              <div
                key={card.id}
                ref={(el) => slotRef(card.id, el)}
                onClick={() => tapSlot(card.id)}
                className={[
                  'relative flex h-[86px] items-center justify-center rounded-[var(--dpl-r-md)] border-2 bg-white transition-colors',
                  done
                    ? 'border-[var(--dpl-slide-accent)]'
                    : 'border-dashed border-[var(--dpl-slide-line)]',
                  interactive ? 'cursor-pointer' : 'cursor-default',
                  wrongId === card.id ? 'bw-shake' : '',
                ].join(' ')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */}
                <img src={card.image} alt={card.label} className="h-[74px] w-auto object-contain" draggable={false} />
                {done ? (
                  <span
                    className="bw-pop absolute -right-[10px] -top-[10px] flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[var(--dpl-slide-accent)] text-[14px] font-bold text-[var(--dpl-slide-on-accent)]"
                    aria-label="matched"
                  >
                    ✓
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {matched.length === data.cast.length ? (
        <p
          className="bw-pop text-[18px] font-bold text-[var(--dpl-slide-accent-2)]"
          style={{ fontFamily: 'var(--dpl-font-display)' }}
        >
          All four matched.
        </p>
      ) : null}

      {ghost}
    </div>
  );
}

/* ========================================================================== */
/* Step 4 — find the picture                                                  */
/* ========================================================================== */

function StepFind({
  data,
  round,
  drop,
  wrongId,
  isTeacher,
  interactive,
  onCorrect,
  onWrong,
}: {
  data: BookWorksLesson;
  round: number;
  drop: string;
  wrongId: string | null;
  isTeacher: boolean;
  interactive: boolean;
  onCorrect: (card: BookCard) => void;
  onWrong: (id: string) => void;
}) {
  const FRAME = '__frame__';
  const current = data.rounds[round];
  const dropped = drop ? findCard(data, drop) : undefined;

  const { dragId, ghost, slotRef, startDrag, selectedId, tapSlot } = useCardDrag({
    interactive,
    onLand: (cardId) => {
      const card = findCard(data, cardId);
      if (!card) return;
      if (cardId === current.answerId) onCorrect(card);
      else onWrong(cardId);
    },
  });

  const candidates = current.candidateIds
    .map((id) => findCard(data, id))
    .filter((c): c is BookCard => !!c);

  return (
    <div className="flex w-full flex-col items-center gap-[16px]">
      <p
        className="text-center text-[30px] font-bold leading-tight text-[var(--dpl-slide-ink)]"
        style={{ fontFamily: 'var(--dpl-font-display)' }}
      >
        {current.sentence}
      </p>
      <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">
        picture {round + 1} of {data.rounds.length}
        {isTeacher ? ' · read it, then let them find it' : ''}
      </p>

      <div className="grid w-full max-w-[660px] grid-cols-[minmax(0,1fr)_minmax(0,260px)] items-center gap-[36px]">
        {/* left — the choices */}
        <div className="grid grid-cols-2 gap-[12px]">
          {candidates.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              muted={dropped?.id === card.id}
              selected={selectedId === card.id}
              dragging={dragId === card.id}
              shaking={wrongId === card.id}
              onPointerDown={(e) => startDrag(e, card.id, dropped?.id === card.id)}
            />
          ))}
        </div>

        {/* right — the frame */}
        <div
          ref={(el) => slotRef(FRAME, el)}
          onClick={() => tapSlot(FRAME)}
          className={[
            'flex h-[210px] items-center justify-center rounded-[var(--dpl-r-md)] border-[3px] bg-white',
            dropped
              ? 'border-[var(--dpl-slide-accent)]'
              : 'border-dashed border-[var(--dpl-slide-accent)] bw-breathe',
            interactive ? 'cursor-pointer' : 'cursor-default',
          ].join(' ')}
        >
          {dropped ? (
            /* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */
            <img
              src={dropped.image}
              alt={dropped.label}
              className="bw-pop h-[186px] w-auto object-contain"
              draggable={false}
            />
          ) : (
            <span className="text-[46px] text-[var(--dpl-slide-accent)]" aria-hidden="true">
              ?
            </span>
          )}
        </div>
      </div>

      {ghost}
    </div>
  );
}

/* ========================================================================== */
/* Step 5 — yes or no (spoken; the teacher marks)                             */
/* ========================================================================== */

function StepYesNo({
  data,
  qIndex,
  pulse,
}: {
  data: BookWorksLesson;
  qIndex: number;
  /** A single fading pulse after a ✓. Nothing is kept once it fades. */
  pulse: boolean;
}) {
  const q = data.questions[qIndex];
  return (
    <div className="flex w-full flex-col items-center gap-[14px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */}
      <img
        src={q.image}
        alt=""
        className={[
          'h-[220px] w-auto rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-white object-contain',
          pulse ? 'bw-soft' : '',
        ].join(' ')}
      />

      <p
        className="text-center text-[30px] font-bold leading-tight text-[var(--dpl-slide-ink)]"
        style={{ fontFamily: 'var(--dpl-font-display)' }}
      >
        {q.question}
      </p>
      <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">
        question {qIndex + 1} of {data.questions.length} · say it out loud
      </p>
    </div>
  );
}

/* ========================================================================== */
/* Step 6 — the end                                                           */
/* ========================================================================== */

function StepEnd({ data }: { data: BookWorksLesson }) {
  // The end of the lesson is the end of the BOOK — the twist page and its line,
  // then goodbye. There is nothing to hand out and nothing to add up.
  return (
    <div className="flex w-full flex-col items-center gap-[12px]">
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */}
      <img
        src={data.endingImage}
        alt={data.endingLine}
        className="h-[230px] w-auto rounded-[var(--dpl-r-md)] border border-[var(--dpl-slide-line)] bg-white object-contain"
      />
      <p
        className="text-center text-[32px] font-bold leading-tight text-[var(--dpl-slide-ink)]"
        style={{ fontFamily: 'var(--dpl-font-display)' }}
      >
        {data.endingLine}
      </p>
      <p className="max-w-[420px] text-center text-[13px] leading-[1.5] text-[var(--dpl-slide-ink2)]">
        {data.goodbyeLine}
      </p>
    </div>
  );
}

/* ========================================================================== */
/* Shared pieces                                                              */
/* ========================================================================== */

function CardTile({
  card,
  muted,
  selected,
  dragging,
  shaking,
  onPointerDown,
}: {
  card: BookCard;
  muted?: boolean;
  selected?: boolean;
  dragging?: boolean;
  shaking?: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className={[
        'flex h-[86px] touch-none select-none items-center justify-center rounded-[var(--dpl-r-md)] border-2 bg-white transition-opacity',
        selected ? 'border-[var(--dpl-slide-accent)]' : 'border-[var(--dpl-slide-line)]',
        muted ? 'opacity-30' : '',
        dragging ? 'opacity-40' : '',
        shaking ? 'bw-shake' : '',
      ].join(' ')}
      style={{ boxShadow: selected ? '0 0 0 3px rgba(109,40,217,.22)' : undefined }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, no known intrinsic size */}
      <img src={card.image} alt={card.label} className="h-[74px] w-auto object-contain" draggable={false} />
    </div>
  );
}

/**
 * Drag + tap-tap in one small hook.
 *
 * Plain pointer events, no dependency. Both interactions exist on purpose: a
 * drag is what a four-year-old reaches for first, and tap-then-tap is the one
 * that always works on a cheap tablet with a jumpy digitiser. Nothing here
 * syncs — only the LANDED result (via onLand) is written by the caller.
 */
function useCardDrag({
  interactive,
  onLand,
}: {
  interactive: boolean;
  onLand: (cardId: string, slotId: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const slots = useRef<Record<string, HTMLElement | null>>({});
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const dragIdRef = useRef<string | null>(null);
  // Kept in a ref so the window listeners below subscribe ONCE per drag rather
  // than on every pointermove re-render.
  const onLandRef = useRef(onLand);
  useEffect(() => {
    onLandRef.current = onLand;
  }, [onLand]);

  const slotRef = useCallback((id: string, el: HTMLElement | null) => {
    slots.current[id] = el;
  }, []);

  const hitTest = useCallback((x: number, y: number): string | null => {
    for (const [id, el] of Object.entries(slots.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }, []);

  const startDrag = useCallback(
    (e: ReactPointerEvent<HTMLElement>, cardId: string, disabled?: boolean) => {
      if (!interactive || disabled) return;
      e.preventDefault();
      startPos.current = { x: e.clientX, y: e.clientY };
      dragIdRef.current = cardId;
      setDragId(cardId);
      setPos({ x: e.clientX, y: e.clientY });
    },
    [interactive]
  );

  useEffect(() => {
    if (dragId === null) return;

    const move = (e: PointerEvent) => setPos({ x: e.clientX, y: e.clientY });

    const up = (e: PointerEvent) => {
      const card = dragIdRef.current;
      const from = startPos.current;
      dragIdRef.current = null;
      startPos.current = null;
      setDragId(null);
      setPos(null);
      if (!card) return;

      const travelled = from
        ? Math.hypot(e.clientX - from.x, e.clientY - from.y)
        : 0;

      if (travelled < DRAG_THRESHOLD) {
        // A tap: arm this card, then the child taps where it goes.
        setSelectedId((prev) => (prev === card ? null : card));
        return;
      }

      const slot = hitTest(e.clientX, e.clientY);
      setSelectedId(null);
      if (slot) onLandRef.current(card, slot);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [dragId, hitTest]);

  const tapSlot = useCallback(
    (slotId: string) => {
      if (!interactive || !selectedId) return;
      const card = selectedId;
      setSelectedId(null);
      onLandRef.current(card, slotId);
    },
    [interactive, selectedId]
  );

  const ghost =
    dragId && pos ? (
      <div
        className="pointer-events-none fixed z-[9999] h-[74px] w-[74px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--dpl-r-sm)] border-2 border-[var(--dpl-slide-accent)] bg-white opacity-90"
        style={{ left: pos.x, top: pos.y }}
        aria-hidden="true"
      />
    ) : null;

  return { dragId, selectedId, ghost, slotRef, startDrag, tapSlot };
}

function Ctl({
  label,
  onClick,
  disabled,
  accent,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-[var(--dpl-r-sm)] border px-[14px] py-[8px] text-[12px] font-semibold transition-opacity disabled:opacity-40',
        accent
          ? 'border-[var(--dpl-slide-accent)] bg-[var(--dpl-slide-accent)] text-[var(--dpl-slide-on-accent)]'
          : 'border-[var(--dpl-slide-line)] bg-[var(--dpl-step-bg)] text-[var(--dpl-slide-ink2)]',
      ].join(' ')}
      style={{ fontFamily: 'var(--dpl-font-display)' }}
    >
      {label}
    </button>
  );
}
