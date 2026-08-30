'use client';

/**
 * Book Works — Lesson 1, the first online Dark Phonics lesson.
 *
 * Pre-decodable: the child cannot read a single word yet, so nothing here is
 * spelled. It is a sock, four pictures, one phrase, six spoken questions and a
 * potato. Eight steps, walked by the teacher with Back / Next: watch the song,
 * read the book page by page, trace the letter, then the sock, the matching,
 * the phrase, the spoken questions and the twist ending.
 *
 * THREE ROLES. 'teacher' drives a live class and 'parent' mirrors it on the
 * family's device — those two split guidance from interactivity across two
 * screens. 'solo' is the parent-led lesson: ONE shared tablet, parent and
 * child side by side, so that single screen carries BOTH the child's
 * interactive surfaces AND the grown-up's controls, and the digital voice is
 * pinned OFF (the parent reads every line themselves — there is not even a
 * switch). Nothing a child touches differs between the three.
 *
 * 🚨 SILENT BY DEFAULT. `voice` is 0 unless the teacher flips the switch, and
 * while it is 0 this activity makes NO speech at all: no line read on a match,
 * no re-read on a ✗, no sound-then-word when the S is finished, and the
 * teacher's own 🔊 buttons are hidden because he says those lines himself. In
 * a live lesson the child hears their TEACHER. The switch is kept for a bad
 * connection day and for a future child-alone mode — every call site below is
 * gated on it, none removed. (The song VIDEO is not speech and keeps its own
 * sound: it is lesson media, not the digital voice.)
 *
 * TOUCH FIRST. The child's side runs on a tablet: every interactive surface
 * uses pointer events with `touch-none`, hit targets are generous, and nothing
 * needs a hover or a right-click.
 *
 * 🚨 THIS IS THE FIRST ACTIVITY THE STUDENT TOUCHES. Steps 2, 4 and 5 are
 * interactive on the PARENT device (the child drags), read-only mirrors on the
 * teacher's. Only LANDED RESULTS sync (`matched`, `drop`) — never a mid-drag
 * position, so the 2s poll is fast enough by construction. A wrong answer
 * shakes locally and is never written anywhere, and nothing the child does is
 * counted, totalled or paid for: the work itself is the whole point.
 *
 * Step 6 is deliberately NOT interactive for the child — the answer is spoken
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
  bookWorksStepTitles,
  findCard,
  splitBookLine,
  type BookCard,
  type BookWorksLesson,
} from '@/lib/montree/dark-phonics/book-works';
import { letterStrokes } from '@/lib/montree/english-curriculum/render/letter-strokes';
import { speakPhoneme, speakSentence, speakWord } from '@/lib/montree/dark-phonics/speech';
import type { LiveActivityState } from '@/lib/montree/dark-phonics/live-activities';

/** How long a local drag result outranks the polled server value. */
const OVERLAY_MS = 3000;
/** Pointer travel (px) above which a press counts as a drag, not a tap. */
const DRAG_THRESHOLD = 8;

/** The teacher's one-line note per step, parallel to BOOK_WORKS_STEP_TITLES. */
/** The same eight beats, worded for a parent sitting beside the child. */
const PARENT_NOTES: readonly string[] = [
  'Watch the video together.',
  'Read the book together, one page at a time.',
  'Help them trace the letter with a finger.',
  'Fetch the real thing — the card below tells you how.',
  'Let them drag each picture onto its twin.',
  'Read the line out loud, then let them find it.',
  'Ask the question. They answer out loud — you tap ✓ or ✗.',
  'The end of the book.',
];

const TEACHER_NOTES: readonly string[] = [
  'Let\u2019s watch the video together.',
  'Let\u2019s read a book together.',
  'We learnt the letter! Trace it with your finger.',
  'Hold the real thing up to the camera.',
  'They drag on their screen \u2014 you watch it land here.',
  'They drag on their screen \u2014 you watch it land here.',
  'They answer out loud. You mark it.',
  'The end of the book.',
];

export interface BookWorksProps {
  data: BookWorksLesson;
  state: LiveActivityState;
  role: 'teacher' | 'parent' | 'solo';
  /** Teacher / solo — the cursor (step / bookPage / round / qIndex / marks). */
  onPatch?: (patch: Partial<LiveActivityState>) => void;
  /** Parent only — the two student-owned keys. */
  onStudentPatch?: (patch: { matched?: string[]; drop?: string; trace?: number }) => void;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/**
 * Capitalise the first letter FOR DISPLAY only.
 *
 * The yes/no questions are stored exactly as the curriculum files hold them
 * ("did the ant nap?") so an audit can diff them character for character
 * against dp-<slug>.json. Sentence case is applied here, at the last possible
 * moment, because a lower-case sentence on a full-screen slide reads as a
 * typo. No word is changed, added or removed.
 */
const sentenceCase = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export default function BookWorks({ data, state, role, onPatch, onStudentPatch }: BookWorksProps) {
  const isSolo = role === 'solo';
  const isTeacher = role === 'teacher';
  /** Who sees the script cards and the grown-up's notes. */
  const showGuide = isTeacher || isSolo;
  /** Who holds Back / Next / ✓ / ✗. */
  const showControls = isTeacher || isSolo;
  /** Whose finger drives the child's surfaces. */
  const canPlay = (role === 'parent' || isSolo) && !!onStudentPatch;
  const stepTitles = useMemo(() => bookWorksStepTitles(data), [data]);
  const step = clamp(state.step ?? 0, 0, stepTitles.length - 1);
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
  const [overlay, setOverlay] = useState<
    { key: string; matched: string[]; drop: string; trace: number } | null
  >(null);
  const overlayTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (overlayTimer.current !== null) window.clearTimeout(overlayTimer.current);
    },
    []
  );

  const pushOverlay = useCallback(
    (key: string, next: { matched: string[]; drop: string; trace: number }) => {
      setOverlay({ key, ...next });
      if (overlayTimer.current !== null) window.clearTimeout(overlayTimer.current);
      overlayTimer.current = window.setTimeout(() => setOverlay(null), OVERLAY_MS);
    },
    []
  );

  const live = overlay && overlay.key === cursorKey ? overlay : null;
  const serverMatched = useMemo(() => state.matched ?? [], [state.matched]);
  const serverDrop = state.drop ?? '';
  const serverTrace = clamp(state.trace ?? 0, 0, 100);
  const matched = live ? live.matched : serverMatched;
  const drop = live ? live.drop : serverDrop;
  const trace = live ? live.trace : serverTrace;
  /** The ONE gate for every speak* call in this file. Off unless the teacher says so. */
  // 🚨 In the parent-led lesson the voice is not merely defaulted off, it is
  // PINNED off: the grown-up sitting beside the child is the voice, and there
  // is no switch to find. Every speak* call in this file is behind this flag.
  const voiceOn = !isSolo && (state.voice ?? 0) > 0;

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
    if (before === marksKey || step !== 6) return;
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
    body = <StepVideo data={data} isTeacher={showGuide} />;
  } else if (step === 1) {
    body = <StepBook data={data} page={bookPage} />;
  } else if (step === 2) {
    body = (
      // Lesson 1 keeps its bespoke snake-S (its own coordinate frame and all);
      // every other lesson traces its letter from the shared stroke library.
      data.lessonNumber === 1 ? (
        <StepTrace
          trace={trace}
          voiceOn={voiceOn}
          interactive={canPlay}
          onProgress={(pct) => pushOverlay(cursorKey, { matched, drop, trace: pct })}
          onCommit={(pct) => onStudentPatch?.({ trace: pct })}
        />
      ) : (
        <StepLetterTrace
          data={data}
          trace={trace}
          voiceOn={voiceOn}
          interactive={canPlay}
          onProgress={(pct) => pushOverlay(cursorKey, { matched, drop, trace: pct })}
          onCommit={(pct) => onStudentPatch?.({ trace: pct })}
        />
      )
    );
  } else if (step === 3) {
    body = <StepSock data={data} isTeacher={showGuide} />;
  } else if (step === 4) {
    body = (
      <StepMatch
        data={data}
        matched={matched}
        wrongId={wrongId}
        interactive={canPlay}
        onCorrect={(card) => {
          const next = matched.includes(card.id) ? matched : [...matched, card.id];
          pushOverlay(cursorKey, { matched: next, drop, trace });
          // The book, not the bare noun: finding the picture plays the page
          // the child just read ("Snake in my sock!") — when the voice is on.
          if (voiceOn) speakSentence(card.sentence);
          onStudentPatch?.({ matched: next });
        }}
        onWrong={shake}
      />
    );
  } else if (step === 5) {
    body = (
      <StepFind
        data={data}
        round={round}
        drop={drop}
        wrongId={wrongId}
        isTeacher={showGuide}
        interactive={canPlay}
        onCorrect={(card) => {
          pushOverlay(cursorKey, { matched, drop: card.id, trace });
          if (voiceOn) speakWord(card.label);
          onStudentPatch?.({ drop: card.id });
        }}
        onWrong={shake}
      />
    );
  } else if (step === 6) {
    body = <StepYesNo data={data} qIndex={qIndex} pulse={pulse} />;
  } else {
    body = <StepEnd data={data} />;
  }

  /* ----------------------------------------------------------- controls --- */

  const setStep = (next: number) => {
    const s = clamp(next, 0, stepTitles.length - 1);
    if (s === step) return;
    // Moving between steps rewinds the book to page 1 and clears the student's
    // landed answers — each step starts from a clean board, and a stale `drop`
    // from the phrase step (4) must not leak onto the next one.
    onPatch?.({ step: s, bookPage: 0, round: 0, matched: [], drop: '', trace: 0 });
  };

  const mark = (correct: boolean) => {
    const next = [...marks];
    next[qIndex] = correct ? 1 : 0;
    // "Not yet" simply asks again, calmly, before moving on — no tally, no
    // penalty, nothing kept. With the voice off the teacher re-asks it himself,
    // so the ✗ leaves only its quiet visual.
    if (!correct && voiceOn) speakSentence(data.questions[qIndex].question);
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
@keyframes bw-trace-glide { from { stroke-dashoffset: 36; } to { stroke-dashoffset: -1000; } }
.bw-trace-demo { animation: bw-trace-glide 2.8s linear infinite; }
.bw-trace-static { display: none; }
.bw-breathe { animation: bw-breathe 2.4s ease-in-out infinite; }
.bw-shake { animation: bw-shake .42s ease-in-out; }
.bw-pop { animation: bw-pop .28s ease-out; }
.bw-soft { animation: bw-soft .9s ease-out; }
@media (prefers-reduced-motion: reduce) {
  .bw-breathe, .bw-shake, .bw-pop, .bw-soft { animation: none; }
  /* No gliding light: show the numbered start arrow instead. */
  .bw-trace-demo { display: none; }
  .bw-trace-static { display: inline; }
}
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
            {stepTitles[step]}
            <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">
              {data.bookTitle}
            </span>
          </div>
          {showGuide ? (
            <div className="truncate text-[12px] italic text-[var(--dpl-slide-ink3)]">
              {(isSolo ? PARENT_NOTES : TEACHER_NOTES)[step]}
            </div>
          ) : null}
        </div>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto">{body}</div>

      {/* the grown-up's controls — teacher on the live stage, parent in solo */}
      {showControls ? (
        <div className="flex flex-wrap items-center justify-center gap-[8px]">
          <Ctl label="◀ Back" onClick={() => setStep(step - 1)} disabled={step <= 0} />
          <Ctl
            label="Next ▶"
            onClick={() => setStep(step + 1)}
            disabled={step >= stepTitles.length - 1}
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
              {voiceOn ? (
                <Ctl label="🔊 Read it" onClick={() => speakSentence(data.pages[bookPage].sentence)} />
              ) : null}
              <Ctl
                label="Back to page 1"
                onClick={() => onPatch?.({ bookPage: 0 })}
                disabled={bookPage === 0}
              />
            </>
          ) : null}

          {step === 2 ? (
            <Ctl label="Start over" onClick={() => onPatch?.({ trace: 0 })} disabled={trace === 0} />
          ) : null}

          {/* Quiet, teacher-only. Syncs because the audio it gates plays on the
              CHILD's device. Default off — and absent entirely in solo, where
              the parent beside the child is the voice. */}
          {isTeacher ? (
            <Ctl
              label={voiceOn ? 'Voice on' : 'Voice off'}
              onClick={() => onPatch?.({ voice: voiceOn ? 0 : 1 })}
            />
          ) : null}

          {step === 4 ? (
            <Ctl
              label="Start over"
              onClick={() => onPatch?.({ matched: [], drop: '' })}
              disabled={matched.length === 0}
            />
          ) : null}

          {step === 5 ? (
            <>
              {voiceOn ? (
                <Ctl label="🔊 Read it" onClick={() => speakSentence(data.rounds[round].sentence)} />
              ) : null}
              <Ctl
                label="Next picture ▶"
                onClick={() => onPatch?.({ round: Math.min(round + 1, data.rounds.length - 1), drop: '' })}
                disabled={round >= data.rounds.length - 1}
              />
              <Ctl label="Start over" onClick={() => onPatch?.({ drop: '' })} disabled={!drop} />
            </>
          ) : null}

          {step === 6 ? (
            <>
              {voiceOn ? (
                <Ctl label="🔊 Ask it" onClick={() => speakSentence(data.questions[qIndex].question)} />
              ) : null}
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

      {/* The child's ONE control: start the letter again. Their own screen, so
          it writes the student-owned key straight back. Nothing else on the
          family surface is a button. */}
      {canPlay && !isTeacher && step === 2 && trace > 0 && onStudentPatch ? (
        <div className="flex justify-center">
          <Ctl
            label="Trace again"
            onClick={() => {
              pushOverlay(cursorKey, { matched, drop, trace: 0 });
              onStudentPatch({ trace: 0 });
            }}
          />
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
  const { lead, shout } = splitBookLine(current);

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
/* Step 2 — trace the letter S                                                */
/* ========================================================================== */

/**
 * The S IS a snake, and tracing it head-to-tail IS the correct letter stroke.
 *
 * FORMATION (the reason the path is shaped exactly this way): a correctly
 * formed S starts at the TOP RIGHT, curves up and left over the top, comes
 * down through the middle, sweeps out to the right, then round the bottom and
 * finishes at the BOTTOM LEFT. The snake's head sits at the stroke's start and
 * its tail at the end — so a child who simply "follows the snake" has written
 * a correct S without being taught a single rule.
 *
 * GEOMETRY: one cubic path, reused four ways — a hidden reference copy for
 * measurement, three tapering grey segments (thick body → thin tail), and the
 * same three in snake-green clipped to the child's progress. Every stroked
 * copy carries pathLength={PATH_UNITS}, so the dash maths is in normalised
 * units and no layout measurement is ever needed.
 *
 * NO REWARDS. Completing the S plays the sound and the word — the letter
 * itself, which is the point of the exercise — and one momentary glow. There
 * is no score, no star, no "well done", and nothing is kept afterwards.
 */

/** Normalised path length: every dash number below is out of this. */
const PATH_UNITS = 1000;
/** Samples along the path used for hit-testing and progress. */
const TRACE_SAMPLES = 160;
/**
 * Hit corridor in viewBox units. The viewBox's short edge is 100, so this is
 * the required "~12% of the short edge" — generous on purpose: this is a
 * four-year-old's finger on a tablet, not a mouse.
 */
const TRACE_TOLERANCE = 12;
/** How far ahead a single move may jump — stops a tap on the tail finishing it. */
const TRACE_MAX_JUMP = Math.round(TRACE_SAMPLES * 0.1);
/** Percentage at which the stroke counts as finished. */
const TRACE_DONE_AT = 98;
/** Network throttle while the finger is moving. */
const TRACE_COMMIT_MS = 1000;

/** The S, as one cubic path: top-right → over the top → middle → bottom-left. */
const S_PATH =
  'M 72 34 C 72 16 26 14 26 38 C 26 58 44 64 52 68 C 64 74 76 82 76 100 C 76 122 30 126 24 106';

/** Tapered body: [start, end, strokeWidth] as fractions of the path. */
const S_SEGMENTS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 0.55, 16],
  [0.55, 0.82, 11.5],
  [0.82, 1, 6.5],
];

function StepTrace({
  trace,
  voiceOn,
  interactive,
  onProgress,
  onCommit,
}: {
  /** 0..100, the synced truth (student-owned; the teacher mirrors it). */
  trace: number;
  /** Digital voice allowed? Off by default — see the file header. */
  voiceOn: boolean;
  interactive: boolean;
  /** Every advance — paints locally, never touches the network. */
  onProgress: (pct: number) => void;
  /** Throttled: stroke end, at most once a second, and always at 100. */
  onCommit: (pct: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const measureRef = useRef<SVGPathElement | null>(null);
  const samplesRef = useRef<Array<{ x: number; y: number }> | null>(null);
  const lastCommitRef = useRef(0);
  const drawingRef = useRef(false);
  const [touched, setTouched] = useState(false);
  const [glow, setGlow] = useState(false);
  const glowTimer = useRef<number | null>(null);
  const sayTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (glowTimer.current !== null) window.clearTimeout(glowTimer.current);
      if (sayTimer.current !== null) window.clearTimeout(sayTimer.current);
    },
    []
  );

  /** Sample the real geometry once, lazily — nothing to measure until touched. */
  const samples = () => {
    if (samplesRef.current) return samplesRef.current;
    const el = measureRef.current;
    if (!el) return null;
    const total = el.getTotalLength();
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < TRACE_SAMPLES; i++) {
      const p = el.getPointAtLength((total * i) / (TRACE_SAMPLES - 1));
      pts.push({ x: p.x, y: p.y });
    }
    samplesRef.current = pts;
    return pts;
  };

  /** Pointer (client px) → viewBox units, so tolerance is scale-independent. */
  const toLocal = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  };

  const commit = (pct: number, flush: boolean) => {
    const now = Date.now();
    if (!flush && pct < 100 && now - lastCommitRef.current < TRACE_COMMIT_MS) return;
    lastCommitRef.current = now;
    onCommit(pct);
  };

  const advance = (e: { clientX: number; clientY: number }) => {
    const pts = samples();
    const here = toLocal(e);
    if (!pts || !here) return;

    const current = Math.round((trace / 100) * (TRACE_SAMPLES - 1));
    // Only ever look FORWARD, and only a little way forward: progress cannot
    // run backwards, and jumping a finger to the tail advances nothing.
    const limit = Math.min(TRACE_SAMPLES - 1, current + TRACE_MAX_JUMP);
    let best = -1;
    let bestDist = TRACE_TOLERANCE;
    for (let i = current; i <= limit; i++) {
      const d = Math.hypot(pts[i].x - here.x, pts[i].y - here.y);
      if (d <= bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best <= current) return;

    let pct = Math.round((best / (TRACE_SAMPLES - 1)) * 100);
    if (pct >= TRACE_DONE_AT) pct = 100;
    if (pct === trace) return;

    onProgress(pct);
    commit(pct, pct === 100);

    if (pct === 100) {
      setGlow(true);
      if (glowTimer.current !== null) window.clearTimeout(glowTimer.current);
      glowTimer.current = window.setTimeout(() => setGlow(false), 900);
      // The sound, then the word — only when the voice is on; otherwise the
      // teacher says /s/ … snake himself and the finished S is its own reply.
      // They are sequenced with a gap because speech.ts stops whatever is
      // playing before it speaks — fired together, the phoneme would be cut
      // off by the word.
      if (voiceOn) {
        speakPhoneme('s');
        if (sayTimer.current !== null) window.clearTimeout(sayTimer.current);
        sayTimer.current = window.setTimeout(() => speakWord('snake'), 900);
      }
    }
  };

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    e.preventDefault();
    setTouched(true);
    drawingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }
    advance(e);
  };

  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive || !drawingRef.current) return;
    advance(e);
  };

  /** Lifting the finger KEEPS the progress — they can pause and carry on. */
  const up = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    commit(trace, true);
  };

  const done = trace >= 100;
  const fraction = trace / 100;

  return (
    <div className="relative flex min-h-0 w-[calc(100%+60px)] flex-1 -mx-[30px] -mb-7 flex-col">
      <svg
        ref={svgRef}
        viewBox="0 0 100 150"
        preserveAspectRatio="xMidYMid meet"
        className={[
          'min-h-0 w-full flex-1 touch-none select-none',
          interactive ? 'cursor-pointer' : '',
          glow ? 'bw-soft' : '',
        ].join(' ')}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="img"
        aria-label={done ? 'the letter S, traced' : 'trace the letter S'}
      >
        {/* geometry reference — never painted, only measured */}
        <path ref={measureRef} d={S_PATH} fill="none" stroke="none" />

        {/* the un-traced snake, tapering to the tail */}
        {S_SEGMENTS.map(([from, to, w], i) => (
          <path
            key={`base-${i}`}
            d={S_PATH}
            pathLength={PATH_UNITS}
            fill="none"
            stroke="var(--dpl-slide-line)"
            strokeWidth={w}
            strokeLinecap="round"
            strokeDasharray={`${(to - from) * PATH_UNITS} ${PATH_UNITS}`}
            strokeDashoffset={-from * PATH_UNITS}
          />
        ))}

        {/* the traced part, filling in behind the finger */}
        {S_SEGMENTS.map(([from, to, w], i) => {
          const shown = clamp(fraction - from, 0, to - from);
          if (shown <= 0) return null;
          return (
            <path
              key={`fill-${i}`}
              d={S_PATH}
              pathLength={PATH_UNITS}
              fill="none"
              stroke={done ? 'var(--dpl-slide-accent-2)' : 'var(--dpl-slide-accent)'}
              strokeWidth={w}
              strokeLinecap="round"
              strokeDasharray={`${shown * PATH_UNITS} ${PATH_UNITS}`}
              strokeDashoffset={-from * PATH_UNITS}
            />
          );
        })}

        {/* direction demo: a soft light glides head → tail until first touch.
            Reduced motion swaps it for the static numbered start marker (the
            CSS at the top of this component owns that switch). */}
        {!touched && !done ? (
          <>
            <path
              className="bw-trace-demo"
              d={S_PATH}
              pathLength={PATH_UNITS}
              fill="none"
              stroke="var(--dpl-slide-accent)"
              strokeWidth={19}
              strokeLinecap="round"
              opacity={0.32}
              strokeDasharray={`36 ${PATH_UNITS}`}
            />
            <g className="bw-trace-static">
              <circle cx="88" cy="20" r="8" fill="var(--dpl-slide-accent)" />
              <text
                x="88"
                y="23.5"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="var(--dpl-slide-on-accent)"
              >
                1
              </text>
              <path
                d="M 84 27 L 76 32"
                stroke="var(--dpl-slide-accent)"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </g>
          </>
        ) : null}

        {/* the head, at the stroke's START — eyes and a forked tongue */}
        <g>
          <circle cx="72" cy="34" r="10.5" fill={trace > 0 ? 'var(--dpl-slide-accent)' : 'var(--dpl-slide-ink3)'} />
          <circle cx="69.5" cy="31" r="2.5" fill="#ffffff" />
          <circle cx="75.5" cy="31.5" r="2.5" fill="#ffffff" />
          <circle cx="69.9" cy="31.4" r="1.15" fill="#171325" />
          <circle cx="75.9" cy="31.9" r="1.15" fill="#171325" />
          <path
            d="M 82 36 L 90 38 M 90 38 L 94 35.5 M 90 38 L 94 40.5"
            stroke="#ff4d6d"
            strokeWidth="1.6"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
}

/* ========================================================================== */
/* Step 2 (lessons 2-10) — trace the letter, stroke by stroke                 */
/* ========================================================================== */

/**
 * The generic tracer, driven by the SHARED stroke library
 * (english-curriculum/render/letter-strokes.ts, viewBox 0 0 100 120). Using
 * that source rather than a second set of paths is the whole point: the shape
 * traced here is provably the same shape the printed worksheets model, so a
 * child never learns two different letters.
 *
 * MULTI-STROKE. a, t, p, n, m, d, g each have two strokes (m has three); i and
 * o have one. The child completes stroke 1 before stroke 2 becomes live, which
 * is the stroke ORDER the letter is taught in. Under the hood every stroke is
 * sampled into ONE flat array in draw order — so the monotonic-advance rule
 * that stops a finger skipping to the end of a single stroke is exactly the
 * rule that stops it skipping to the next stroke, with no extra logic.
 *
 * Sample counts are allocated in proportion to each stroke's measured length,
 * so `trace` (0-100) is honest arc-length progress across the whole letter and
 * the teacher's mirrored fill matches what the child sees.
 *
 * The book's hero picture sits at the ACTIVE stroke's first point as the
 * "start here" friend. It marks the spot; it does not follow the finger.
 *
 * i's tittle is drawn but NOT traced — it is a dot, not a stroke, and the
 * stroke library models it as `dots` rather than a path.
 */
function StepLetterTrace({
  data,
  trace,
  voiceOn,
  interactive,
  onProgress,
  onCommit,
}: {
  data: BookWorksLesson;
  trace: number;
  voiceOn: boolean;
  interactive: boolean;
  onProgress: (pct: number) => void;
  onCommit: (pct: number) => void;
}) {
  const def = letterStrokes(data.letter);
  const strokes = useMemo(() => def?.strokes ?? [], [def]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  /** Flat samples in draw order; `s` = which stroke each point belongs to. */
  const samplesRef = useRef<Array<{ x: number; y: number; s: number }> | null>(null);
  /**
   * Measured ONCE on mount, into state rather than a ref, for two reasons: the
   * render stays pure (no ref reads while rendering), and the TEACHER's mirror
   * — which never touches the SVG — still gets the numbers it needs to draw
   * the child's fill.
   */
  const [geom, setGeom] = useState<{ counts: number[]; starts: Array<{ x: number; y: number }> } | null>(
    null
  );
  const lastCommitRef = useRef(0);
  const drawingRef = useRef(false);
  const [touched, setTouched] = useState(false);
  const [glow, setGlow] = useState(false);
  const glowTimer = useRef<number | null>(null);
  const sayTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (glowTimer.current !== null) window.clearTimeout(glowTimer.current);
      if (sayTimer.current !== null) window.clearTimeout(sayTimer.current);
    },
    []
  );

  // Sample every stroke in draw order, allocating points in proportion to each
  // stroke's real length, so a flat index IS arc-length progress across the
  // whole letter. Geometry only — runs once, and never while rendering.
  useEffect(() => {
    const els = pathRefs.current.slice(0, strokes.length);
    if (els.length !== strokes.length || els.some((e) => !e)) return;
    const lengths = els.map((e) => e!.getTotalLength());
    const total = lengths.reduce((a, b) => a + b, 0);
    if (total <= 0) return;
    const pts: Array<{ x: number; y: number; s: number }> = [];
    const counts: number[] = [];
    const starts: Array<{ x: number; y: number }> = [];
    strokes.forEach((_, k) => {
      const n = Math.max(14, Math.round((TRACE_SAMPLES * lengths[k]) / total));
      counts.push(n);
      const head = els[k]!.getPointAtLength(0);
      starts.push({ x: head.x, y: head.y });
      for (let i = 0; i < n; i++) {
        const p = els[k]!.getPointAtLength((lengths[k] * i) / (n - 1));
        pts.push({ x: p.x, y: p.y, s: k });
      }
    });
    samplesRef.current = pts;
    setGeom({ counts, starts });
  }, [strokes]);

  const toLocal = (e: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: pt.x, y: pt.y };
  };

  const commit = (pct: number, flush: boolean) => {
    const now = Date.now();
    if (!flush && pct < 100 && now - lastCommitRef.current < TRACE_COMMIT_MS) return;
    lastCommitRef.current = now;
    onCommit(pct);
  };

  const advance = (e: { clientX: number; clientY: number }) => {
    const pts = samplesRef.current;
    const here = toLocal(e);
    if (!pts || !here) return;

    const current = Math.round((trace / 100) * (pts.length - 1));
    const limit = Math.min(pts.length - 1, current + Math.round(pts.length * 0.1));
    let best = -1;
    let bestDist = TRACE_TOLERANCE;
    for (let i = current; i <= limit; i++) {
      const d = Math.hypot(pts[i].x - here.x, pts[i].y - here.y);
      if (d <= bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best <= current) return;

    let pct = Math.round((best / (pts.length - 1)) * 100);
    if (pct >= TRACE_DONE_AT) pct = 100;
    if (pct === trace) return;

    onProgress(pct);
    commit(pct, pct === 100);

    if (pct === 100) {
      setGlow(true);
      if (glowTimer.current !== null) window.clearTimeout(glowTimer.current);
      glowTimer.current = window.setTimeout(() => setGlow(false), 900);
      if (voiceOn) {
        speakPhoneme(data.letter);
        if (sayTimer.current !== null) window.clearTimeout(sayTimer.current);
        sayTimer.current = window.setTimeout(() => speakWord(data.cast[0].label), 900);
      }
    }
  };

  const down = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    e.preventDefault();
    setTouched(true);
    drawingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety, not a requirement */
    }
    advance(e);
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive || !drawingRef.current) return;
    advance(e);
  };
  const up = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    commit(trace, true);
  };

  /** How far through stroke k the child is, 0..1 — from the flat sample index. */
  const strokeFraction = (k: number) => {
    if (!geom) return trace >= 100 ? 1 : 0;
    const total = geom.counts.reduce((a, b) => a + b, 0);
    const idx = (trace / 100) * (total - 1);
    const start = geom.counts.slice(0, k).reduce((a, b) => a + b, 0);
    return clamp((idx - start) / Math.max(1, geom.counts[k] - 1), 0, 1);
  };

  const activeStroke = (() => {
    for (let k = 0; k < strokes.length; k++) if (strokeFraction(k) < 1) return k;
    return strokes.length - 1;
  })();

  const done = trace >= 100;
  const hero = data.cast[0];

  if (strokes.length === 0) {
    return (
      <p className="text-[13px] text-[var(--dpl-slide-ink3)]">
        No stroke model for “{data.letter}”.
      </p>
    );
  }

  return (
    <div className="relative flex min-h-0 w-[calc(100%+60px)] flex-1 -mx-[30px] -mb-7 flex-col">
      <svg
        ref={svgRef}
        viewBox="0 0 100 120"
        preserveAspectRatio="xMidYMid meet"
        className={[
          'min-h-0 w-full flex-1 touch-none select-none',
          interactive ? 'cursor-pointer' : '',
          glow ? 'bw-soft' : '',
        ].join(' ')}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="img"
        aria-label={done ? `the letter ${data.letter}, traced` : `trace the letter ${data.letter}`}
      >
        <defs>
          <clipPath id="bw-hero-clip">
            <circle cx="0" cy="0" r="9" />
          </clipPath>
        </defs>

        {/* geometry reference — never painted, only measured */}
        {strokes.map((st, k) => (
          <path
            key={`m-${k}`}
            ref={(el) => {
              pathRefs.current[k] = el;
            }}
            d={st.d}
            fill="none"
            stroke="none"
          />
        ))}

        {/* the letter, waiting to be traced */}
        {strokes.map((st, k) => (
          <path
            key={`b-${k}`}
            d={st.d}
            fill="none"
            stroke="var(--dpl-slide-line)"
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={k === activeStroke || done ? 1 : 0.5}
          />
        ))}

        {/* filled in behind the finger, stroke by stroke */}
        {strokes.map((st, k) => {
          const f = strokeFraction(k);
          if (f <= 0) return null;
          return (
            <path
              key={`f-${k}`}
              d={st.d}
              pathLength={PATH_UNITS}
              fill="none"
              stroke={done ? 'var(--dpl-slide-accent-2)' : 'var(--dpl-slide-accent)'}
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${f * PATH_UNITS} ${PATH_UNITS}`}
            />
          );
        })}

        {/* i / j tittle — drawn, never traced (it is a dot, not a stroke) */}
        {(def?.dots ?? []).map(([cx, cy, r], i) => (
          <circle key={`d-${i}`} cx={cx} cy={cy} r={r + 2} fill={done ? 'var(--dpl-slide-accent-2)' : 'var(--dpl-slide-ink3)'} />
        ))}

        {/* direction demo on the ACTIVE stroke, until the child first touches */}
        {!touched && !done ? (
          <>
            <path
              className="bw-trace-demo"
              d={strokes[activeStroke].d}
              pathLength={PATH_UNITS}
              fill="none"
              stroke="var(--dpl-slide-accent)"
              strokeWidth={17}
              strokeLinecap="round"
              opacity={0.32}
              strokeDasharray={`36 ${PATH_UNITS}`}
            />
            <g className="bw-trace-static">
              {strokes.map((st, k) => (
                <g key={`n-${k}`}>
                  <circle cx={st.num[0]} cy={st.num[1]} r="7" fill="var(--dpl-slide-accent)" />
                  <text
                    x={st.num[0]}
                    y={st.num[1] + 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="700"
                    fill="var(--dpl-slide-on-accent)"
                  >
                    {k + 1}
                  </text>
                </g>
              ))}
            </g>
          </>
        ) : null}

        {/* the book's own character marks where this stroke starts */}
        {geom?.starts[activeStroke] && !done ? (
          <StrokeStartFriend at={geom.starts[activeStroke]} image={hero.image} label={hero.label} />
        ) : null}
      </svg>
    </div>
  );
}

/** The hero picture, round-cropped, parked on the active stroke's first point. */
function StrokeStartFriend({
  at,
  image,
  label,
}: {
  at: { x: number; y: number };
  image: string;
  label: string;
}) {
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <circle r="10.5" fill="#ffffff" stroke="var(--dpl-slide-accent)" strokeWidth="1.6" />
      <image
        href={image}
        x="-9"
        y="-9"
        width="18"
        height="18"
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#bw-hero-clip)"
      >
        <title>{label}</title>
      </image>
    </g>
  );
}

/* ========================================================================== */
/* Step 3 — the sock                                                          */
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
/* Step 4 — match the pictures                                                */
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
/* Step 5 — find the picture                                                  */
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
/* Step 6 — yes or no (spoken; the teacher marks)                             */
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
        {sentenceCase(q.question)}
      </p>
      <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--dpl-slide-ink3)]">
        question {qIndex + 1} of {data.questions.length} · say it out loud
      </p>
    </div>
  );
}

/* ========================================================================== */
/* Step 7 — the end                                                           */
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
