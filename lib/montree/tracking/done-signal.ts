// lib/montree/tracking/done-signal.ts
//
// RULE 11 — NOTHING IS LOST, NOTHING IS GUESSED.
//
// A digital work or a live lesson that a child finishes is a real observation.
// Until now it evaporated: ShelfPlayer's every stage handed its completion to
// `() => undefined`. This module is the one place that turns such a completion
// into a journalled event — and, just as importantly, the one place that
// REFUSES to when the child is not known.
//
//   * KNOWN CHILD  → POST /api/montree/progress/event, status 'practicing',
//                    source 'digital' | 'live'. The door (write-progress.ts)
//                    still owns the ladder: it will no-op if the child is
//                    already at or above 'practicing', and it journals the
//                    change. Nothing here decides progress; it only reports.
//   * NO CHILD ID  → write NOTHING, return 'skipped'. A shelf opened from the
//                    parent portal or a dev preview has no child identity, and
//                    a guessed child is worse than a lost observation.
//   * NO WORK KEY  → write NOTHING (rule 1: no key, no write). The tracing
//                    workbook is exactly this case: it is not one of the five
//                    tracked works, so it carries no key and emits nothing.
//
// WHY 'practicing' AND NOT 'mastered': the child worked the material through
// to the end on a screen. That is practice, observed. Mastery is a teacher's
// judgement (rule 4's ladder is climbed by evidence, not by completion), so a
// digital finish can never award the top rung.
//
// Fire-and-forget by design: a failed signal is logged and swallowed. A child
// must never see an error, or a stalled screen, because a progress row did not
// land.

import { workId } from '@/lib/montree/dark-phonics/tracker-works';

/** The two signal sources rule 3 reserves for machine-observed completion. */
export type DoneSource = 'digital' | 'live';

/** The rung a completed digital/live work reports. Never 'mastered'. */
export const DONE_STATUS = 'practicing' as const;

/** The API-contract endpoint (ENGINE_V2_PLAN.md). Agent C owns the route. */
export const EVENT_ENDPOINT = '/api/montree/progress/event';

export interface DoneSignal {
  /** The child who did the work. Undefined/null ⇒ nothing is written. */
  childId?: string | null;
  /** `dp:<letter>:<n>` / `ws:<tray>`. Undefined/null ⇒ nothing is written. */
  workKey?: string | null;
  source: DoneSource;
  /** Who/what observed it, for the journal. */
  actor?: string | null;
  classroomId?: string | null;
}

export type DoneOutcome = 'sent' | 'skipped' | 'failed';

/**
 * Report one completed work. Returns 'skipped' when the child or the key is
 * unknown — the caller does not need to check first, and MUST NOT invent
 * either value to get past the guard.
 */
export async function emitDone(signal: DoneSignal): Promise<DoneOutcome> {
  const childId = signal.childId?.trim?.() || null;
  const workKey = signal.workKey?.trim?.() || null;

  // Rule 11 + rule 1. Both halves of the guard are load-bearing.
  if (!childId || !workKey) return 'skipped';

  try {
    const res = await fetch(EVENT_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: childId,
        work: workKey,
        status: DONE_STATUS,
        source: signal.source,
        actor: signal.actor ?? null,
        classroom_id: signal.classroomId ?? null,
      }),
    });
    return res.ok ? 'sent' : 'failed';
  } catch {
    // A child's screen never breaks because the journal was unreachable.
    return 'failed';
  }
}

/**
 * The five tracked works, addressed by the v2-shelf stage that teaches them.
 *
 * The shelf's internal ids (`work1`..`work4`) predate the 2026-09-06
 * renumbering and were deliberately NOT renamed (see v2-shelf/stages.ts), so
 * the +1 offset lives here, once, in the only place that crosses from the
 * shelf's vocabulary into the tracker's.
 *
 *   CharacterStrip (inside the 'book' stage) → Work 1  Characters
 *   work1 → Work 2  Picture match
 *   work2 → Work 3  Sentence & picture match
 *   work3 → Work 4  Sentence builder (guided)
 *   work4 → Work 5  Sentence builder (free)
 *   trace → (nothing: the tracing workbook is not one of the five)
 */
export type ShelfStageKey = 'characters' | 'work1' | 'work2' | 'work3' | 'work4' | 'trace';

const STAGE_TO_WORK_N: Partial<Record<ShelfStageKey, number>> = {
  characters: 1,
  work1: 2,
  work2: 3,
  work3: 4,
  work4: 5,
};

/** `dp:<letter>:<n>` for a shelf stage, or null when the stage is untracked. */
export function shelfWorkKey(letter: string | null | undefined, stage: ShelfStageKey): string | null {
  const n = STAGE_TO_WORK_N[stage];
  if (!n) return null;
  const l = letter?.trim?.();
  if (!l) return null;
  return workId(l, n);
}
