// lib/montree/tracking/invariants.ts
//
// Rule 10: IT CHECKS ITSELF. Every check the constitution names, run over a
// Ledger, returning either an empty list ("all consistent") or the exact rows
// plus the fix. Pure: the nightly job supplies the data, this decides.

import { workId } from '@/lib/montree/dark-phonics/tracker-works';
import { dayOf, rebuildCurrent, sortEvents, type CurrentMap } from './ledger';
import { LIVE_LETTERS } from './derive';
import { normaliseName, resolveWorkName } from './resolve';
import type { Ledger, Status } from './types';

export type InvariantCode =
  | 'no-key'
  | 'status-without-event'
  | 'cache-journal-drift'
  | 'mastered-letter-missing-work'
  | 'focus-not-in-curriculum'
  | 'duplicate-work-name'
  | 'no-observation-10d'
  | 'legacy-pointer-conflict';

export interface Violation {
  code: InvariantCode;
  childId?: string;
  workKey?: string;
  message: string;
  fix?: string;
}

export interface InvariantOptions {
  /** As-of date, 'YYYY-MM-DD'. Defaults to the latest event day in the ledger. */
  asOf?: string;
  /** The cached current-status table, to diff against the journal. */
  currentTable?: CurrentMap;
  /** Focus-shelf picks to validate against the curriculum. */
  focus?: { childId: string; workName?: string; workKey?: string }[];
  /** The retired montree_child_english_progress pointer, child_id → lesson 1–128. */
  legacyPointers?: Record<string, number>;
}

export const NO_OBSERVATION_DAYS = 10;
const DAY_MS = 86400000;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00.000Z`) - Date.parse(`${a}T00:00:00.000Z`)) / DAY_MS);
}

export function checkInvariants(ledger: Ledger, options: InvariantOptions = {}): Violation[] {
  const out: Violation[] = [];
  const sorted = sortEvents(ledger.events);
  const asOf =
    options.asOf ??
    (sorted.length ? dayOf(sorted[sorted.length - 1].created_at) : new Date().toISOString().slice(0, 10));

  // 1. Rows without a key.
  for (const e of ledger.events) {
    if (!e.work_key) {
      out.push({
        code: 'no-key',
        childId: e.child_id,
        message: `Event "${e.work_name}" (${dayOf(e.created_at)}) has no work_key.`,
        fix: 'Route the name through resolveWorkName(); if it is unknown, queue it instead of writing.',
      });
    }
  }

  // 2. The cache versus the journal. TWO different bugs live here and they have
  //    different fixes, so they are reported as two codes:
  //
  //      status-without-event  the journal has NOTHING for this (child, work). The
  //        row predates the engine, or something wrote around the door (rule 2). A
  //        rebuild would DELETE the status, so the fix is to journal the history
  //        first — which is what migration 347's backfill does, once, for every
  //        pre-engine row. After 347 this count should be zero, and any new one is a
  //        live bypass writer.
  //
  //      cache-journal-drift   the journal HAS events for this pair and they replay
  //        to a different status than the cache holds. The journal is the truth
  //        (rule 3), so the cache is simply stale — a lost write, an interrupted
  //        batch, a hand-edited row. Rebuilding the child fixes it and loses nothing.
  const journal = rebuildCurrent(ledger.events);
  const journalled = new Set<string>();
  for (const e of ledger.events) {
    if (e.work_key) journalled.add(`${e.child_id}\u0000${e.work_key}`);
  }
  if (options.currentTable) {
    for (const [childId, works] of options.currentTable) {
      for (const [workKey, status] of works) {
        const derived: Status = journal.get(childId)?.get(workKey) ?? 'not_started';
        if (derived === status) continue;
        if (!journalled.has(`${childId}\u0000${workKey}`)) {
          out.push({
            code: 'status-without-event',
            childId,
            workKey,
            message: `Cached status '${status}' for ${workKey} with no event in the journal at all.`,
            fix: 'Backfill the journal (migrations/347_progress_journal_backfill.sql). Do NOT rebuild first — a rebuild would erase the status.',
          });
          continue;
        }
        out.push({
          code: 'cache-journal-drift',
          childId,
          workKey,
          message: `Cached status '${status}' for ${workKey} but the journal replays '${derived}'.`,
          fix: 'rebuild child — POST /api/montree/tracking/rebuild for this child; the journal is the truth (rule 3).',
        });
      }
    }
  }

  // 3. A letter a child has mastered work in, whose five works are not all in the curriculum.
  const presentKeys = new Set(ledger.works.map((w) => w.work_key));
  for (const [childId, works] of journal) {
    for (const letter of LIVE_LETTERS) {
      const keys = [1, 2, 3, 4, 5].map((n) => workId(letter, n));
      const anyMastered = keys.some((k) => works.get(k) === 'mastered');
      if (!anyMastered) continue;
      const missing = keys.filter((k) => !presentKeys.has(k));
      for (const key of missing) {
        out.push({
          code: 'mastered-letter-missing-work',
          childId,
          workKey: key,
          message: `Letter '${letter}' is being tracked for this child but ${key} is not in the curriculum.`,
          fix: `Insert ${key} into montree_classroom_curriculum_works.`,
        });
      }
    }
  }

  // 4. A focus work that is not a curriculum work.
  for (const pick of options.focus ?? []) {
    if (pick.workKey && presentKeys.has(pick.workKey)) continue;
    const resolved = pick.workName ? resolveWorkName(pick.workName, ledger.works) : null;
    if (resolved && resolved.kind === 'resolved') continue;
    out.push({
      code: 'focus-not-in-curriculum',
      childId: pick.childId,
      workKey: pick.workKey,
      message: `Focus work ${pick.workKey ?? `"${pick.workName ?? ''}"`} is not in this classroom's curriculum.`,
      fix: 'Clear the focus or add the work to the curriculum.',
    });
  }

  // 5. Two curriculum works sharing a name.
  const byName = new Map<string, string[]>();
  for (const w of ledger.works) {
    const n = normaliseName(w.name);
    byName.set(n, [...(byName.get(n) ?? []), w.work_key]);
  }
  for (const [name, keys] of byName) {
    if (keys.length > 1) {
      out.push({
        code: 'duplicate-work-name',
        message: `${keys.length} works share the name "${name}": ${keys.join(', ')}.`,
        fix: 'Rename or merge — a teacher typing that name can never be resolved.',
      });
    }
  }

  // 6. A child with no observation for ten days.
  for (const child of ledger.children) {
    const mine = sortEvents(ledger.events.filter((e) => e.child_id === child.id));
    const last = mine.length ? dayOf(mine[mine.length - 1].created_at) : null;
    if (!last || daysBetween(last, asOf) >= NO_OBSERVATION_DAYS) {
      out.push({
        code: 'no-observation-10d',
        childId: child.id,
        message: last
          ? `${child.name}: last observation ${last}, ${daysBetween(last, asOf)} days before ${asOf}.`
          : `${child.name}: no observation on record as of ${asOf}.`,
        fix: 'Surface on the teacher dashboard so the child is seen this week.',
      });
    }
  }

  // 7. A surviving 1–128 English pointer. Rule 8 retired it; its presence is
  //    the bug ("Magic e" appearing next to a Dark Phonics ribbon).
  for (const [childId, lesson] of Object.entries(options.legacyPointers ?? {})) {
    if (Number.isFinite(lesson) && lesson >= 1 && lesson <= 128) {
      out.push({
        code: 'legacy-pointer-conflict',
        childId,
        message: `Legacy montree_child_english_progress pointer (lesson ${lesson}) still set; the ribbon is the only English sequence.`,
        fix: 'Delete the row. Nothing may read lesson-map.ts 1–128.',
      });
    }
  }

  return out;
}
