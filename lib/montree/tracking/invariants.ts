// lib/montree/tracking/invariants.ts
//
// Rule 10: IT CHECKS ITSELF. Every check the constitution names, run over a
// Ledger, returning either an empty list ("all consistent") or the exact rows
// plus the fix. Pure: the nightly job supplies the data, this decides.

import { workId } from '@/lib/montree/dark-phonics/tracker-works';
import { dayOf, rebuildCurrent, sortEvents, tzOf, type CurrentMap } from './ledger';
import { LIVE_LETTERS } from './derive';
import { normaliseName, resolveWorkName } from './resolve';
import type { CurriculumWork, Ledger, Status } from './types';

export type InvariantCode =
  | 'no-key'
  | 'status-without-event'
  | 'cache-journal-drift'
  | 'cache-row-missing'
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
  /**
   * How many underlying rows this one line stands for. Present on GROUPED
   * violations ('no-key'), absent on the one-row-one-line checks. See
   * groupKeyless() — the Whale class produced 1,145 keyless events across 388
   * distinct names, and 1,145 identical lines is not something a human reads.
   */
  count?: number;
  /** Distinct children affected, on a grouped violation. */
  childCount?: number;
  /** The raw name the group is keyed on, on a grouped violation. */
  workName?: string;
  /** Up to SAMPLE_CHILDREN child ids, so a teacher can start somewhere. */
  sampleChildIds?: string[];
}

/** At most this many child ids are carried on a grouped violation. */
export const SAMPLE_CHILDREN = 5;

export interface KeylessRow {
  childId: string;
  workName: string;
  /** 'event' (montree_progress_events) or 'cache' (montree_child_progress). */
  origin?: 'event' | 'cache';
  /** Only meaningful for cache rows. */
  status?: string;
}

/**
 * RULE 10, MADE READABLE. One line per DISTINCT work name, carrying the row
 * count, the number of children and a handful of ids — never one line per row.
 *
 * A name that the ONE reader can resolve against this classroom's curriculum is
 * reported differently from one it cannot, because the fixes are different:
 * a resolvable name is a migration (349 repairs it in place), an unresolvable
 * one is a human decision in the review queue. Sorted by count descending, so
 * the biggest repair is the first thing on the page.
 */
export function groupKeyless(
  rows: readonly KeylessRow[],
  works: readonly CurriculumWork[] = [],
): Violation[] {
  const groups = new Map<string, { name: string; count: number; children: Set<string> }>();
  for (const row of rows) {
    const name = (row.workName || '').trim() || '(no name)';
    const k = normaliseName(name) || name;
    const g = groups.get(k) ?? { name, count: 0, children: new Set<string>() };
    g.count += 1;
    if (row.childId) g.children.add(row.childId);
    groups.set(k, g);
  }
  const out: Violation[] = [];
  for (const g of [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))) {
    const resolved = works.length ? resolveWorkName(g.name, works) : null;
    const children = [...g.children];
    const rowWord = g.count === 1 ? 'row' : 'rows';
    const childWord = children.length === 1 ? 'child' : 'children';
    out.push({
      code: 'no-key',
      workName: g.name,
      count: g.count,
      childCount: children.length,
      sampleChildIds: children.slice(0, SAMPLE_CHILDREN),
      childId: children.length === 1 ? children[0] : undefined,
      workKey: resolved?.kind === 'resolved' ? resolved.key : undefined,
      message:
        resolved?.kind === 'resolved'
          ? `"${g.name}" — ${g.count} keyless ${rowWord} across ${children.length} ${childWord}; the name resolves to ${resolved.key} ("${resolved.name}", ${resolved.method}).`
          : `"${g.name}" — ${g.count} keyless ${rowWord} across ${children.length} ${childWord}; the name does not resolve to exactly one work in this classroom${
              resolved?.kind === 'unknown' && resolved.reason === 'ambiguous'
                ? ` (${resolved.candidates.length} works answer to it)`
                : ''
            }.`,
      fix:
        resolved?.kind === 'resolved'
          ? 'Repairable in place — migrations/349_progress_keys_backfill.sql writes this key by unique name match.'
          : 'Not repairable automatically (rule 5): send it to the review queue and let a teacher choose, or rename the duplicate curriculum rows.',
    });
  }
  return out;
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
  const tz = tzOf(ledger);
  const sorted = sortEvents(ledger.events);
  const asOf =
    options.asOf ??
    (sorted.length ? dayOf(sorted[sorted.length - 1].created_at, tz) : new Date().toISOString().slice(0, 10));

  // 1. Rows without a key — GROUPED BY NAME (2026-09-06 burn-in). One line per
  //    event produced 1,145 lines for one classroom, all saying the same thing
  //    about 388 names. One line per name, biggest first, says the same thing in
  //    a form a teacher can act on: which name, how many rows, how many children,
  //    and whether the reader can resolve it (→ migration 349) or not (→ queue).
  out.push(
    ...groupKeyless(
      ledger.events
        .filter((e) => !e.work_key)
        .map((e) => ({ childId: e.child_id, workName: e.work_name, origin: 'event' as const })),
      ledger.works,
    ),
  );

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
  const journal = rebuildCurrent(ledger.events, tz);
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

    // 2b. THE OTHER DIRECTION (audit 08-verify-tracking §1/§8a). Check 2 above only
    //     ever walks the CACHE, so a cache row that has been DELETED — by the
    //     duplicates merge, by a hand-run DELETE, by a dropped write — is invisible
    //     to rule 10 while the journal still proves the child reached that rung.
    //     A rebuild restores it, which is why the fix is the rebuild and not a
    //     backfill: the journal already has everything needed.
    for (const [childId, works] of journal) {
      const cached = options.currentTable.get(childId);
      for (const [workKey, derived] of works) {
        if (derived === 'not_started') continue;
        if (cached && cached.has(workKey)) continue;
        out.push({
          code: 'cache-row-missing',
          childId,
          workKey,
          message: `The journal replays '${derived}' for ${workKey} but there is no montree_child_progress row for it.`,
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
    const last = mine.length ? dayOf(mine[mine.length - 1].created_at, tz) : null;
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
