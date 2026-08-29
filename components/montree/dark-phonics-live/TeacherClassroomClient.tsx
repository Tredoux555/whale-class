'use client';

/**
 * TeacherClassroomClient — the teacher's live Dark Phonics classroom.
 *
 * Owns ALL of the classroom's interactivity, so the route file stays a thin
 * server shell (params + the tokens stylesheet, nothing else).
 *
 * DATA FLOW (contract, product decision 2 — polling, not websockets):
 *   - on mount: GET  /api/montree/appointments/[id]/live-state?as=teacher
 *   - every interaction: PATCH the same route, `?as=teacher`, camelCase subset.
 *   The PATCH RESPONSE IS TRUTH: every handler paints optimistically, then
 *   reconciles from the envelope the server returns. PATCHes are serialised and
 *   coalesced by `createLiveStatePatcher` so fast clicking can't reorder writes.
 *   The parent's classroom polls the same row every 2s and follows along.
 *
 * The courseware itself is local and free: `getLiveLessonScenes(lessonNumber)`
 * maps the real Dark Phonics lesson to board scenes with zero extra round-trips.
 * Only the CURSOR (which scene, which word, tracing, stars) travels over the wire.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import ClassroomChrome from '@/components/montree/dark-phonics-live/ClassroomChrome';
import Stage from '@/components/montree/dark-phonics-live/Stage';
import Toolbar from '@/components/montree/dark-phonics-live/Toolbar';
import VideoRail from '@/components/montree/dark-phonics-live/VideoRail';
import VideoCallSlot from '@/components/montree/dark-phonics-live/VideoCallSlot';
import {
  createLiveStatePatcher,
  fetchLiveState,
  DEFAULT_LIVE_STATE,
  type LiveClassState,
  type LiveStatePatch,
} from '@/components/montree/dark-phonics-live/live-state-client';
import {
  DARK_PHONICS_LESSON_COUNT,
  getLiveLesson,
  getLiveLessonScenes,
  lessonPictureUrl,
  type LiveLessonScene,
} from '@/lib/montree/dark-phonics/live-lesson';
import {
  DEFAULT_ACTIVITY_STATE,
  getWritingShelf,
  type ActivityType,
  type LiveActivityState,
} from '@/lib/montree/dark-phonics/live-activities';
import { getBookWorks } from '@/lib/montree/dark-phonics/book-works';
import { TRAY_LABELS } from '@/lib/montree/dark-phonics/writing-shelf-language';

/** How often the teacher pulls the student's landed answers during book-works. */
const STUDENT_POLL_MS = 2000;

/** Stars in a single class — matches StarJar's own default jar size. */
const STARS_TOTAL = 5;

type Phase = 'loading' | 'ready' | 'not-enabled' | 'error';

interface Names {
  /** Who the teacher is talking to — used as AgoraVideoCall's remoteDisplayName. */
  parentName: string;
  childName: string;
  recordingEnabled: boolean;
}

const DEFAULT_NAMES: Names = {
  parentName: 'Parent',
  childName: 'Student',
  recordingEnabled: false,
};

export interface TeacherClassroomClientProps {
  appointmentId: string;
}

export default function TeacherClassroomClient({ appointmentId }: TeacherClassroomClientProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [state, setState] = useState<LiveClassState>(DEFAULT_LIVE_STATE);
  const [lessonNumber, setLessonNumber] = useState<number>(1);
  const [names, setNames] = useState<Names>(DEFAULT_NAMES);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  /**
   * 🚨 The two STUDENT-OWNED cursor keys, mirrored back to the teacher.
   *
   * In the Lesson 1 book activity the CHILD drags the pictures on the family's
   * device, so `matched` / `drop` are written by that device and the server is
   * their truth. They are held here — not in `state.activityState` — so a
   * teacher click can never paint over them optimistically, and so every
   * outgoing teacher PATCH can omit them entirely (the route read-merge-writes
   * that activity's state for exactly this reason).
   */
  const [studentSync, setStudentSync] = useState<{ matched: string[]; drop: string }>({
    matched: [],
    drop: '',
  });

  // One serialised PATCH pipe per appointment, stable for the component's life.
  const patchRef = useRef<ReturnType<typeof createLiveStatePatcher> | null>(null);
  if (patchRef.current === null) patchRef.current = createLiveStatePatcher(appointmentId);

  /* ---------------------------------------------------------------- mount -- */

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchLiveState(appointmentId, 'teacher');
      if (cancelled) return;
      if (res.ok) {
        setState(res.data.state);
        setLessonNumber(res.data.lessonNumber);
        setPhase('ready');
        return;
      }
      if (res.status === 401 || res.status === 403) {
        // Same landing the dashboard calls page uses for an expired staff session.
        router.push('/montree/login');
        return;
      }
      if (res.status === 404) {
        setPhase('not-enabled');
        return;
      }
      setErrorMessage(res.error);
      setPhase('error');
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId, router]);

  // Names for the rail + the video call's remoteDisplayName. Uses the SAME
  // existing detail route the dashboard calls page uses — no new API. Entirely
  // optional: every failure path just leaves the generic labels in place.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/montree/appointments/${encodeURIComponent(appointmentId)}`, {
          credentials: 'same-origin',
        });
        if (!res.ok || cancelled) return;
        const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        const a = ((d?.appointment as Record<string, unknown>) ?? d) ?? {};
        const parent = a.parent as { name?: string } | undefined;
        const child = a.child as { name?: string } | undefined;
        if (cancelled) return;
        setNames({
          parentName: parent?.name || (a.parent_name as string) || DEFAULT_NAMES.parentName,
          childName: child?.name || (a.child_name as string) || DEFAULT_NAMES.childName,
          recordingEnabled: !!a.recording_enabled,
        });
      } catch {
        /* names are cosmetic — never block the class on them */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  /* --------------------------------------------------------------- scenes -- */

  const scenes: LiveLessonScene[] = useMemo(() => getLiveLessonScenes(lessonNumber), [lessonNumber]);
  const lesson = useMemo(() => getLiveLesson(lessonNumber), [lessonNumber]);
  const heroFallbackUrl = useMemo(() => lessonPictureUrl(lessonNumber), [lessonNumber]);

  const sceneIndex = Math.min(Math.max(state.activeSceneIndex, 0), Math.max(scenes.length - 1, 0));
  const activeScene = scenes[sceneIndex];
  const activeWords =
    activeScene &&
    (activeScene.type === 'word-chips' ||
      activeScene.type === 'decodable-words' ||
      activeScene.type === 'heart-words')
      ? activeScene.words
      : null;

  /* -------------------------------------------------------------- mutation -- */

  /** Paint optimistically, then let the PATCH response overwrite it (truth). */
  const mutate = useCallback(
    async (patch: LiveStatePatch) => {
      setState((s) => ({ ...s, ...patch }));
      const send = patchRef.current;
      if (!send) return;
      const res = await send(patch);
      if (res.ok) {
        setState(res.data.state);
        setLessonNumber(res.data.lessonNumber);
        if (res.data.state.activityType === 'book-works') {
          setStudentSync({
            matched: res.data.state.activityState.matched ?? [],
            drop: res.data.state.activityState.drop ?? '',
          });
        }
        setSyncWarning(null);
      } else {
        // Surface the real reason (the route's own message) — a silent generic
        // banner hides things like a CHECK constraint refusing a new activity
        // type because its migration has not been run yet.
        setSyncWarning(`Not syncing to the parent right now — ${res.error}`);
      }
    },
    []
  );

  const goToScene = useCallback(
    (next: number) => {
      if (scenes.length === 0) return;
      const clamped = Math.min(Math.max(next, 0), scenes.length - 1);
      if (clamped === sceneIndex) return;
      // Moving slide resets the word cursor — a chip highlighted on the old
      // slide would point at nothing on the new one.
      void mutate({ activeSceneIndex: clamped, activeWordIndex: -1 });
    },
    [mutate, sceneIndex, scenes.length]
  );

  const advanceWord = useCallback(() => {
    if (!activeWords || activeWords.length === 0) return;
    const next = state.activeWordIndex + 1 >= activeWords.length ? -1 : state.activeWordIndex + 1;
    void mutate({ activeWordIndex: next });
  }, [activeWords, mutate, state.activeWordIndex]);

  const toggleTracing = useCallback(() => {
    void mutate({ tracingStepActive: !state.tracingStepActive });
  }, [mutate, state.tracingStepActive]);

  const bumpTracing = useCallback(
    (delta: number) => {
      const next = Math.max(0, state.tracingCompleted + delta);
      void mutate({ tracingCompleted: next });
    },
    [mutate, state.tracingCompleted]
  );

  const awardStar = useCallback(() => {
    if (state.starsEarned >= STARS_TOTAL) return;
    void mutate({ starsEarned: state.starsEarned + 1 });
  }, [mutate, state.starsEarned]);

  /* ------------------------------------------------------- writing shelf -- */

  // The four digitised trays for THIS lesson (null = not enough words yet).
  const shelf = useMemo(() => getWritingShelf(lessonNumber), [lessonNumber]);
  // Lesson 1's letter-book activity — null on every lesson that has no book
  // content authored yet, which disables (never hides) the picker button.
  const bookWorks = useMemo(() => getBookWorks(lessonNumber), [lessonNumber]);

  /** Put a tray on the stage (fresh cursor) or 'none' to go back to slides.
   *  The Tray-5 sentence FOLLOWS onto Tray 8 — the shelf's own rule ("6
   *  sentence strips the children built on Tray 5" live on the grammar tray). */
  const setActivity = useCallback(
    (type: ActivityType) => {
      if (type === state.activityType) return;
      if (type === 'book-works') {
        setStudentSync({ matched: [], drop: '' });
        void mutate({
          activityType: type,
          activityState: { ...DEFAULT_ACTIVITY_STATE, step: 0, round: 0, qIndex: 0, marks: [], matched: [], drop: '' },
        });
        return;
      }
      const carry =
        type === 'grammar-symbols' &&
        state.activityType === 'sentence-builder' &&
        (state.activityState.laid?.length ?? 0) > 0
          ? { laid: state.activityState.laid, punct: state.activityState.punct }
          : {};
      void mutate({ activityType: type, activityState: { ...DEFAULT_ACTIVITY_STATE, ...carry } });
    },
    [mutate, state.activityType, state.activityState]
  );

  /** Merge a partial cursor; the route stores the full object wholesale. */
  const patchActivity = useCallback(
    (patch: Partial<LiveActivityState>) => {
      if (state.activityType !== 'book-works') {
        void mutate({ activityState: { ...state.activityState, ...patch } });
        return;
      }
      // book-works: never send matched/drop unless THIS patch explicitly sets
      // THAT key (the Reset / step-change controls) — the two keys are tracked
      // independently. Resending the other one from the local `studentSync`
      // cache would clobber a match the child landed moments ago with a
      // snapshot that can be up to STUDENT_POLL_MS stale (e.g. "Next picture"
      // only means to clear `drop`; it must never also re-assert a stale
      // `matched`). The route merges whichever key we omit.
      const hasMatched = 'matched' in patch;
      const hasDrop = 'drop' in patch;
      const next: Partial<LiveActivityState> = { ...state.activityState, ...patch };
      if (hasMatched) {
        next.matched = patch.matched ?? [];
      } else {
        delete next.matched;
      }
      if (hasDrop) {
        next.drop = patch.drop ?? '';
      } else {
        delete next.drop;
      }
      if (hasMatched || hasDrop) {
        setStudentSync((prev) => ({
          matched: hasMatched ? (patch.matched ?? []) : prev.matched,
          drop: hasDrop ? (patch.drop ?? '') : prev.drop,
        }));
      }
      void mutate({ activityState: next as LiveActivityState });
    },
    [mutate, state.activityState, state.activityType]
  );

  /* --------------------------------------------- student answers poll ----- */
  // Only while the book activity is on the stage: everything else on this
  // surface is teacher-driven and needs no read-back.
  const bookWorksLive = state.activityType === 'book-works' && state.classPhase === 'live';
  useEffect(() => {
    if (!bookWorksLive) return;
    let cancelled = false;
    const tick = async () => {
      const res = await fetchLiveState(appointmentId, 'teacher');
      if (cancelled || !res.ok) return;
      if (res.data.state.activityType !== 'book-works') return;
      // ONLY these two keys are taken from the server — the teacher's own
      // cursor (step / round / qIndex / marks) stays local and authoritative.
      setStudentSync({
        matched: res.data.state.activityState.matched ?? [],
        drop: res.data.state.activityState.drop ?? '',
      });
    };
    const timer = window.setInterval(() => void tick(), STUDENT_POLL_MS);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [appointmentId, bookWorksLive]);

  /** What the stage actually renders: the teacher's cursor + the child's answers. */
  const stageActivityState = useMemo<LiveActivityState>(
    () =>
      state.activityType === 'book-works'
        ? { ...state.activityState, matched: studentSync.matched, drop: studentSync.drop }
        : state.activityState,
    [state.activityType, state.activityState, studentSync]
  );

  /* ------------------------------------------------------------- end class -- */

  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  const finishClass = useCallback(
    async (wordsDrilled: string[], teacherNote: string) => {
      setEnding(true);
      setEndError(null);
      try {
        const res = await fetch(`/api/montree/appointments/${encodeURIComponent(appointmentId)}/recap`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonNumber,
            wordsDrilled,
            starsEarned: state.starsEarned,
            teacherNote,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
          setEndError(j?.message || j?.error || `Could not save the recap (${res.status}).`);
          setEnding(false);
          return;
        }
        // Recap is saved — flipping the phase is what stops the parent's poll
        // and shows them the end-of-class card, so it comes second on purpose.
        const send = patchRef.current;
        if (send) await send({ classPhase: 'ended' });
        router.push('/montree/dashboard/online-classes');
      } catch (err) {
        setEndError(err instanceof Error ? err.message : 'Could not end the class.');
        setEnding(false);
      }
    },
    [appointmentId, lessonNumber, router, state.starsEarned]
  );

  /* ---------------------------------------------------------------- render -- */

  if (phase === 'loading') return <Splash message="Opening the classroom…" />;
  if (phase === 'not-enabled') return <Splash message="Online Classes is not enabled." />;
  if (phase === 'error') {
    return <Splash message={`Could not open this class. ${errorMessage}`.trim()} />;
  }

  const sound =
    scenes.find((s): s is Extract<LiveLessonScene, { type: 'hero' }> => s.type === 'hero')?.sound ??
    lesson?.sound ??
    '';

  return (
    <>
      <ClassroomChrome
        lessonNumber={lessonNumber}
        sound={sound}
        // ASSUMPTION: no appointment `started_at` is exposed to this client, and
        // the brief forbids inventing an API for it — so the clock starts at 0
        // on mount and ClassroomChrome ticks it locally. A mid-class refresh
        // therefore restarts the displayed timer; it is display-only and never
        // written anywhere.
        elapsedSeconds={0}
        totalLessons={DARK_PHONICS_LESSON_COUNT}
        role="teacher"
        isLive={state.classPhase === 'live'}
        onEndClass={() => setEndOpen(true)}
        footer={<Toolbar defaultTool="pen" />}
      >
        <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-[var(--dpl-s3)]">
          <SceneNav
            sceneIndex={sceneIndex}
            sceneCount={scenes.length}
            hasWords={!!activeWords?.length}
            wordIndex={state.activeWordIndex}
            wordCount={activeWords?.length ?? 0}
            tracingStepActive={state.tracingStepActive}
            tracingCompleted={state.tracingCompleted}
            warning={syncWarning}
            onPrev={() => goToScene(sceneIndex - 1)}
            onNext={() => goToScene(sceneIndex + 1)}
            onAdvanceWord={advanceWord}
            onToggleTracing={toggleTracing}
            onTracingDelta={bumpTracing}
          />

          <WritingShelfNav
            shelf={shelf}
            hasBookWorks={!!bookWorks}
            activeType={state.activityType}
            onPick={setActivity}
          />

          <Stage
            scenes={scenes}
            activeSceneIndex={sceneIndex}
            lessonNumber={lessonNumber}
            activeWordIndex={state.activeWordIndex}
            tracingStepActive={state.tracingStepActive}
            tracingCompleted={state.tracingCompleted}
            heroFallbackUrl={heroFallbackUrl}
            role="teacher"
            activityType={state.activityType}
            activityState={stageActivityState}
            onActivityPatch={patchActivity}
          />
        </div>

        <VideoRail
          teacherSlot={
            <VideoCallSlot
              appointmentId={appointmentId}
              callerRole="teacher"
              remoteDisplayName={names.parentName}
              recordingEnabledForAppointment={names.recordingEnabled}
            />
          }
          teacherLabel="You"
          studentLabel={names.childName}
          teacherTag="host"
          starsEarned={state.starsEarned}
          starsTotal={STARS_TOTAL}
          onAwardStar={awardStar}
          // ASSUMPTION: the physical 3D-printed "at home" kit has no per-lesson
          // data source anywhere in the repo, so the chip is omitted rather than
          // invented. Pass `atHomeItem` here once that data exists.
        />
      </ClassroomChrome>

      {endOpen && (
        <EndClassDialog
          lessonNumber={lessonNumber}
          starsEarned={state.starsEarned}
          defaultWords={[...(lesson?.words ?? []), ...(lesson?.decodable ?? [])]}
          busy={ending}
          error={endError}
          onCancel={() => {
            if (!ending) setEndOpen(false);
          }}
          onConfirm={finishClass}
        />
      )}
    </>
  );
}

/* ========================================================================== */
/* Writing Shelf strip — teacher-only tray picker (trays 1–4, migration 341)   */
/* ========================================================================== */

function WritingShelfNav({
  shelf,
  hasBookWorks,
  activeType,
  onPick,
}: {
  shelf: ReturnType<typeof getWritingShelf>;
  /** Lesson 1's letter-book activity exists for this lesson. */
  hasBookWorks: boolean;
  activeType: ActivityType;
  onPick: (type: ActivityType) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[14px] py-[10px]"
      style={{ boxShadow: 'var(--dpl-shadow)' }}
    >
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">writing shelf</span>

      <NavButton label="Slides" onClick={() => onPick('none')} active={activeType === 'none'} />

      {/* The letter-book lesson. Not a shelf tray (it teaches before any word
          is decodable), so it sits beside Slides rather than inside the strip. */}
      <NavButton
        label="📖 Book"
        onClick={() => onPick('book-works')}
        active={activeType === 'book-works'}
        disabled={!hasBookWorks}
      />

      {shelf.map(({ type, activity }, i) => (
        <NavButton
          key={type}
          label={`${i + 1} · ${TRAY_LABELS[type]}`}
          onClick={() => onPick(type)}
          active={activeType === type}
          disabled={!activity}
        />
      ))}
    </div>
  );
}

/* ========================================================================== */
/* Scene navigation — teacher-only, lives here (not in Stage) so Stage stays a */
/* pure presenter shared with the read-only parent surface.                    */
/* ========================================================================== */

function SceneNav({
  sceneIndex,
  sceneCount,
  hasWords,
  wordIndex,
  wordCount,
  tracingStepActive,
  tracingCompleted,
  warning,
  onPrev,
  onNext,
  onAdvanceWord,
  onToggleTracing,
  onTracingDelta,
}: {
  sceneIndex: number;
  sceneCount: number;
  hasWords: boolean;
  wordIndex: number;
  wordCount: number;
  tracingStepActive: boolean;
  tracingCompleted: number;
  warning: string | null;
  onPrev: () => void;
  onNext: () => void;
  onAdvanceWord: () => void;
  onToggleTracing: () => void;
  onTracingDelta: (delta: number) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[14px] py-[10px]"
      style={{ boxShadow: 'var(--dpl-shadow)' }}
    >
      <NavButton label="◀ Prev" onClick={onPrev} disabled={sceneIndex <= 0} />
      <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
        slide {sceneCount === 0 ? 0 : sceneIndex + 1} / {sceneCount}
      </span>
      <NavButton label="Next ▶" onClick={onNext} disabled={sceneCount === 0 || sceneIndex >= sceneCount - 1} />

      <span className="mx-1 h-[18px] w-px bg-[var(--dpl-line)]" />

      <NavButton
        label={wordIndex < 0 ? 'Point at word 1' : wordIndex + 1 >= wordCount ? 'Clear word' : `Next word (${wordIndex + 2}/${wordCount})`}
        onClick={onAdvanceWord}
        disabled={!hasWords}
      />

      <span className="mx-1 h-[18px] w-px bg-[var(--dpl-line)]" />

      <NavButton label={tracingStepActive ? 'Tracing: on' : 'Tracing: off'} onClick={onToggleTracing} active={tracingStepActive} />
      <NavButton label="−" onClick={() => onTracingDelta(-1)} disabled={!tracingStepActive || tracingCompleted <= 0} />
      <span className="text-[11px] tabular-nums text-[var(--dpl-ink2)]">{tracingCompleted} done</span>
      <NavButton label="+" onClick={() => onTracingDelta(1)} disabled={!tracingStepActive} />

      {warning ? <span className="ml-auto text-[11px] text-[var(--dpl-danger-ink)]">{warning}</span> : null}
    </div>
  );
}

function NavButton({
  label,
  onClick,
  disabled,
  active,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'rounded-[var(--dpl-r-sm)] border px-[12px] py-[7px] text-[11.5px] font-semibold transition-opacity disabled:opacity-40',
        active
          ? 'border-[var(--dpl-accent2)] text-[var(--dpl-accent2)]'
          : 'border-[var(--dpl-line)] text-[var(--dpl-ink2)]',
      ].join(' ')}
      style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
    >
      {label}
    </button>
  );
}

/* ========================================================================== */
/* End-of-class dialog                                                         */
/* ========================================================================== */

function EndClassDialog({
  lessonNumber,
  starsEarned,
  defaultWords,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  lessonNumber: number;
  starsEarned: number;
  defaultWords: string[];
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (wordsDrilled: string[], teacherNote: string) => void;
}) {
  const [words, setWords] = useState(() => Array.from(new Set(defaultWords)).join(', '));
  const [note, setNote] = useState('');

  const parsedWords = words
    .split(/[,\n]/)
    .map((w) => w.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-6"
      style={{ background: 'rgba(6,6,12,0.78)', fontFamily: 'var(--dpl-font-body)' }}
      role="dialog"
      aria-modal="true"
      aria-label="End class"
    >
      <div
        className="flex w-full max-w-[520px] flex-col gap-[14px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] p-[22px] text-[var(--dpl-ink)]"
        style={{ boxShadow: 'var(--dpl-shadow)' }}
      >
        <div>
          <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--dpl-font-display)' }}>
            End class · Lesson {lessonNumber}
          </h2>
          <p className="mt-1 text-[12.5px] text-[var(--dpl-ink2)]">
            This closes the session and writes the parent&rsquo;s recap card. {starsEarned} star
            {starsEarned === 1 ? '' : 's'} will be saved.
          </p>
        </div>

        <label className="flex flex-col gap-[6px]">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--dpl-ink3)]">Words drilled</span>
          <textarea
            value={words}
            onChange={(e) => setWords(e.target.value)}
            rows={3}
            className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[11px] py-[9px] text-[13px] text-[var(--dpl-ink)]"
            style={{ background: 'var(--dpl-timer-bg)' }}
          />
          <span className="text-[11px] text-[var(--dpl-ink3)]">
            Comma separated — prefilled from the lesson. {parsedWords.length} word
            {parsedWords.length === 1 ? '' : 's'}.
          </span>
        </label>

        <label className="flex flex-col gap-[6px]">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-[var(--dpl-ink3)]">Note for the parent</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="One or two sentences the parent will read tonight."
            className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[11px] py-[9px] text-[13px] text-[var(--dpl-ink)]"
            style={{ background: 'var(--dpl-timer-bg)' }}
          />
        </label>

        {error ? <p className="text-[12px] text-[var(--dpl-danger-ink)]">{error}</p> : null}

        <div className="flex justify-end gap-[10px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-line)] px-[16px] py-[9px] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--dpl-ink2)] disabled:opacity-50"
            style={{ background: 'var(--dpl-timer-bg)' }}
          >
            Keep teaching
          </button>
          <button
            type="button"
            onClick={() => onConfirm(parsedWords, note.trim())}
            disabled={busy}
            className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-danger-line)] px-[18px] py-[9px] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--dpl-danger-ink)] disabled:opacity-60"
            style={{ background: 'var(--dpl-danger-grad)', fontFamily: 'var(--dpl-font-display)' }}
          >
            {busy ? 'Saving…' : 'End class'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */

function Splash({ message }: { message: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[var(--dpl-chrome)] px-6 text-center text-[14px] text-[var(--dpl-ink2)]"
      style={{ fontFamily: 'var(--dpl-font-body)' }}
    >
      {message}
    </div>
  );
}
