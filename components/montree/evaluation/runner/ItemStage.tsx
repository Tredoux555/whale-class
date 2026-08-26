'use client';

/**
 * One item on screen — the only part of Montree a child ever touches directly.
 *
 * Everything here follows ARCHITECTURE.md §6-D2's interaction rules, and each rule is
 * about a three-year-old rather than about a UI convention:
 *
 *  • Option cards are ≥96 CSS px (~2.5 cm) with ≥24 px of quiet space around them.
 *  • Single tap only, registered on pointer-up, no dwell floor, 12 px movement tolerance
 *    (see useTapGuard) — and the FIRST tap on a new item always registers.
 *  • No progress bar, no timer, no running total. The dot counter is teacher chrome and
 *    lives above the stage, not here.
 *  • FEEDBACK IS NEUTRAL on scored items: the same warm acknowledgement whatever happened.
 *    A child who learns which sound means "right" starts answering the sound instead of
 *    the question, and the evidence stops being about them. Practice items are the only
 *    place a correct/try-again response is allowed, and practice is never recorded.
 *  • The teacher script card is always available and is shown by default whenever audio is
 *    not live, so the whole sitting is deliverable by reading aloud.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BankItem, BankModule } from '@/lib/montree/evaluation/types';
import type { ProjectedStimulus } from '@/lib/montree/evaluation/bank-projection';
import { correctOptionIds, correctSequence, tapsNeeded } from '@/lib/montree/evaluation/runner-engine';
import { bankText } from '../localized';
import { StimulusSvg } from '../StimulusSvg';
import { GuideCharacter } from '../GuideCharacter';
import { useTapGuard, TAP_GUARD_SEQUENCE_MS, TAP_GUARD_SINGLE_MS } from '../useTapGuard';
import { C, SERIF, SANS, TAP_MIN_PX, TAP_GAP_PX } from '../tokens';

export interface ItemAnswer {
  optionIds?: string[];
  sequence?: string[];
  /**
   * FIX B — every option the child touched, in touch order, even when that is not a
   * complete answer. `listen_do` credit is all-or-nothing on the exact order, which loses
   * the difference between "both cards, other way round" and "nothing recognisable". The
   * order is kept here so item analysis can tell those two children apart later; it never
   * changes what the item is worth.
   */
  touchedIds?: string[];
  rubricScore?: number;
  latencyMs: number;
  replayCount: number;
}

const PRACTICE_MAX_TRIES = 2;
const NEUTRAL_ACK_MS = 900;
const PRACTICE_ACK_MS = 1400;
const PRACTICE_RETRY_MS = 1500;

export function ItemStage({
  item,
  module: mod,
  stimulusById,
  practice,
  locale,
  audioLive,
  speak,
  scriptOpen,
  onToggleScript,
  onComplete,
  onNotEngaged,
  labels,
}: {
  item: BankItem;
  module: BankModule | undefined;
  stimulusById: Map<string, ProjectedStimulus>;
  practice: boolean;
  locale: string;
  audioLive: boolean;
  speak: (text: string, lang?: string) => boolean;
  scriptOpen: boolean;
  onToggleScript: () => void;
  /** `answer` is null for practice — practice never becomes part of the record. */
  onComplete: (answer: ItemAnswer | null) => void;
  /**
   * FIX G — the adult's "this child did not engage" control.
   *
   * OPTIONAL, and the control is rendered only when it is supplied: this component is
   * shared with the Lens runner, which has its own flow and must keep the screen it has.
   * When supplied, the item is written down as NOT ADMINISTERED with its own reason — it
   * is never a zero, never an answer, and it lowers coverage like any other gap.
   */
  onNotEngaged?: () => void;
  labels: {
    /** FIX G — supplied only by the caller that also supplies `onNotEngaged`. */
    notEngaged?: string;
    practice: string;
    replay: string;
    showScript: string;
    hideScript: string;
    teacherScript: string;
    sequenceHint: string;
    sequenceDone: string;
    soundNone: string;
    teacherOnly: string;
    thankYou: string;
  };
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [ack, setAck] = useState('');
  const [hint, setHint] = useState<string[] | null>(null);
  const [rubric, setRubric] = useState<number | null>(null);
  const pickedRef = useRef<string[]>([]);
  const lockedRef = useRef(false);
  const triesRef = useRef(0);
  const replayRef = useRef(0);
  const shownAtRef = useRef(Date.now());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const need = tapsNeeded(item);
  const { bind, reset } = useTapGuard(need > 1 ? TAP_GUARD_SEQUENCE_MS : TAP_GUARD_SINGLE_MS, item.id);

  const promptText = bankText(item.prompt?.audio, locale);
  const scriptText = bankText(item.prompt?.teacherScript, locale) || promptText;
  const promptLang = item.promptLang === 'en' ? 'en-GB' : undefined;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  // Fresh item: reset every scrap of the previous one, then narrate.
  useEffect(() => {
    pickedRef.current = [];
    lockedRef.current = false;
    setPicked([]);
    setLocked(false);
    setAck('');
    setHint(null);
    setRubric(null);
    triesRef.current = 0;
    replayRef.current = 0;
    shownAtRef.current = Date.now();
    reset();
    const timer = setTimeout(() => { speak(promptText, promptLang); }, 260);
    return () => {
      clearTimeout(timer);
      clearTimers();
    };
    // Deliberately keyed on the item only: re-narrating because a callback identity
    // changed would talk over the child mid-answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const neutralAck = useMemo(() => (
    bankText(item.feedback?.neutral, locale)
    || bankText(mod?.neutralFeedback, locale)
    || labels.thankYou
  ), [item, mod, locale, labels.thankYou]);

  const settle = useCallback((answer: ItemAnswer, ok: boolean) => {
    if (!practice) {
      setAck(neutralAck);
      speak(neutralAck, promptLang);
      later(() => onComplete(answer), NEUTRAL_ACK_MS);
      return;
    }
    // Practice only — the one place encouragement is allowed.
    triesRef.current += 1;
    if (ok) {
      const line = bankText(item.feedback?.correct, locale) || labels.thankYou;
      setAck(line);
      speak(line, promptLang);
      later(() => onComplete(null), PRACTICE_ACK_MS);
      return;
    }
    if (triesRef.current < PRACTICE_MAX_TRIES) {
      const line = bankText(item.feedback?.tryAgain, locale);
      setAck(line);
      if (line) speak(line, promptLang);
      later(() => {
        pickedRef.current = [];
        lockedRef.current = false;
        setPicked([]);
        setLocked(false);
        setAck('');
        reset();
        later(() => speak(promptText, promptLang), 200);
      }, PRACTICE_RETRY_MS);
      return;
    }
    // Second miss on a practice item: show where it was, warmly, and move on.
    const keys = correctOptionIds(item).length ? correctOptionIds(item) : correctSequence(item);
    setHint([...keys]);
    const line = bankText(item.feedback?.correct, locale) || labels.thankYou;
    setAck(line);
    speak(line, promptLang);
    later(() => onComplete(null), PRACTICE_ACK_MS + 300);
  }, [practice, neutralAck, speak, promptLang, later, onComplete, item, locale, labels.thankYou, promptText, reset]);

  /**
   * The picked list is kept in a ref as well as in state on purpose. Deciding the answer
   * inside a `setPicked(prev => …)` updater would put a side effect in a function React is
   * free to call twice (StrictMode does exactly that), and the child would have their
   * answer recorded twice. The ref is the truth; the state is only there to redraw.
   */
  const handleOption = useCallback((optionId: string) => {
    if (lockedRef.current) return;
    if (pickedRef.current.includes(optionId)) return;
    const next = [...pickedRef.current, optionId];
    pickedRef.current = next;
    setPicked(next);
    if (next.length < need) return;

    lockedRef.current = true;
    setLocked(true);
    const latencyMs = Date.now() - shownAtRef.current;
    if (need > 1) {
      const seq = correctSequence(item);
      const ok = next.length === seq.length && next.every((x, i) => x === seq[i]);
      settle({ optionIds: next, sequence: next, touchedIds: next, latencyMs, replayCount: replayRef.current }, ok);
    } else {
      const ok = correctOptionIds(item).includes(optionId);
      settle({ optionIds: next, touchedIds: next, latencyMs, replayCount: replayRef.current }, ok);
    }
  }, [need, item, settle]);

  /**
   * A child may touch fewer cards than the instruction asked for. The teacher closes the
   * answer with whatever was touched — the sitting never gets stuck on a screen.
   */
  const finishSequence = useCallback(() => {
    if (lockedRef.current || !picked.length) return;
    lockedRef.current = true;
    setLocked(true);
    const seq = correctSequence(item);
    const ok = picked.length === seq.length && picked.every((x, i) => x === seq[i]);
    settle({
      optionIds: picked, sequence: picked, touchedIds: picked,
      latencyMs: Date.now() - shownAtRef.current, replayCount: replayRef.current,
    }, ok);
  }, [locked, picked, item, settle]);

  const handleRubric = useCallback((score: number) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setRubric(score);
    setLocked(true);
    settle({
      rubricScore: score,
      latencyMs: Date.now() - shownAtRef.current,
      replayCount: replayRef.current,
    }, score > 0);
  }, [locked, settle]);

  const replay = useCallback(() => {
    replayRef.current += 1;
    speak(promptText, promptLang);
  }, [speak, promptText, promptLang]);

  const options = item.options ?? [];
  const columns = options.length === 3 ? 3 : 2;
  const isOral = item.type === 'teacher_scored_oral';
  const rubricDef = item.scoring?.rubric ?? null;

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      padding: '14px 18px 26px', maxWidth: 1240, margin: '0 auto', width: '100%',
      fontFamily: SANS, color: C.ink,
    }}>
      {/* Prompt row: guide, the practice label (never a question number), replay */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '6px 0 14px' }}>
        <GuideCharacter size={88} />
        <div style={{ flex: 1, fontFamily: SERIF, fontSize: 20, color: C.inkSoft }}>
          {practice ? labels.practice : ''}
        </div>
        <button
          type="button"
          onClick={replay}
          aria-label={labels.replay}
          style={{
            width: TAP_MIN_PX, height: TAP_MIN_PX, minWidth: TAP_MIN_PX, minHeight: TAP_MIN_PX,
            borderRadius: '50%', background: C.sand, border: `3px solid ${C.sandDark}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
            cursor: 'pointer', touchAction: 'manipulation',
          }}
        >
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9v6h4l5 4V5L8 9H4z" fill={C.moss} stroke={C.ink} />
            <path d="M17 8.5a5 5 0 0 1 0 7" />
            <path d="M19.5 6a8.5 8.5 0 0 1 0 12" />
          </svg>
        </button>
      </div>

      {/* The material */}
      {isOral ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 10 }}>
            {item.stimulusIds?.[0]
              ? <div style={{ width: 'min(58vh, 420px)' }}><StimulusSvg stimulus={stimulusById.get(item.stimulusIds[0])} maxHeight={420} /></div>
              : <div style={{ fontFamily: SERIF, fontSize: 26, textAlign: 'center' }}>{promptText}</div>}
          </div>
          {rubricDef && (
            <div style={{
              background: C.paper, border: `2px solid ${C.forest}`, borderRadius: 20,
              padding: '16px 18px', marginTop: 14,
            }}>
              <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 8 }}>
                {labels.teacherOnly} · {scriptText}
              </div>
              {rubricDef.levels.map((level) => (
                <button
                  key={level.score}
                  type="button"
                  onClick={() => handleRubric(level.score)}
                  disabled={locked}
                  style={{
                    display: 'flex', gap: 14, alignItems: 'flex-start', width: '100%', textAlign: 'left',
                    padding: '14px 16px', minHeight: 72, marginBottom: 10, borderRadius: 16,
                    background: rubric === level.score ? '#F2F6EE' : C.paper,
                    border: `2px solid ${rubric === level.score ? C.forest : C.sandDark}`,
                    cursor: locked ? 'default' : 'pointer', touchAction: 'manipulation',
                  }}
                >
                  <span style={{
                    width: 40, height: 40, flex: '0 0 auto', borderRadius: 12,
                    background: rubric === level.score ? C.forest : C.sand,
                    color: rubric === level.score ? '#fff' : C.ink,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  }}>{level.score}</span>
                  <span style={{ fontSize: 15 }}>{bankText(level.descriptor, locale)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{
            display: 'grid', gap: TAP_GAP_PX, flex: 1, alignContent: 'center',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}>
            {options.map((option) => {
              const isPicked = picked.includes(option.id);
              const order = picked.indexOf(option.id) + 1;
              const isHinted = hint?.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  {...bind(() => handleOption(option.id))}
                  style={{
                    position: 'relative', background: C.paper,
                    border: `3px solid ${isHinted ? C.gold : isPicked ? C.moss : C.sandDark}`,
                    boxShadow: isPicked ? `0 0 0 6px rgba(124,154,99,.22)`
                      : isHinted ? `0 0 0 6px rgba(216,162,74,.22)` : 'none',
                    borderRadius: 26, minHeight: `min(38vh, 260px)`, minWidth: TAP_MIN_PX,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
                    cursor: 'pointer', touchAction: 'manipulation',
                    userSelect: 'none', WebkitUserSelect: 'none',
                  }}
                >
                  {need > 1 && isPicked && (
                    <span style={{
                      position: 'absolute', top: 10, left: 10, width: 40, height: 40, borderRadius: '50%',
                      background: C.moss, color: '#fff', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                    }}>{order}</span>
                  )}
                  <StimulusSvg stimulus={stimulusById.get(option.stimulusId)} />
                </button>
              );
            })}
          </div>
          {need > 1 && (
            <div style={{ textAlign: 'center', color: C.inkSoft, fontSize: 14, marginTop: 10 }}>
              {labels.sequenceHint}
              {picked.length > 0 && !locked && (
                <button
                  type="button"
                  onClick={finishSequence}
                  style={{
                    marginLeft: 10, minHeight: 44, padding: '8px 16px', borderRadius: 999,
                    border: `1px solid ${C.line}`, background: C.paper, cursor: 'pointer',
                  }}
                >
                  {labels.sequenceDone}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Acknowledgement — one warm line, identical whatever happened on a scored item. */}
      <div style={{
        textAlign: 'center', fontFamily: SERIF, fontSize: 20, color: C.moss,
        minHeight: 34, marginTop: 10, opacity: ack ? 1 : 0, transition: 'opacity .2s',
      }}>
        {ack}
      </div>

      {/* Teacher script — open by default whenever audio is not live. */}
      <div style={{ width: '100%', maxWidth: 780, margin: '14px auto 0' }}>
        {/* FIX G — the adult's way out of a screen the child has not taken up. Small,
            adult-coloured and set apart from the option cards, because it is not for the
            child and must never be tapped instead of an answer. Practice items are never
            part of the record, so the control is not offered there. */}
        {onNotEngaged && !practice && !locked && (
          <button
            type="button"
            onClick={() => { setLocked(true); lockedRef.current = true; onNotEngaged(); }}
            style={{
              border: `1px dashed ${C.sandDark}`, borderRadius: 999, padding: '9px 16px',
              background: 'transparent', fontSize: 13, minHeight: 40, cursor: 'pointer',
              color: C.inkSoft, marginRight: 10, touchAction: 'manipulation',
            }}
          >
            {labels.notEngaged}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleScript}
          style={{
            border: `1px solid ${C.line}`, borderRadius: 999, padding: '9px 16px',
            background: C.paper, fontSize: 13, minHeight: 40, cursor: 'pointer',
          }}
        >
          {scriptOpen || !audioLive ? labels.hideScript : labels.showScript}
        </button>
        {(scriptOpen || !audioLive) && (
          <div style={{
            border: `2px dashed ${C.sandDark}`, background: '#FDF6E7', borderRadius: 16,
            padding: '14px 16px', marginTop: 12, fontSize: 15, color: C.inkSoft, lineHeight: 1.5,
          }}>
            <b style={{ color: C.ink }}>{labels.teacherScript}:</b> {scriptText}
            {!audioLive && (
              <div style={{ fontSize: 12.5, marginTop: 6 }}>{labels.soundNone}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ItemStage;
