// lib/montree/tracking/readers-ledger.ts
//
// The READ side's minimal Supabase → Ledger loader (agent D, 2026-09-06).
//
// Rule 8 says every human-facing string is derived from the journal at read
// time. To derive anything the engine needs a Ledger, and a Ledger is four
// plain arrays: events, works, children, plus the class's current letter.
// This file is the smallest honest way to fill them in from the tables that
// exist today:
//
//   events   ← montree_progress_events          (rule 3, the journal)
//   works    ← montree_classroom_curriculum_works (rule 1, one work one key)
//   children ← montree_children                  (+ gender → pronoun)
//   letter   ← montree_class_dark_phonics_week   (migration 344)
//
// ✅ SWAPPED 2026-09-06: agent C's lib/montree/tracking/persistence.ts landed
// during this build, so this file no longer runs its own queries — it is a
// thin READER-SIDE wrapper over persistence.loadLedger() that keeps two
// reader-specific guarantees the engine loader deliberately does not make:
//
//   1. `weekStarts` MERGES the caller's weeks into the computed span rather
//      than replacing it, so a report for a silent week still renders while
//      the surrounding term stays available to the flag derivations.
//   2. A load failure NEVER escapes. A parent's report, a weekly summary or
//      the language tracker must degrade to "nothing to say" (rule 11), not
//      to a 500.
//
// Every reader in this repo imports loadReaderLedger() and nothing else, so
// this stays the one seam if the loader moves again.

import type { UntypedClient } from '@/lib/supabase-client';
import { loadLedger } from './persistence';
import type { Ledger, WorkGroup } from './types';

export interface LoadLedgerOptions {
  classroomId: string;
  /** Narrow the journal + roster to these children. Omit for the whole class. */
  childIds?: string[];
  /**
   * Extra Mondays the caller wants present in ledger.weekStarts even if no
   * event fell in them. MERGED with the computed span, never replacing it.
   */
  weekStarts?: string[];
  /** Ignore journal rows older than this 'YYYY-MM-DD'. Default: no floor. */
  since?: string;
  /** The day the derivations are "as of". Default: today (UTC). */
  asOf?: string;
}

/** Monday-anchored 'YYYY-MM-DD' for the week containing `iso`. */
export function mondayOf(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00.000Z` : iso);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d.toISOString().slice(0, 10);
}

/** Rule 1's key prefixes decide the group — never the work's free-text name. */
export function groupOf(workKey: string): WorkGroup {
  if (workKey.startsWith('dp:')) return 'dark-phonics';
  if (workKey.startsWith('ws:')) return 'writing-shelf';
  return 'other';
}

/** An empty but valid Ledger — what a reader gets when the load fails. */
export function emptyLedger(): Ledger {
  return { events: [], works: [], children: [], classWeekLetter: '', weekStarts: [] };
}

/**
 * Build a Ledger for one classroom, for a reader. Never throws.
 */
export async function loadReaderLedger(
  supabase: UntypedClient,
  opts: LoadLedgerOptions,
): Promise<Ledger> {
  let ledger: Ledger;
  try {
    ledger = await loadLedger(supabase as unknown as Parameters<typeof loadLedger>[0], {
      classroomId: opts.classroomId,
      childIds: opts.childIds,
      since: opts.since,
      asOf: opts.asOf,
    });
  } catch (err) {
    console.error('[readers-ledger] load failed — degrading to an empty ledger:', err);
    return emptyLedger();
  }

  const extra = (opts.weekStarts ?? []).map(mondayOf);
  if (extra.length === 0) return ledger;
  return {
    ...ledger,
    weekStarts: [...new Set([...ledger.weekStarts, ...extra])].sort(),
  };
}
