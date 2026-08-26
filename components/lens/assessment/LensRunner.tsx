'use client';

/**
 * Montree Lens — the milestone check-in runner.
 *
 * 🚨 THIS IS A SHELL, NOT A SECOND RUNNER. Every part of the sitting a child
 * touches — the item stage, the tap guard, the stimulus art, the observation
 * checklist, the guide character, the hold-to-open teacher control — is the
 * Montree component, imported directly from components/montree/evaluation/*.
 * Those files are presentation-pure: they import the bank types, the projection
 * type and the pure runner engine, and nothing else. Re-implementing them for
 * Lens would produce two instruments that look alike and drift apart.
 *
 * What IS Lens's own, and why:
 *   • Setup happens BEFORE this component. In Montree the runner opens with a
 *     configuration screen because the teacher starts it from a child's profile;
 *     in Lens the observer has already picked school, room, alias and band on
 *     /lens/assessment/new, so the session row exists and the runner starts
 *     running. There is deliberately no name field anywhere on this screen.
 *   • No i18n. app/lens is hardcoded English (see app/lens/layout.tsx); every
 *     label below is a plain string rather than a t() key.
 *   • The flush target is the Lens API, and the queue is its own — Montree's
 *     runner-storage hardcodes /api/montree/… and shares a localStorage prefix,
 *     so reusing it would post a Lens sitting to the wrong product.
 *
 * The child-facing surface keeps the WARM CREAM palette (tokens.ts `C`), not the
 * dark Lens palette. That is not an oversight: a three-year-old meets this
 * full-screen in a sunlit classroom, and the printed packs use the same
 * cream/ink pairing so paper and screen look like one thing. Lens's dark chrome
 * resumes the moment the sitting ends.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Band } from '@/lib/montree/evaluation/types';
import type { ProjectedBank } from '@/lib/montree/evaluation/bank-projection';
import {
  advance, answeredCount, buildRunnerIndex, createRun, currentItem, currentStep, endEarly,
  finish, progressDots, recordObservation, recordResponse, toObservationPayload, toRawResponses,
  type RunnerIndex, type RunState,
} from '@/lib/montree/evaluation/runner-engine';
import { GuideCharacter } from '@/components/montree/evaluation/GuideCharacter';
import { useSpeech } from '@/components/montree/evaluation/useSpeech';
import { bankText } from '@/components/montree/evaluation/localized';
import { C, SANS, SERIF } from '@/components/montree/evaluation/tokens';
import { ItemStage, type ItemAnswer } from '@/components/montree/evaluation/runner/ItemStage';
import { ObservationPanel } from '@/components/montree/evaluation/runner/ObservationPanel';
import { HoldButton } from '@/components/montree/evaluation/runner/HoldButton';
import { lensApi, LensApiError } from '@/lib/lens/client';

/* ─────────────────────────────────────────────────────────────── constants */

/** Send in the background every few answers; the rest of the queue at the close. */
const FLUSH_EVERY = 4;
const SNAPSHOT_PREFIX = 'ln.assess.';

export interface LensRunnerSession {
  id: string;
  child_alias: string;
  age_band: string;
  form_code: string;
  modules: string[];
  child_age_months: number | null;
  school_year: string;
  window_code: string;
}

const ITEM_LABELS = {
  practice: 'Let’s try one together',
  replay: 'Say it again',
  showScript: 'Show the words',
  hideScript: 'Hide the words',
  teacherScript: 'Read this aloud',
  sequenceHint: 'Tap them in order',
  sequenceDone: 'Done',
  soundNone: 'No voice on this device — read the words aloud.',
  teacherOnly: 'For you, not the child',
  thankYou: 'Thank you.',
};

const OBSERVATION_LABELS = {
  title: 'What you have already seen',
  intro:
    'These cannot be sampled by tapping pictures. Rate them from the work you watched in the room. ' +
    'Best fit, not a tally — and leaving one blank is a real answer.',
  whichFits: 'Which of these fits best?',
  done: 'Finish the check-in',
  progress: (done: number, total: number) => `${done} of ${total} rated`,
  bandLabels: { emerging: 'Emerging', developing: 'Developing', secure: 'Secure' } as Record<Band, string>,
  note: 'Add a note',
};

/* ───────────────────────────────────────────────────────────── small parts */

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60, overflowY: 'auto',
      background: C.cream, color: C.ink, fontFamily: SANS,
      paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {children}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '70dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 16, textAlign: 'center', padding: '24px 22px 60px',
    }}>
      {children}
    </div>
  );
}

function PrimaryButton({ onClick, children, wide }: { onClick: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 64, padding: '14px 32px', borderRadius: 18, border: `2px solid ${C.forest}`,
        background: C.forest, color: '#fff', fontFamily: SANS, fontSize: 17, fontWeight: 700,
        cursor: 'pointer', touchAction: 'manipulation', width: wide ? '100%' : undefined,
        maxWidth: wide ? 420 : undefined,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 56, padding: '12px 24px', borderRadius: 16, border: `2px solid ${C.sandDark}`,
        background: C.paper, color: C.ink, fontFamily: SANS, fontSize: 15, fontWeight: 600,
        cursor: 'pointer', touchAction: 'manipulation',
      }}
    >
      {children}
    </button>
  );
}

/* ───────────────────────────────────────────────────────────── the runner */

export function LensRunner({ session }: { session: LensRunnerSession }) {
  const router = useRouter();
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  const bankRef = useRef<ProjectedBank | null>(null);
  const indexRef = useRef<RunnerIndex | null>(null);
  const runRef = useRef<RunState | null>(null);
  const syncedRef = useRef<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [scriptOpen, setScriptOpen] = useState(true);
  const [audioOn, setAudioOn] = useState(false);

  const speech = useSpeech('en-GB');
  const speak = useCallback(
    (text: string, lang?: string) => speech.speak(text, lang),
    [speech],
  );

  /* ------------------------------------------------- snapshot (reload safety) */

  const snapshotKey = `${SNAPSHOT_PREFIX}${session.id}`;

  const persist = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    try {
      window.localStorage.setItem(snapshotKey, JSON.stringify({ v: 1, run, synced: syncedRef.current }));
    } catch {
      // A blocked or full localStorage is survivable: the queue still flushes to
      // the server every few answers. It is never allowed to end the sitting.
    }
  }, [snapshotKey]);

  const clearSnapshot = useCallback(() => {
    try { window.localStorage.removeItem(snapshotKey); } catch { /* nothing to do */ }
  }, [snapshotKey]);

  /* ---------------------------------------------------------------- loading */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const query = new URLSearchParams({
          ageBand: session.age_band,
          formCode: session.form_code,
          modules: (session.modules ?? []).join(','),
        });
        const data = await lensApi<{ bank: ProjectedBank }>(`/api/lens/assessment/bank?${query}`);
        if (cancelled) return;

        const bank = data.bank;
        const index = buildRunnerIndex(bank);
        bankRef.current = bank;
        indexRef.current = index;

        // A reload mid-sitting resumes rather than restarting. The snapshot is
        // only ever trusted when it was written against this same bank version —
        // otherwise the step list it holds may point at items that no longer
        // exist, which would be worse than starting again.
        let restored: RunState | null = null;
        try {
          const raw = window.localStorage.getItem(snapshotKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { run?: RunState; synced?: string[] };
            if (parsed?.run && parsed.run.bankVersion === bank.bankVersion) {
              restored = parsed.run;
              syncedRef.current = parsed.synced ?? [];
            }
          }
        } catch { /* a corrupt snapshot is simply ignored */ }

        runRef.current = restored ?? createRun(bank, index, {
          childId: session.id,   // the engine only uses this as a snapshot label
          ageBand: session.age_band as RunState['config']['ageBand'],
          ageMonths: session.child_age_months,
          formCode: session.form_code as RunState['config']['formCode'],
          windowCode: session.window_code as RunState['config']['windowCode'],
          schoolYear: session.school_year,
          moduleIds: session.modules ?? [],
          assessmentLocale: 'en',
        });
        runRef.current.sessionId = session.id;
        setLoading(false);
        redraw();
      } catch (err) {
        if (cancelled) return;
        setFatal(err instanceof LensApiError ? err.message : 'Could not load the check-in.');
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  /* ------------------------------------------------------------- the queue */

  const flush = useCallback(async (silent = true) => {
    const run = runRef.current;
    if (!run) return true;
    const already = new Set(syncedRef.current);
    const responses = toRawResponses(run).filter((r) => !already.has(r.itemId));
    const observations = toObservationPayload(run);
    if (!responses.length && !observations.length) { setPending(0); return true; }

    setSending(true);
    try {
      await lensApi(`/api/lens/assessment/sessions/${session.id}/items`, {
        method: 'POST',
        json: { responses, observations },
      });
      // Re-sending is safe — the endpoint upserts on (session_id, item_id) — so
      // the acknowledged set is only ever grown, never used to withhold a row.
      const merged = new Set(already);
      for (const r of responses) merged.add(r.itemId);
      syncedRef.current = [...merged];
      setPending(0);
      setSendError(null);
      persist();
      return true;
    } catch (err) {
      setPending(responses.length);
      if (!silent) setSendError(err instanceof LensApiError ? err.message : 'Could not send those answers.');
      return false;
    } finally {
      setSending(false);
    }
  }, [session.id, persist]);

  /* ------------------------------------------------------------- finishing */

  const finishRun = useCallback(async () => {
    const run = runRef.current;
    if (!run) return;
    finish(run);
    persist();
    setSending(true);
    setSendError(null);
    try {
      // Everything still owed goes first: /complete re-scores from what the
      // server has, so an answer that never arrived is an answer that never
      // counted.
      const flushed = await flush(false);
      if (!flushed) { setSending(false); return; }
      await lensApi(`/api/lens/assessment/sessions/${session.id}/complete`, {
        method: 'POST',
        json: { durationSeconds: run.durationSeconds ?? null, status: 'completed' },
      });
      clearSnapshot();
      router.replace(`/lens/assessment/results/${session.id}`);
    } catch (err) {
      setSendError(err instanceof LensApiError ? err.message : 'Could not finish the check-in.');
      setSending(false);
    }
  }, [flush, persist, clearSnapshot, router, session.id]);

  /* --------------------------------------------------------------- actions */

  const onItemComplete = useCallback((answer: ItemAnswer | null) => {
    const run = runRef.current;
    const index = indexRef.current;
    const bank = bankRef.current;
    if (!run || !index || !bank) return;

    const item = currentItem(run, index);
    if (answer && item) recordResponse(index, run, item, answer);

    const outcome = advance(bank, index, run);
    persist();
    redraw();

    if (answer) {
      const answered = answeredCount(run);
      setPending(Math.max(0, answered - syncedRef.current.length));
      if (answered % FLUSH_EVERY === 0) void flush(true);
    }
    if (outcome.next === 'close') void finishRun();
  }, [flush, finishRun, persist]);

  const startModule = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    run.phase = currentStep(run)?.kind === 'practice' ? 'practice' : 'item';
    redraw();
  }, []);

  const finishNow = useCallback(() => {
    const run = runRef.current;
    const index = indexRef.current;
    if (!run || !index) return;
    endEarly(index, run, 'observer_ended');
    if ((run.config.moduleIds ?? []).includes('M-OBS') && run.phase !== 'observation') {
      run.phase = 'observation';
      persist();
      redraw();
      return;
    }
    void finishRun();
  }, [finishRun, persist]);

  const enableAudio = useCallback(() => {
    void speech.enable().then((ok) => { setAudioOn(ok); if (ok) setScriptOpen(false); });
  }, [speech]);

  /* ---------------------------------------------------------------- render */

  const run = runRef.current;
  const index = indexRef.current;
  const bank = bankRef.current;

  const dots = useMemo(() => (run ? progressDots(run) : []), [run, run?.stepIndex, run?.steps]);

  if (loading) {
    return (
      <FullScreen>
        <Centered>
          <GuideCharacter size={140} />
          <p style={{ fontFamily: SERIF, fontSize: 20 }}>Getting the materials ready…</p>
        </Centered>
      </FullScreen>
    );
  }

  if (fatal || !run || !index || !bank) {
    return (
      <FullScreen>
        <Centered>
          <h1 style={{ fontFamily: SERIF, fontSize: 24 }}>This check-in can’t start</h1>
          <p style={{ color: C.inkSoft, maxWidth: 460, lineHeight: 1.6 }}>{fatal ?? 'Something went wrong.'}</p>
          <PrimaryButton onClick={() => router.replace('/lens/assessment')}>Back to check-ins</PrimaryButton>
        </Centered>
      </FullScreen>
    );
  }

  // Teacher chrome. It sits ABOVE the stage, never inside it: the child sees no
  // progress bar, no timer and no running total (ARCHITECTURE.md §6-D2).
  const chrome = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '10px 16px', borderBottom: `1px solid ${C.line}`, background: C.paper,
    }}>
      <span style={{ fontSize: 12.5, color: C.inkSoft }}>
        {session.child_alias} · {session.age_band} · Form {session.form_code}
      </span>
      <span style={{ display: 'flex', gap: 3, flex: 1, minWidth: 80 }}>
        {dots.map((d, i) => (
          <span
            key={i}
            style={{
              width: 6, height: 6, borderRadius: 999,
              background: d === 'now' ? C.forest : d === 'done' ? C.moss : d === 'skip' ? C.sandDark : C.line,
            }}
          />
        ))}
      </span>
      {!audioOn && (
        <button
          type="button"
          onClick={enableAudio}
          style={{
            minHeight: 40, padding: '6px 14px', borderRadius: 999, border: `1px solid ${C.sandDark}`,
            background: C.paper, color: C.ink, fontSize: 12.5, cursor: 'pointer',
          }}
        >
          Turn on voice
        </button>
      )}
      {(pending > 0 || sending) && (
        <span style={{ fontSize: 12, color: C.clay }}>
          {sending ? 'Saving…' : `${pending} not saved yet`}
        </span>
      )}
      <HoldButton onHold={finishNow} label="Finish" hint="hold" />
    </div>
  );

  /* ---- module intro ---- */
  if (run.phase === 'intro') {
    const mod = index.moduleById.get(run.directModules[run.moduleIndex]);
    const name = bankText(mod?.name, 'en');
    return (
      <FullScreen>
        {chrome}
        <Centered>
          <GuideCharacter size={170} />
          <h1 style={{ fontFamily: SERIF, fontSize: 28, margin: 0 }}>{name}</h1>
          <p style={{ fontFamily: SERIF, fontSize: 20, maxWidth: 600, lineHeight: 1.5 }}>
            Let’s play {name} together.
          </p>
          <PrimaryButton onClick={() => { speak(`Let's play ${name} together.`); startModule(); }}>
            Start
          </PrimaryButton>
        </Centered>
      </FullScreen>
    );
  }

  /* ---- between modules ---- */
  if (run.phase === 'rest' || run.phase === 'paused') {
    return (
      <FullScreen>
        {chrome}
        <Centered>
          <GuideCharacter size={170} />
          <h1 style={{ fontFamily: SERIF, fontSize: 26, margin: 0 }}>A little break</h1>
          <p style={{ color: C.inkSoft, maxWidth: 560, lineHeight: 1.6 }}>
            Stretch, have a drink, come back when they are ready. Stopping here is fine — what you
            have already is real evidence, and the rest is simply not looked at this time.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PrimaryButton onClick={() => { run.phase = 'intro'; redraw(); }}>Carry on</PrimaryButton>
            <GhostButton onClick={finishNow}>Finish here</GhostButton>
          </div>
        </Centered>
      </FullScreen>
    );
  }

  /* ---- teacher-rated observations ---- */
  if (run.phase === 'observation') {
    return (
      <FullScreen>
        {chrome}
        <ObservationPanel
          bank={bank}
          index={index}
          locale="en"
          observations={run.observations}
          onRate={(milestoneId, band) => { recordObservation(run, milestoneId, band); persist(); redraw(); }}
          onNote={(milestoneId, note) => {
            const current = run.observations[milestoneId];
            if (current) recordObservation(run, milestoneId, current.band, note);
            persist();
            redraw();
          }}
          onDone={() => void finishRun()}
          labels={OBSERVATION_LABELS}
        />
        {sendError && (
          <p style={{ padding: '0 22px 40px', color: C.clay, fontSize: 13, maxWidth: 640, margin: '0 auto' }}>
            {sendError}
          </p>
        )}
      </FullScreen>
    );
  }

  /* ---- the close ---- */
  if (run.phase === 'close') {
    return (
      <FullScreen>
        <Centered>
          <GuideCharacter size={170} />
          <h1 style={{ fontFamily: SERIF, fontSize: 26, margin: 0 }}>Thank you for playing.</h1>
          <p style={{ color: C.inkSoft, maxWidth: 480, lineHeight: 1.6 }}>
            {sendError ? sendError : 'Working out the bands…'}
          </p>
          {sendError && <PrimaryButton onClick={() => void finishRun()}>Try again</PrimaryButton>}
        </Centered>
      </FullScreen>
    );
  }

  /* ---- an item on screen ---- */
  const step = currentStep(run);
  const item = currentItem(run, index);
  if (!step || !item) {
    return (
      <FullScreen>
        <Centered>
          <p style={{ fontFamily: SERIF, fontSize: 20 }}>Finishing up…</p>
          <PrimaryButton onClick={() => void finishRun()}>Finish</PrimaryButton>
        </Centered>
      </FullScreen>
    );
  }

  return (
    <FullScreen>
      {chrome}
      <ItemStage
        key={item.id}
        item={item}
        module={index.moduleById.get(item.moduleId)}
        stimulusById={index.stimulusById}
        practice={step.kind === 'practice'}
        locale="en"
        audioLive={audioOn && speech.supported}
        speak={speak}
        scriptOpen={scriptOpen}
        onToggleScript={() => setScriptOpen((v) => !v)}
        onComplete={onItemComplete}
        labels={ITEM_LABELS}
      />
    </FullScreen>
  );
}

export default LensRunner;
