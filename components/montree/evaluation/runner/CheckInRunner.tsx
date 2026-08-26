'use client';

/**
 * Montree Milestones — the check-in runner.
 *
 * Full-screen by design: this component covers the dashboard chrome entirely, because the
 * tablet is handed to a child and a stray tap on "Reports" mid-sitting ends the sitting.
 *
 * The flow is the ported D2 engine (lib/montree/evaluation/runner-engine.ts):
 *   setup → per module { intro → practice ×2 → items } → rest → … → observations → close
 * with stop rules skipping the rest of a strand or module, and the extension rule offering
 * a few band-up items after a perfect strand.
 *
 * DATA PATH
 *   • The child's identity comes from the route parameter. There is no name field anywhere
 *     in this component — typing a child's name to start a check-in is how records get
 *     attached to the wrong child.
 *   • The item bank arrives as a server-side projection (one band, one form, the chosen
 *     modules), never as the full 1.6 MB file.
 *   • Answers are autosaved to localStorage after every response and flushed to
 *     `/sessions/:id/items` opportunistically. The endpoint is idempotent on
 *     (session_id, item_id), so a re-send after a dropped connection is safe.
 *   • Bands are NOT computed here. `/complete` re-scores from the full bank server-side.
 *
 * OFFLINE POSTURE (stated plainly because it is a limitation, not a feature):
 *   Starting a check-in needs the network once — for the session row and the bank slice.
 *   After that the sitting runs entirely offline: every answer is written to localStorage,
 *   the queue flushes on `online` and again before `/complete`, and a teacher who finishes
 *   offline sees the queue held with a "send now" button rather than a lost morning.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';
import type { AgeBand, Band, FormCode, WindowCode } from '@/lib/montree/evaluation/types';
import type { ProjectedBank } from '@/lib/montree/evaluation/bank-projection';
import {
  adjacentAgeBands, advance, ageBandFromMonths, ageMonthsFromBirthDate, answeredCount,
  buildRunnerIndex, createRun, currentItem, currentStep, defaultFormForWindow, endEarly, finish,
  markNotEngaged, monthsToNearestBandEdge, progressDots, recordObservation, recordResponse,
  schoolYearForDate, toObservationPayload, toRawResponses, windowForDate,
  type RunnerIndex, type RunState,
} from '@/lib/montree/evaluation/runner-engine';
import {
  deleteSnapshot, flushResponses, isOnline, listSnapshots, probeStorage, saveSnapshot,
  type RunSnapshot,
} from '@/lib/montree/evaluation/runner-storage';
import { GuideCharacter } from '../GuideCharacter';
import { useSpeech } from '../useSpeech';
import { BandChip } from '../BandChip';
import { bankText } from '../localized';
import { C, SERIF, SANS } from '../tokens';
import { ItemStage, type ItemAnswer } from './ItemStage';
import { ObservationPanel } from './ObservationPanel';
import { HoldButton } from './HoldButton';

/* ───────────────────────────────────────────────────────────────── constants */

const MODULE_CHOICES: Array<{ id: string; labelKey: 'milestones.run.moduleLit' | 'milestones.run.moduleMath' | 'milestones.run.moduleEfl' | 'milestones.run.moduleObs' }> = [
  { id: 'M-LIT', labelKey: 'milestones.run.moduleLit' },
  { id: 'M-MATH', labelKey: 'milestones.run.moduleMath' },
  { id: 'M-EFL', labelKey: 'milestones.run.moduleEfl' },
  { id: 'M-OBS', labelKey: 'milestones.run.moduleObs' },
];

/**
 * The kindergarten bands, always offered. `G1` — Montree Canopy — is appended only when the
 * school has `child_evaluation_g1` on (see CANOPY_BAND below): a school that runs
 * kindergarten only must never be shown a tier it cannot start.
 */
const AGE_BANDS: AgeBand[] = ['A3', 'A4', 'A5'];
const CANOPY_BAND: AgeBand = 'G1';
const WINDOW_CODES: WindowCode[] = ['autumn', 'winter', 'spring'];
/**
 * Representative months for a manually-picked band, used only when there is no birth date to
 * derive an exact age from. Each value round-trips through `ageBandFromMonths` back to the same
 * band, so a teacher's manual choice is never silently reinterpreted as a different band.
 */
const BAND_MIDPOINT_MONTHS: Record<AgeBand, number> = {
  A3: 42,
  A4: 54,
  A5: 66,
  G1: 78,
};
/** Send in the background every few answers; the rest of the queue goes at the close. */
const FLUSH_EVERY = 6;

/* ─────────────────────────────────────────── copy added by the expert-review fixes
 *
 * Not in lib/montree/i18n/** on purpose: that catalogue is owned elsewhere and its
 * `TranslationKey` union is shared by every Montree surface, so adding keys there mid-flight
 * would break unrelated files. English and Chinese live here and resolve off the same
 * `locale` the runner already has. Every string was checked against
 * lib/montree/evaluation/forbidden-terms.ts — no testing register anywhere.
 */
const RUN_COPY = {
  /** FIX G */
  notEngaged: { en: 'Child did not engage', zh: '孩子这次没有参与' },
  notEngagedHelp: {
    en: 'Recorded as not looked at this time. It is never treated as an answer.',
    zh: '记录为本次未查看。绝不会当作作答处理。',
  },
  /** FIX F */
  ageConfirmTitle: { en: 'Confirm the group', zh: '确认所在阶段' },
  ageDerived: { en: 'Suggested from the child’s age', zh: '根据孩子年龄给出的建议' },
  ageNearEdge: {
    en: 'This child is close to the next group. Keep the suggested one, or take the neighbouring one — whichever matches the work they are doing.',
    zh: '这个孩子接近下一个阶段。可以保留建议的阶段，也可以选择相邻的阶段 — 以更贴近他们当前的工作为准。',
  },
  ageOverridden: {
    en: 'You have chosen a different group from the one the age suggests. That choice is recorded with the sitting.',
    zh: '您选择的阶段与年龄建议的不同。该选择会随本次记录一并保存。',
  },
  ageMonths: { en: 'months old', zh: '个月大' },
  /** FIX A */
  discontinueLine: {
    en: 'Not looked at — earlier steps not yet secure',
    zh: '本次未查看 — 之前的步骤尚未稳固',
  },
  discontinueCaveat: {
    en: 'Several areas were not looked at in this sitting because earlier steps were not yet '
      + 'secure — the overall picture reads higher than a full sitting would show.',
    zh: '本次有若干领域未被查看，因为之前的步骤尚未稳固 — 整体情况看起来会比完整一次的实际情况更好。',
  },
  /** FIX D */
  profileTitle: { en: 'Milestone profile', zh: '里程碑概览' },
  mapSecondary: {
    en: 'A summary figure, reported after the profile above and never on its own.',
    zh: '这是概括性的数字，放在上面的概览之后呈现，绝不单独使用。',
  },
} as const;

const runSay = (key: keyof typeof RUN_COPY, locale: string): string =>
  (locale.startsWith('zh') ? RUN_COPY[key].zh : RUN_COPY[key].en);

type Screen = 'setup' | 'running' | 'summary' | 'blocked';

interface CompletePayload {
  summary?: {
    core: { mapPercent: number | null; denominator: number; suppressed: boolean; suppressionReason: string | null; exceeded: number };
    efl: { mapPercent: number | null; denominator: number; suppressed: boolean; suppressionReason: string | null };
    counts: Record<string, number>;
    itemsAdministered: number;
    itemsSkipped: number;
    /** FIX A — additive, and absent on a sitting scored before these fields existed. */
    unassessedByDiscontinue?: number;
    expectedInScope?: number;
    discontinueSharePercent?: number | null;
    discontinueBiasFlag?: boolean;
  };
  narrative?: { growth: string | null; profile: string | null; english: string | null };
}

/* ──────────────────────────────────────────────────────────────── component */

export function CheckInRunner({
  childId,
  childName,
  birthDate,
}: {
  childId: string;
  childName: string | null;
  birthDate: string | null;
}) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isEnabled } = useFeatures();
  const canopyOn = isEnabled('child_evaluation_g1');

  /* ---------------- setup configuration ---------------- */
  const suggestedMonths = useMemo(() => ageMonthsFromBirthDate(birthDate), [birthDate]);
  /**
   * FIX F — the band the child's age alone gives, kept separate from the band that will
   * actually be run. The cuts at 48 / 60 / 72 months are hard and development is not, so
   * a 47-month-old about to turn four and a 48-month-old who turned four yesterday derive
   * different bands on a difference of days. The teacher confirms, and which one was used
   * is recorded with the sitting.
   */
  const derivedBand = useMemo<AgeBand | null>(
    () => (suggestedMonths !== null ? ageBandFromMonths(suggestedMonths) : null),
    [suggestedMonths],
  );
  const nearEdge = useMemo(() => monthsToNearestBandEdge(suggestedMonths), [suggestedMonths]);
  const [ageBand, setAgeBand] = useState<AgeBand>(() => (
    suggestedMonths !== null ? ageBandFromMonths(suggestedMonths) : 'A4'
  ));
  const ageBandOverridden = derivedBand !== null && ageBand !== derivedBand;
  /**
   * Bands this teacher may choose. Canopy is additive and fails closed — `useFeatures` is
   * fail-closed itself, so a flag fetch that never lands simply leaves the kindergarten
   * bands. A child old enough for G1 in a school without Canopy is offered A5, which the
   * server accepts; it is never left with a band it cannot start.
   */
  const bandChoices = useMemo<AgeBand[]>(
    () => (canopyOn ? [...AGE_BANDS, CANOPY_BAND] : AGE_BANDS),
    [canopyOn],
  );
  const bandLabel = useCallback(
    (band: AgeBand): string => (band === CANOPY_BAND ? t('milestones.run.bandG1') : band),
    [t],
  );
  // A six-year-old suggests G1. Without Canopy that band cannot be run, so fall back to the
  // top kindergarten band rather than sitting on an option the school does not have.
  useEffect(() => {
    if (!canopyOn && ageBand === CANOPY_BAND) setAgeBand('A5');
  }, [canopyOn, ageBand]);
  const [windowCode, setWindowCode] = useState<WindowCode>(() => windowForDate());
  const [formCode, setFormCode] = useState<FormCode>(() => defaultFormForWindow(windowForDate()));
  const [formTouched, setFormTouched] = useState(false);
  const [modules, setModules] = useState<string[]>(['M-LIT', 'M-MATH']);

  /* ---------------- runtime ---------------- */
  const [screen, setScreen] = useState<Screen>('setup');
  const [blocked, setBlocked] = useState<{ title: string; body: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [storageOk] = useState(() => probeStorage().available);
  const [resumable, setResumable] = useState<RunSnapshot | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletePayload | null>(null);
  const [completing, setCompleting] = useState(false);

  const bankRef = useRef<ProjectedBank | null>(null);
  const indexRef = useRef<RunnerIndex | null>(null);
  const runRef = useRef<RunState | null>(null);
  const syncedRef = useRef<string[]>([]);
  // The run state lives in a ref (the engine mutates it in place, as a state machine should);
  // this counter is the only thing React needs in order to redraw after a mutation.
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  /* ---------------- audio ----------------
     `useSpeech` reports honestly whether narration is actually live. When it is not, the
     item screen shows the teacher script card by default and the sitting runs by reading
     aloud — a dead speaker must never block a check-in. */
  const speech = useSpeech();
  const audioOn = speech.live;
  const speak = speech.speak;
  const enableAudio = useCallback(() => {
    void speech.enable().then((ok) => { if (!ok) toast.message(t('milestones.run.soundNone')); });
  }, [speech, t]);

  /* ---------------- resume ---------------- */
  useEffect(() => {
    if (!storageOk) return;
    const candidates = listSnapshots(childId).filter((s) => !s.run.completedAt);
    if (candidates.length) setResumable(candidates[0]);
  }, [childId, storageOk]);

  const persist = useCallback(() => {
    const run = runRef.current;
    const bank = bankRef.current;
    if (!run || !bank || !storageOk) return;
    saveSnapshot({
      bankVersion: bank.bankVersion,
      bankQuery: {
        ageBand: run.config.ageBand,
        formCode: run.config.formCode,
        modules: run.config.moduleIds,
        assessmentLocale: run.config.assessmentLocale,
      },
      run,
      syncedItemIds: syncedRef.current,
    });
  }, [storageOk]);

  /* ---------------- sending ---------------- */
  const flushNow = useCallback(async (silent = true): Promise<boolean> => {
    const run = runRef.current;
    if (!run?.sessionId) return false;
    const responses = toRawResponses(run) as unknown as Array<Record<string, unknown>>;
    const observations = toObservationPayload(run) as unknown as Array<Record<string, unknown>>;
    const result = await flushResponses({
      sessionId: run.sessionId,
      responses,
      observations,
      syncedItemIds: syncedRef.current,
    });
    if (result.ok) {
      syncedRef.current = result.syncedItemIds;
      setPendingCount(0);
      setSendError(null);
      persist();
      return true;
    }
    setPendingCount(responses.length - syncedRef.current.length);
    setSendError(result.error);
    if (!silent) toast.error(t('milestones.run.sendFailed'));
    return false;
  }, [persist, t]);

  // Flush whenever the tablet comes back online mid-sitting.
  useEffect(() => {
    const onOnline = () => { void flushNow(true); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushNow]);

  /* ---------------- starting ---------------- */
  const loadBank = useCallback(async (
    query: { ageBand: string; formCode: string; modules: string[]; assessmentLocale?: string },
  ) => {
    const params = new URLSearchParams({
      ageBand: query.ageBand,
      formCode: query.formCode,
      modules: query.modules.join(','),
      // The language-of-assessment gate: the slice excludes the English-medium core strands
      // when this is not English, so the tablet is never handed content it must not use.
      assessmentLocale: query.assessmentLocale || 'en',
    });
    const res = await fetch(`/api/montree/evaluation/bank?${params.toString()}`);
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.reason === 'migration_pending' ? 'migration_pending' : 'feature_off');
    }
    if (!res.ok) throw new Error(`bank_${res.status}`);
    const body = await res.json();
    // FIX E — the server decides the English-medium literacy gate from the SCHOOL's
    // programme flag and tells us what it did, so the runner's own step building agrees
    // with the slice it was handed instead of re-deriving the rule from the UI locale.
    return {
      bank: body.bank as ProjectedBank,
      englishMediumLiteracy: body.englishMediumLiteracy === true,
    };
  }, []);

  const blockFor = useCallback((reason: string) => {
    if (reason === 'feature_off') {
      setBlocked({ title: t('milestones.featureOffTitle'), body: t('milestones.featureOffBody') });
    } else if (reason === 'migration_pending') {
      setBlocked({ title: t('milestones.migrationPendingTitle'), body: t('milestones.migrationPendingBody') });
    } else {
      setBlocked({ title: t('milestones.loadFailed'), body: reason });
    }
    setScreen('blocked');
  }, [t]);

  const begin = useCallback(async () => {
    if (!modules.length) { toast.error(t('milestones.run.noModules')); return; }
    setStarting(true);
    try {
      // No date of birth means the teacher picked the band by hand; send the band's
      // representative age so the server has the ageMonths it requires, and so the local run
      // state and the stored session agree on one number.
      const resolvedAgeMonths = suggestedMonths ?? BAND_MIDPOINT_MONTHS[ageBand];
      const loaded = await loadBank({ ageBand, formCode, modules, assessmentLocale: locale });
      const bank = loaded.bank;
      const res = await fetch('/api/montree/evaluation/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          childId,
          windowCode,
          ageBand,
          ageMonths: resolvedAgeMonths,
          formCode,
          modules,
          deliveryMode: 'tablet',
          assessmentLocale: locale,
          schoolYear: schoolYearForDate(),
          // Sent for the audit trail; the server derives the authoritative marker itself
          // from the age it stores, so a client cannot dress an override up as a derivation.
          ageBandOverridden,
        }),
      });
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        blockFor(body?.reason === 'migration_pending' ? 'migration_pending' : 'feature_off');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        blockFor(body?.detail ?? body?.error ?? `session_${res.status}`);
        return;
      }
      const body = await res.json();

      const index = buildRunnerIndex(bank);
      const run = createRun(bank, index, {
        childId, ageBand, ageMonths: resolvedAgeMonths, formCode, windowCode,
        schoolYear: schoolYearForDate(), moduleIds: modules, assessmentLocale: locale,
        englishMediumLiteracy: loaded.englishMediumLiteracy,
        ageBandOverridden,
      });
      run.sessionId = body?.session?.id ?? null;
      bankRef.current = bank;
      indexRef.current = index;
      runRef.current = run;
      syncedRef.current = [];
      persist();
      setScreen('running');
      redraw();
    } catch (error) {
      blockFor((error as Error).message);
    } finally {
      setStarting(false);
    }
  }, [modules, ageBand, formCode, windowCode, childId, locale, suggestedMonths, ageBandOverridden,
      loadBank, persist, redraw, blockFor, t]);

  const resume = useCallback(async (snapshot: RunSnapshot) => {
    setStarting(true);
    try {
      // A snapshot written before the language-of-assessment gate has no locale on its bank
      // query; the run's own config always does, so resume from that.
      const loaded = await loadBank({
        ...snapshot.bankQuery,
        assessmentLocale: snapshot.bankQuery.assessmentLocale || snapshot.run.config.assessmentLocale,
      });
      const bank = loaded.bank;
      const index = buildRunnerIndex(bank);
      const run = snapshot.run;
      // A snapshot written before FIX E carries no flag; take the server's current answer.
      run.config.englishMediumLiteracy = loaded.englishMediumLiteracy;
      // `startedMs` came from the previous page load. Left alone, a check-in resumed the
      // next morning would report a sixteen-hour duration; the clock restarts on resume.
      run.startedMs = Date.now();
      // Never re-show a question the child has already answered.
      while (run.steps[run.stepIndex]
        && (run.steps[run.stepIndex].skipped || run.responses[run.steps[run.stepIndex].itemId])) {
        run.stepIndex += 1;
      }
      if (run.stepIndex >= run.steps.length) {
        run.phase = run.config.moduleIds.includes('M-OBS') ? 'observation' : 'close';
      } else if (run.phase === 'intro' || run.phase === 'rest' || run.phase === 'paused') {
        // keep the screen the teacher left on
      } else {
        run.phase = run.steps[run.stepIndex].kind === 'practice' ? 'practice' : 'item';
      }
      bankRef.current = bank;
      indexRef.current = index;
      runRef.current = run;
      syncedRef.current = snapshot.syncedItemIds ?? [];
      setResumable(null);
      setScreen('running');
      redraw();
      void flushNow(true);
    } catch (error) {
      blockFor((error as Error).message);
    } finally {
      setStarting(false);
    }
  }, [loadBank, redraw, blockFor, flushNow]);

  /* ---------------- completing ---------------- */
  const submitAndComplete = useCallback(async () => {
    const run = runRef.current;
    if (!run?.sessionId) return;
    setCompleting(true);
    const flushed = await flushNow(true);
    if (!flushed) {
      setCompleting(false);
      return;      // queue is kept; the summary screen offers "send now"
    }
    try {
      const res = await fetch(`/api/montree/evaluation/sessions/${run.sessionId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          durationSeconds: run.durationSeconds,
          status: 'completed',
          childName: childName ?? undefined,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        setSendError(`complete_${res.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`);
        return;
      }
      const body = (await res.json()) as CompletePayload;
      setCompletion(body);
      setSendError(null);
      // The record is filed server-side; the local copy is no longer the only one.
      deleteSnapshot(run.localId);
      toast.success(t('milestones.run.finished'));
    } catch (error) {
      setSendError((error as Error).message);
    } finally {
      setCompleting(false);
    }
  }, [flushNow, childName, t]);

  /* ---------------- item flow ---------------- */
  const step = runRef.current ? currentStep(runRef.current) : null;
  const item = runRef.current && indexRef.current ? currentItem(runRef.current, indexRef.current) : null;

  const goNext = useCallback(() => {
    const run = runRef.current;
    const bank = bankRef.current;
    const index = indexRef.current;
    if (!run || !bank || !index) return;
    const outcome = advance(bank, index, run);
    persist();
    if (outcome.next === 'rest' || outcome.next === 'observation' || outcome.next === 'close') {
      void flushNow(true);
    }
    if (outcome.next === 'close') void submitAndComplete();
    redraw();
  }, [persist, flushNow, submitAndComplete, redraw]);

  const onItemComplete = useCallback((answer: ItemAnswer | null) => {
    const run = runRef.current;
    const index = indexRef.current;
    if (!run || !index || !item) return;
    if (answer) {
      recordResponse(index, run, item, {
        optionIds: answer.optionIds,
        sequence: answer.sequence,
        // FIX B — carried into the stored response so the component picture behind a
        // listen_do outcome survives to item analysis. Credit is unchanged.
        touchedIds: answer.touchedIds,
        rubricScore: answer.rubricScore,
        latencyMs: answer.latencyMs,
        replayCount: answer.replayCount,
      });
      persist();
      const answered = answeredCount(run);
      setPendingCount(Math.max(0, answered - syncedRef.current.length));
      if (answered % FLUSH_EVERY === 0) void flushNow(true);
    }
    goNext();
  }, [item, persist, flushNow, goNext]);

  /**
   * FIX G — "child did not engage".
   *
   * The item was offered and the child did not take it up. That is not an answer and must
   * never be arithmetic: the response is stored as NOT ADMINISTERED with its own reason, so
   * it lowers coverage exactly like a stop-rule gap while staying distinct from one (the
   * instrument did not discontinue here; an adult made a call). It never touches a
   * stop-rule streak, so a child who is simply having a hard morning does not have the
   * rest of the strand taken away from them.
   */
  const onNotEngaged = useCallback(() => {
    const run = runRef.current;
    if (!run || !item) return;
    markNotEngaged(run, item);
    persist();
    toast.message(runSay('notEngagedHelp', locale));
    goNext();
  }, [item, persist, goNext, locale]);

  const finishNow = useCallback(() => {
    const run = runRef.current;
    const index = indexRef.current;
    if (!run || !index) return;
    endEarly(index, run, 'teacher_ended');
    finish(run);
    persist();
    redraw();
    void submitAndComplete();
  }, [persist, redraw, submitAndComplete]);

  const leave = useCallback(() => {
    if (!window.confirm(t('milestones.run.exitConfirm'))) return;
    persist();
    router.push(`/montree/dashboard/${childId}/milestones`);
  }, [t, persist, router, childId]);

  /* ─────────────────────────────────────────────────────────────── screens */

  if (screen === 'blocked' && blocked) {
    return (
      <FullScreen>
        <Centered>
          <GuideCharacter size={120} />
          <h1 style={{ fontFamily: SERIF, fontSize: 24, marginTop: 16 }}>{blocked.title}</h1>
          <p style={{ color: C.inkSoft, maxWidth: 560, lineHeight: 1.6 }}>{blocked.body}</p>
          <PrimaryButton onClick={() => router.push(`/montree/dashboard/${childId}/milestones`)}>
            {t('milestones.run.backToProfile')}
          </PrimaryButton>
        </Centered>
      </FullScreen>
    );
  }

  if (screen === 'setup') {
    return (
      <FullScreen>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 22px 60px', fontFamily: SANS, color: C.ink }}>
          <TopBar
            onLeave={() => router.push(`/montree/dashboard/${childId}/milestones`)}
            leaveLabel={t('milestones.run.backToProfile')}
            audioOn={audioOn}
            onAudio={enableAudio}
            audioLabel={audioOn ? t('milestones.run.soundOn') : t('milestones.run.soundCheck')}
          />
          <h1 style={{ fontFamily: SERIF, fontSize: 28, margin: '18px 0 8px' }}>{t('milestones.run.title')}</h1>
          <p style={{ color: C.inkSoft, fontSize: 15, lineHeight: 1.6, maxWidth: 620 }}>{t('milestones.run.intro')}</p>

          <Card>
            <FieldLabel>{t('milestones.run.child')}</FieldLabel>
            <div style={{ fontFamily: SERIF, fontSize: 20 }}>{childName ?? childId}</div>
          </Card>

          {resumable && (
            <Card warm>
              <FieldLabel>{t('milestones.run.resumeTitle')}</FieldLabel>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: C.inkSoft }}>
                {t('milestones.run.resumeBody', {
                  window: resumable.run.config.windowCode,
                  when: new Date(resumable.savedAt).toLocaleString(),
                  n: answeredCount(resumable.run),
                })}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <PrimaryButton onClick={() => void resume(resumable)} disabled={starting}>
                  {t('milestones.run.resume')}
                </PrimaryButton>
                <GhostButton onClick={() => {
                  if (!window.confirm(t('milestones.run.discardConfirm'))) return;
                  deleteSnapshot(resumable.run.localId);
                  setResumable(null);
                }}>
                  {t('milestones.run.discard')}
                </GhostButton>
              </div>
            </Card>
          )}

          {/* FIX F — the age band is CONFIRMED, not derived silently.
              The cuts at 48 / 60 / 72 months are hard; a child four days either side of one
              of them gets a different milestone set on a difference of days. So the screen
              says the child's age, says which group that suggests, and — when the child is
              within three months of an edge — offers the neighbouring group as a one-tap
              choice. Whichever is used is recorded with the sitting. */}
          <Card>
            <FieldLabel>{t('milestones.run.ageBand')}</FieldLabel>
            <Segmented
              options={bandChoices.map((b) => ({ id: b, label: bandLabel(b) }))}
              value={ageBand}
              onChange={(v) => setAgeBand(v as AgeBand)}
            />
            <p style={{ fontSize: 12.5, color: C.inkSoft, margin: '8px 0 0' }}>
              {suggestedMonths !== null ? t('milestones.run.ageBandAuto') : t('milestones.run.ageBandUnknown')}
            </p>

            {suggestedMonths !== null && derivedBand && (
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 13,
              }}>
                <div style={{ color: C.ink }}>
                  <b>{runSay('ageConfirmTitle', locale)}</b>
                  {' · '}
                  {suggestedMonths} {runSay('ageMonths', locale)}
                  {' · '}
                  {runSay('ageDerived', locale)}: <b>{bandLabel(derivedBand)}</b>
                </div>

                {nearEdge && (
                  <p style={{ color: C.inkSoft, margin: '8px 0 0', lineHeight: 1.55 }}>
                    {runSay('ageNearEdge', locale)}
                  </p>
                )}

                {/* The neighbouring groups, offered explicitly rather than left to be found
                    in the row above. Only bands this school can actually run are offered. */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                  {[derivedBand, adjacentAgeBands(derivedBand).below, adjacentAgeBands(derivedBand).above]
                    .filter((b): b is AgeBand => !!b && bandChoices.includes(b))
                    .map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setAgeBand(b)}
                        className={`btn btn-sm btn-pill on-light ${b === ageBand ? 'btn-primary' : 'btn-secondary'}`}
                      >
                        {bandLabel(b)}
                      </button>
                    ))}
                </div>

                {ageBandOverridden && (
                  <p style={{
                    color: C.ink, margin: '10px 0 0', lineHeight: 1.55,
                    background: '#FDF6E7', border: `1px solid ${C.sandDark}`,
                    borderRadius: 12, padding: '10px 12px',
                  }}>
                    {runSay('ageOverridden', locale)}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card>
            <FieldLabel>{t('milestones.run.window')}</FieldLabel>
            <Segmented
              options={WINDOW_CODES.map((w) => ({
                id: w,
                label: w === 'autumn' ? t('milestones.windowAutumn')
                  : w === 'winter' ? t('milestones.windowWinter') : t('milestones.windowSpring'),
              }))}
              value={windowCode}
              onChange={(v) => {
                const next = v as WindowCode;
                setWindowCode(next);
                if (!formTouched) setFormCode(defaultFormForWindow(next));
              }}
            />
            <div style={{ marginTop: 16 }}>
              <FieldLabel>{t('milestones.run.form')}</FieldLabel>
              <Segmented
                options={[{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }]}
                value={formCode}
                onChange={(v) => { setFormTouched(true); setFormCode(v as FormCode); }}
              />
              <p style={{ fontSize: 12.5, color: C.inkSoft, margin: '8px 0 0' }}>{t('milestones.run.formHelp')}</p>
            </div>
          </Card>

          <Card>
            <FieldLabel>{t('milestones.run.modules')}</FieldLabel>
            {MODULE_CHOICES.map((choice) => {
              const on = modules.includes(choice.id);
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setModules((prev) => (
                    prev.includes(choice.id) ? prev.filter((m) => m !== choice.id) : [...prev, choice.id]
                  ))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
                    padding: '14px 16px', minHeight: 72, marginBottom: 10, borderRadius: 16,
                    border: `2px solid ${on ? C.forest : C.sandDark}`,
                    background: on ? '#F2F6EE' : C.paper, cursor: 'pointer', fontSize: 16,
                  }}
                >
                  <span style={{
                    width: 30, height: 30, borderRadius: 9, flex: '0 0 auto',
                    border: `2px solid ${on ? C.forest : C.sandDark}`,
                    background: on ? C.forest : 'transparent', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  }}>{on ? '✓' : ''}</span>
                  {t(choice.labelKey)}
                </button>
              );
            })}
          </Card>

          <p style={{ fontSize: 12.5, color: C.inkSoft, lineHeight: 1.6 }}>
            {storageOk ? t('milestones.run.savedHere') : t('milestones.run.notSavedHere')}
          </p>

          <PrimaryButton onClick={() => void begin()} disabled={starting || !modules.length} wide>
            {starting ? t('milestones.run.preparing') : t('milestones.run.begin')}
          </PrimaryButton>
        </div>
      </FullScreen>
    );
  }

  const run = runRef.current;
  const bank = bankRef.current;
  const index = indexRef.current;
  if (!run || !bank || !index) {
    return <FullScreen><Centered><p>{t('milestones.run.preparing')}</p></Centered></FullScreen>;
  }

  const chrome = (
    <TopBar
      onLeave={leave}
      leaveLabel={t('milestones.run.exit')}
      audioOn={audioOn}
      onAudio={enableAudio}
      audioLabel={audioOn ? t('milestones.run.soundOn') : t('milestones.run.soundCheck')}
      dots={progressDots(run)}
      pending={pendingCount}
      offline={!isOnline()}
      offlineLabel={t('milestones.run.offlineTitle')}
      onFinish={run.phase === 'item' || run.phase === 'practice' ? finishNow : undefined}
      finishLabel={t('milestones.run.finishHere')}
    />
  );

  /* ---- the summary the teacher holds to reach ---- */
  if (screen === 'summary') {
    return (
      <FullScreen>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '20px 22px 60px', fontFamily: SANS, color: C.ink }}>
          {chrome}
          <h1 style={{ fontFamily: SERIF, fontSize: 26, margin: '18px 0 12px' }}>{t('milestones.run.summaryTitle')}</h1>

          {completing && <p style={{ color: C.inkSoft }}>{t('milestones.run.finishing')}</p>}

          {sendError && (
            <Card warm>
              <p style={{ margin: '0 0 12px', fontSize: 14 }}>{t('milestones.run.sendFailed')}</p>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: C.inkSoft }}>{sendError}</p>
              <PrimaryButton onClick={() => void submitAndComplete()}>{t('milestones.run.sendRetry')}</PrimaryButton>
            </Card>
          )}

          {completion?.summary && (
            <>
              {/* FIX D — the band profile comes FIRST and the percentage comes last,
                  smaller. A 44px emerald figure at the top of the closing screen is the
                  thing a teacher carries away from the sitting, and it is the object this
                  module least wants carried away. */}
              <Card>
                <FieldLabel>{runSay('profileTitle', locale)}</FieldLabel>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <BandChip band="secure" label={`${t('milestones.secure')} · ${completion.summary.counts.secure ?? 0}`} />
                  <BandChip band="developing" label={`${t('milestones.developing')} · ${completion.summary.counts.developing ?? 0}`} />
                  <BandChip band="emerging" label={`${t('milestones.emerging')} · ${completion.summary.counts.emerging ?? 0}`} />
                  <BandChip band="unassessed" label={`${t('milestones.unassessed')} · ${completion.summary.counts.unassessed ?? 0}`} />
                </div>

                {/* FIX A — the stop-rule share of "not looked at", on its own line, with
                    the caveat when it is large enough to lift the figure below. */}
                {(completion.summary.unassessedByDiscontinue ?? 0) > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
                      <span style={{ color: C.inkSoft }}>{runSay('discontinueLine', locale)}</span>
                      <b style={{ fontFamily: SERIF, fontSize: 18 }}>{completion.summary.unassessedByDiscontinue}</b>
                      {typeof completion.summary.discontinueSharePercent === 'number' && (
                        <span style={{ color: C.inkSoft }}>
                          {completion.summary.discontinueSharePercent}% · {completion.summary.expectedInScope ?? 0}
                        </span>
                      )}
                    </div>
                    {completion.summary.discontinueBiasFlag && (
                      <p style={{
                        fontSize: 13, lineHeight: 1.55, margin: '10px 0 0', maxWidth: 620,
                        background: '#FDF6E7', border: `1px solid ${C.sandDark}`,
                        borderRadius: 12, padding: '10px 12px',
                      }}>
                        {runSay('discontinueCaveat', locale)}
                      </p>
                    )}
                  </div>
                )}
              </Card>

              {completion.narrative?.growth && (
                <Card>
                  <FieldLabel>{t('milestones.growth')}</FieldLabel>
                  <p style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.5, margin: 0 }}>
                    {completion.narrative.growth}
                  </p>
                </Card>
              )}

              <Card>
                <FieldLabel>{t('milestones.map')}</FieldLabel>
                {completion.summary.core.suppressed || completion.summary.core.mapPercent === null ? (
                  <>
                    <div style={{ fontFamily: SERIF, fontSize: 18, color: C.inkSoft }}>{t('milestones.mapSuppressed')}</div>
                    <p style={{ fontSize: 13, color: C.inkSoft, lineHeight: 1.55, maxWidth: 620 }}>
                      {t('milestones.mapSuppressedSmallN', { n: 12 })}
                    </p>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 20, color: C.inkSoft }}>
                      {completion.summary.core.mapPercent}%
                    </span>
                    <span style={{ color: C.inkSoft, fontSize: 12.5 }}>
                      {t('milestones.mapOf', { n: completion.summary.core.denominator })}
                    </span>
                  </div>
                )}
                {completion.narrative?.profile && (
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: C.inkSoft, marginTop: 10 }}>
                    {completion.narrative.profile}
                  </p>
                )}
                <p style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55, marginTop: 10, maxWidth: 640 }}>
                  {runSay('mapSecondary', locale)}
                </p>
              </Card>

              <p style={{ fontSize: 11.5, color: C.inkSoft, lineHeight: 1.55, maxWidth: 640 }}>
                {t('milestones.mapCaveat')}
              </p>
            </>
          )}

          <PrimaryButton onClick={() => router.push(`/montree/dashboard/${childId}/milestones`)} wide>
            {t('milestones.run.backToProfile')}
          </PrimaryButton>
        </div>
      </FullScreen>
    );
  }

  /* ---- intro before each module ---- */
  if (run.phase === 'intro') {
    const mod = index.moduleById.get(run.directModules[run.moduleIndex]);
    const line = t('milestones.run.introLine', { module: bankText(mod?.name, locale) });
    return (
      <FullScreen>
        {chrome}
        <Centered>
          <GuideCharacter size={170} />
          <h1 style={{ fontFamily: SERIF, fontSize: 28, marginTop: 18 }}>{bankText(mod?.name, locale)}</h1>
          <p style={{ fontFamily: SERIF, fontSize: 20, maxWidth: 600, lineHeight: 1.5 }}>{line}</p>
          <PrimaryButton onClick={() => {
            run.phase = run.steps[run.stepIndex]?.kind === 'practice' ? 'practice' : 'item';
            speak(line);
            redraw();
          }}>
            {t('milestones.run.start')}
          </PrimaryButton>
        </Centered>
      </FullScreen>
    );
  }

  /* ---- between modules ---- */
  if (run.phase === 'rest' || run.phase === 'paused') {
    const paused = run.phase === 'paused';
    return (
      <FullScreen>
        {chrome}
        <Centered>
          <GuideCharacter size={170} />
          <h1 style={{ fontFamily: SERIF, fontSize: 26 }}>
            {paused ? t('milestones.run.pausedTitle') : t('milestones.run.restTitle')}
          </h1>
          <p style={{ color: C.inkSoft, maxWidth: 560, lineHeight: 1.6 }}>
            {paused ? t('milestones.run.pausedBody') : t('milestones.run.restBody')}
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Carrying on lands on the next module's intro, exactly as the tablet build
                does — the child hears what they are about to play before it starts. */}
            <PrimaryButton onClick={() => { run.phase = 'intro'; redraw(); }}>
              {t('milestones.run.carryOn')}
            </PrimaryButton>
            {!paused && (
              <GhostButton onClick={() => { run.phase = 'paused'; persist(); redraw(); }}>
                {t('milestones.run.stopForNow')}
              </GhostButton>
            )}
            <GhostButton onClick={finishNow}>{t('milestones.run.finishHere')}</GhostButton>
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
          locale={locale}
          observations={run.observations}
          onRate={(milestoneId, band: Band) => {
            recordObservation(run, milestoneId, band, run.observations[milestoneId]?.note);
            persist();
            redraw();
          }}
          onNote={(milestoneId, note) => {
            const existing = run.observations[milestoneId];
            if (!existing) return;
            recordObservation(run, milestoneId, existing.band, note);
            persist();
            redraw();
          }}
          onDone={() => {
            finish(run);
            persist();
            redraw();
            void submitAndComplete();
          }}
          labels={{
            title: t('milestones.run.obsTitle'),
            intro: t('milestones.run.obsIntro'),
            whichFits: t('milestones.run.obsWhichFits'),
            done: t('milestones.run.obsDone'),
            progress: (d, total) => t('milestones.run.obsProgress', { done: d, total }),
            bandLabels: {
              emerging: t('milestones.emerging'),
              developing: t('milestones.developing'),
              secure: t('milestones.secure'),
            },
            note: t('milestones.run.obsNote'),
          }}
        />
      </FullScreen>
    );
  }

  /* ---- the close: identical every time, whatever happened ---- */
  if (run.phase === 'close') {
    return (
      <FullScreen>
        {chrome}
        <Centered>
          <PetalSky />
          <GuideCharacter size={170} pose="cheer" />
          <h1 style={{ fontFamily: SERIF, fontSize: 28, marginTop: 14 }}>{t('milestones.run.closeLine')}</h1>
          <p style={{ color: C.inkSoft }}>{t('milestones.run.closeSub')}</p>
          <HoldButton
            onHold={() => setScreen('summary')}
            label={t('milestones.run.toSummary')}
            hint={t('milestones.run.holdHint')}
          />
        </Centered>
      </FullScreen>
    );
  }

  /* ---- an item ---- */
  if (item && step) {
    return (
      <FullScreen>
        {chrome}
        <ItemStage
          key={`${item.id}-${run.stepIndex}`}
          item={item}
          module={index.moduleById.get(step.moduleId)}
          stimulusById={index.stimulusById}
          practice={step.kind === 'practice'}
          locale={locale}
          audioLive={audioOn}
          speak={speak}
          scriptOpen={scriptOpen}
          onToggleScript={() => setScriptOpen((v) => !v)}
          onComplete={onItemComplete}
          onNotEngaged={onNotEngaged}
          labels={{
            notEngaged: runSay('notEngaged', locale),
            practice: t('milestones.run.practice'),
            replay: t('milestones.run.replay'),
            showScript: t('milestones.run.showScript'),
            hideScript: t('milestones.run.hideScript'),
            teacherScript: t('milestones.run.teacherScript'),
            sequenceHint: t('milestones.run.sequenceHint'),
            sequenceDone: t('milestones.run.sequenceDone'),
            soundNone: t('milestones.run.soundNone'),
            teacherOnly: t('milestones.run.teacherOnly'),
            thankYou: t('milestones.run.thankYou'),
          }}
        />
      </FullScreen>
    );
  }

  return (
    <FullScreen>
      {chrome}
      <Centered><p>{t('milestones.run.preparing')}</p></Centered>
    </FullScreen>
  );
}

/* ─────────────────────────────────────────────────────────── presentational */

/**
 * The runner covers everything. A fixed, opaque, top-of-stack surface is the only reliable
 * way to keep the dashboard header out from under a child's hand on a tablet.
 */
function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: C.cream, color: C.ink, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
      touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {children}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center', gap: 14, padding: 30,
      fontFamily: SANS,
    }}>
      {children}
    </div>
  );
}

/** Teacher chrome. The dot counter lives here — the child's screen never shows progress. */
function TopBar({
  onLeave, leaveLabel, audioOn, onAudio, audioLabel, dots, pending, offline, offlineLabel,
  onFinish, finishLabel,
}: {
  onLeave: () => void;
  leaveLabel: string;
  audioOn: boolean;
  onAudio: () => void;
  audioLabel: string;
  dots?: Array<'done' | 'now' | 'todo' | 'skip'>;
  pending?: number;
  offline?: boolean;
  offlineLabel?: string;
  onFinish?: () => void;
  finishLabel?: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '8px 14px', background: 'rgba(255,253,248,.9)',
      borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.inkSoft, fontFamily: SANS,
    }}>
      <Chip onClick={onLeave}>{leaveLabel}</Chip>
      <Chip onClick={onAudio} on={audioOn}>{audioLabel}</Chip>
      {dots && (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', maxWidth: 340 }}>
          {dots.map((state, i) => (
            <span
              key={i}
              style={{
                width: 9, height: 9, borderRadius: '50%',
                background: state === 'done' ? C.moss : state === 'now' ? C.forest : state === 'skip' ? 'transparent' : C.sandDark,
                border: state === 'skip' ? `1.5px solid ${C.sandDark}` : 'none',
                transform: state === 'now' ? 'scale(1.35)' : undefined,
              }}
            />
          ))}
        </div>
      )}
      <span style={{ flex: 1 }} />
      {offline && <span style={{ color: C.clay }}>{offlineLabel}</span>}
      {!!pending && <span>{pending}</span>}
      {onFinish && finishLabel && <Chip onClick={onFinish}>{finishLabel}</Chip>}
    </div>
  );
}

function Chip({ children, onClick, on }: { children: React.ReactNode; onClick: () => void; on?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn btn-sm btn-pill on-light ${on ? 'btn-primary' : 'btn-secondary'}`}
    >
      {children}
    </button>
  );
}

function Card({ children, warm = false }: { children: React.ReactNode; warm?: boolean }) {
  return (
    <div style={{
      background: warm ? '#FDF6E7' : C.paper,
      border: `1px solid ${warm ? C.sandDark : C.line}`,
      borderRadius: 22, padding: '20px 22px', margin: '0 0 18px',
    }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 8, fontFamily: SANS }}>{children}</div>
  );
}

function Segmented({
  options, value, onChange,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {options.map((option) => {
        const on = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`btn btn-md on-light ${on ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: '1 1 auto', minWidth: 92, minHeight: 64 }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function PrimaryButton({
  children, onClick, disabled, wide,
}: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-primary btn-lg on-light${wide ? ' btn-full' : ''}`}
      style={{ touchAction: 'manipulation' }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn btn-secondary btn-lg on-light"
    >
      {children}
    </button>
  );
}

/** The close animation. Same petals every time — it is for having stayed, not for doing well. */
function PetalSky() {
  const petals = Array.from({ length: 9 }, (_, i) => i);
  return (
    <>
      <style>{`
        @keyframes mm-petal {
          0% { transform: translateY(0) rotate(0); opacity: 0 }
          15% { opacity: 1 }
          100% { transform: translateY(120px) rotate(220deg); opacity: 0 }
        }
        @media (prefers-reduced-motion: reduce) { .mm-petal { animation: none !important; opacity: .6 } }
      `}</style>
      <div style={{ position: 'relative', width: '100%', maxWidth: 520, height: 130, overflow: 'hidden' }}>
        {petals.map((i) => (
          <span
            key={i}
            className="mm-petal"
            style={{
              position: 'absolute', width: 16, height: 16, borderRadius: '60% 0 60% 0',
              left: `${6 + i * 10}%`,
              background: i % 2 ? C.gold : C.moss,
              animation: `mm-petal 4.2s linear ${i * 0.42}s infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
}

export default CheckInRunner;
