'use client';

/**
 * ParentClassroomClient — the family's read-only view of the live class.
 *
 * Same composition as the teacher surface (chrome + stage + rail), driven by a
 * 2s GET poll of `/api/montree/appointments/[id]/live-state` with NO `?as=`
 * hint, so the route resolves the parent session (contract: "parent-of-this-
 * appointment OR staff, `?as=` hint like siblings").
 *
 * Read-only means read-only: no PATCH ever leaves this file, the star jar has
 * no `onAwardStar`, the toolbar is reduced to view + device controls, and the
 * chrome renders "IN CLASS" instead of End Class.
 *
 * Poll discipline:
 *   - interval cleared on unmount (and never stacked: one timer, re-armed),
 *   - 3 consecutive failures back the interval off from 2s to 5s (a flapping
 *     phone connection must not hammer the API),
 *   - `classPhase === 'ended'` stops polling for good and swaps in the
 *     end-of-class overlay with the recap link.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import ClassroomChrome from '@/components/montree/dark-phonics-live/ClassroomChrome';
import Stage from '@/components/montree/dark-phonics-live/Stage';
import Toolbar from '@/components/montree/dark-phonics-live/Toolbar';
import VideoRail from '@/components/montree/dark-phonics-live/VideoRail';
import VideoCallSlot from '@/components/montree/dark-phonics-live/VideoCallSlot';
import {
  fetchLiveState,
  DEFAULT_LIVE_STATE,
  type LiveClassState,
} from '@/components/montree/dark-phonics-live/live-state-client';
import {
  DARK_PHONICS_LESSON_COUNT,
  getLiveLessonScenes,
  lessonPictureUrl,
  type LiveLessonScene,
} from '@/lib/montree/dark-phonics/live-lesson';

const POLL_MS = 2000;
const POLL_MS_BACKOFF = 5000;
const FAILURES_BEFORE_BACKOFF = 3;
const STARS_TOTAL = 5;

type Phase = 'loading' | 'ready' | 'not-enabled' | 'error';

export interface ParentClassroomClientProps {
  appointmentId: string;
}

export default function ParentClassroomClient({ appointmentId }: ParentClassroomClientProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [state, setState] = useState<LiveClassState>(DEFAULT_LIVE_STATE);
  const [lessonNumber, setLessonNumber] = useState(1);
  const [stale, setStale] = useState(false);
  const [teacherName, setTeacherName] = useState('Teacher');

  // Mutable poll bookkeeping — refs so the timer callback never re-subscribes.
  const failuresRef = useRef(0);
  const stoppedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const poll = useCallback(async () => {
    const res = await fetchLiveState(appointmentId);
    if (stoppedRef.current) return;

    if (res.ok) {
      failuresRef.current = 0;
      setStale(false);
      setState(res.data.state);
      setLessonNumber(res.data.lessonNumber);
      setPhase('ready');
      if (res.data.state.classPhase === 'ended') stoppedRef.current = true;
      return;
    }

    if (res.status === 401 || res.status === 403) {
      stoppedRef.current = true;
      // Same landing the parent calls page uses for an expired parent session.
      router.push('/montree/parent/login');
      return;
    }
    if (res.status === 404) {
      stoppedRef.current = true;
      setPhase('not-enabled');
      return;
    }

    failuresRef.current += 1;
    if (failuresRef.current >= FAILURES_BEFORE_BACKOFF) setStale(true);
    // A transient failure must never blank a class that is already on screen.
    setPhase((p) => (p === 'loading' ? 'error' : p));
    setErrorMessage(res.error);
  }, [appointmentId, router]);

  useEffect(() => {
    stoppedRef.current = false;
    let cancelled = false;

    const tick = async () => {
      await poll();
      if (cancelled || stoppedRef.current) return;
      const delay = failuresRef.current >= FAILURES_BEFORE_BACKOFF ? POLL_MS_BACKOFF : POLL_MS;
      timerRef.current = window.setTimeout(tick, delay);
    };

    void tick();

    return () => {
      cancelled = true;
      stoppedRef.current = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [poll]);

  // Cosmetic only — the staff name for the video tile. Same existing detail
  // route the parent calls page reads; every failure keeps the generic label.
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
        const staff = (a.staff ?? a.teacher) as { name?: string } | undefined;
        const name = staff?.name || (a.staff_name as string) || (a.teacher_name as string);
        if (name && !cancelled) setTeacherName(name);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const scenes: LiveLessonScene[] = useMemo(() => getLiveLessonScenes(lessonNumber), [lessonNumber]);
  const heroFallbackUrl = useMemo(() => lessonPictureUrl(lessonNumber), [lessonNumber]);
  const sceneIndex = Math.min(Math.max(state.activeSceneIndex, 0), Math.max(scenes.length - 1, 0));

  if (phase === 'loading') return <Splash message="Joining the class…" />;
  if (phase === 'not-enabled') return <Splash message="Online Classes is not enabled." />;
  if (phase === 'error') return <Splash message={`Could not join this class. ${errorMessage}`.trim()} />;

  const sound =
    scenes.find((s): s is Extract<LiveLessonScene, { type: 'hero' }> => s.type === 'hero')?.sound ?? '';
  const ended = state.classPhase === 'ended';

  return (
    <>
      <ClassroomChrome
        lessonNumber={lessonNumber}
        sound={sound}
        // ASSUMPTION: as on the teacher surface, no `started_at` is available to
        // the client, so the clock counts from when this device joined.
        elapsedSeconds={0}
        totalLessons={DARK_PHONICS_LESSON_COUNT}
        role="parent"
        isLive={!ended}
        // no onEndClass: only the teacher may end the session
        footer={<Toolbar defaultTool="highlight" visibleTools={['highlight', 'mic', 'camera']} />}
      >
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-[var(--dpl-s3)]">
          <div className="flex items-center gap-[10px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] px-[14px] py-[9px]">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--dpl-ink3)]">
              following your teacher · slide {scenes.length === 0 ? 0 : sceneIndex + 1} / {scenes.length}
            </span>
            {stale ? (
              <span className="ml-auto text-[11px] text-[var(--dpl-danger-ink)]">
                reconnecting…
              </span>
            ) : null}
          </div>

          <Stage
            scenes={scenes}
            activeSceneIndex={sceneIndex}
            lessonNumber={lessonNumber}
            activeWordIndex={state.activeWordIndex}
            tracingStepActive={state.tracingStepActive}
            tracingCompleted={state.tracingCompleted}
            heroFallbackUrl={heroFallbackUrl}
            role="parent"
          />
        </div>

        <VideoRail
          studentSlot={
            <VideoCallSlot
              appointmentId={appointmentId}
              callerRole="parent"
              remoteDisplayName={teacherName}
            />
          }
          teacherLabel={teacherName}
          studentLabel="You"
          teacherTag="host"
          starsEarned={state.starsEarned}
          starsTotal={STARS_TOTAL}
          // read-only jar: no onAwardStar on the parent surface
        />
      </ClassroomChrome>

      {ended && <EndOfClassOverlay appointmentId={appointmentId} starsEarned={state.starsEarned} />}
    </>
  );
}

function EndOfClassOverlay({ appointmentId, starsEarned }: { appointmentId: string; starsEarned: number }) {
  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-6 text-center"
      style={{ background: 'rgba(6,6,12,0.86)', fontFamily: 'var(--dpl-font-body)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Class finished"
    >
      <div
        className="flex w-full max-w-[440px] flex-col items-center gap-[14px] rounded-[var(--dpl-r-lg)] border border-[var(--dpl-line)] bg-[var(--dpl-chrome2)] p-[26px] text-[var(--dpl-ink)]"
        style={{ boxShadow: 'var(--dpl-shadow)' }}
      >
        <h2 className="text-[20px] font-bold" style={{ fontFamily: 'var(--dpl-font-display)' }}>
          That&rsquo;s a wrap!
        </h2>
        <p className="text-[13px] leading-[1.5] text-[var(--dpl-ink2)]">
          Class is finished. {starsEarned} star{starsEarned === 1 ? '' : 's'} earned today — the recap card
          has everything you practised.
        </p>
        <Link
          href={`/montree/parent/recap/${appointmentId}`}
          className="rounded-[var(--dpl-r-sm)] border border-[var(--dpl-accent2)] px-[20px] py-[10px] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--dpl-accent2)]"
          style={{ background: 'var(--dpl-timer-bg)', fontFamily: 'var(--dpl-font-display)' }}
        >
          See today&rsquo;s recap
        </Link>
      </div>
    </div>
  );
}

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
