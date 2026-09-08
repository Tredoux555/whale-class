// tests/tracking/rebuild-parity.test.ts
//
// TWO REBUILDS, ONE ANSWER (audit 08-verify-tracking §3).
//
// Rule 3 says montree_child_progress is a cache of montree_progress_events, and
// there are TWO implementations of that rebuild:
//
//   * lib/montree/tracking/persistence.ts rebuiltRowsFor() — replays the journal
//     through the engine (applyEvent), so it re-evaluates every row.
//   * montree_rebuild_child_progress(uuid) — SQL, for the nightly job and for a
//     whole-school rebuild. It picks "the newest row that changed something".
//
// Migration 346 argued the two agreed because backward moves are never journalled
// as changes. They were — that is the §2 defect — so the two disagreed: the audit
// executed both on one journal and got SQL 'practicing' against JS 'mastered'.
// Whichever ran last decided the child's record.
//
// Migration 348 rewrote the SQL to apply the ledger's own refusals before choosing.
// SQL cannot be executed here (no database in the test environment), so what is
// asserted is the SELECTION RULE: sqlRebuildMirror() below is a line-by-line
// transcription of the function's CTE, and it must agree with the engine on every
// fixture. If you change one, this test tells you to change the other.
//
// MIGRATION 349 v3 REDEFINED THE FUNCTION and the mirror moved with it. 348 chose
// its winner per COALESCE(work_key, work_name) and then collapsed to one row per
// work_name for an ON CONFLICT (child_id, work_name) upsert. That is name-shaped;
// rule 1 is key-shaped. One work_key appearing in the journal under TWO names —
// the keyed row's name and the legacy spelling 349 §2 journals with the key
// attached — produced a second row for one key, and 348's own partial unique index
// on (child_id, work_key) refused it: 23505 in production, twice. The function is
// now KEYED — one row per work_key, addressed by key and only then by name — which
// is what rebuiltRowsFor() has always done.

import { describe, it, expect } from 'vitest';
import { rebuiltRowsFor } from '@/lib/montree/tracking/persistence';
import type { ProgressEvent, Status } from '@/lib/montree/tracking/types';

/* ------------------------------------------------------------------------- */
/* The mirror of migrations/348_tracking_engine_fixes.sql §1.                 */
/* ------------------------------------------------------------------------- */

const RANK: Record<string, number> = {
  not_started: 0, presented: 1, practicing: 2, mastered: 3, completed: 3,
};
const rank = (s: string | null | undefined) => RANK[String(s ?? '').toLowerCase()] ?? 0;

/** lower(source) IN ('correction','teacher_correction') — the SQL's is_correction. */
const isCorrection = (s: string | null | undefined) =>
  ['correction', 'teacher_correction'].includes(String(s ?? '').toLowerCase());

const hasReason = (r: string | null | undefined) => String(r ?? '').trim() !== '';

/**
 * montree_rebuild_child_progress()'s status choice per work, in TypeScript.
 * Deliberately written against the ROW SHAPE, not the engine: it must be able to
 * disagree with the engine, or it is not a test.
 */
export function sqlRebuildMirror(
  childId: string,
  events: readonly ProgressEvent[],
): Map<string, string> {
  const changes = events.filter(
    (e) =>
      e.child_id === childId &&
      !!e.work_key &&
      !!e.work_name &&
      e.old_status !== e.new_status, // old_status IS DISTINCT FROM new_status
  );

  // WHERE NOT (is_correction AND NOT reasoned_correction)
  //   AND NOT (new_rank < old_rank AND NOT reasoned_correction)
  const accepted = changes.filter((e) => {
    const reasoned = isCorrection(e.source) && hasReason(e.reason);
    if (isCorrection(e.source) && !reasoned) return false;
    if (rank(e.new_status) < rank(e.old_status) && !reasoned) return false;
    return true;
  });

  // ROW_NUMBER() OVER (PARTITION BY work_key ORDER BY created_at DESC, id DESC) = 1
  // 349 v3: the partition is the KEY. One work, one key, one row.
  const latest = new Map<string, ProgressEvent>();
  for (const e of accepted) {
    const held = latest.get(e.work_key as string);
    if (!held || Date.parse(e.created_at) >= Date.parse(held.created_at)) {
      latest.set(e.work_key as string, e);
    }
  }

  const out = new Map<string, string>();
  for (const e of latest.values()) {
    const status = String(e.new_status).toLowerCase() === 'completed' ? 'mastered' : e.new_status;
    out.set(e.work_key as string, status);
  }
  return out;
}

/**
 * The `names` CTE: the name a NEW cache row is filed under is the most recent
 * STATUS-CHANGING journal name for the key. Evidence rows are not names.
 */
export function sqlRebuildNames(
  childId: string,
  events: readonly ProgressEvent[],
): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of events) {
    if (e.child_id !== childId || !e.work_key || !e.work_name) continue;
    if (e.old_status === e.new_status) continue;
    out.set(e.work_key, e.work_name); // fixtures are chronological: the last wins
  }
  return out;
}

/* ------------------------------------------------------------------------- */

const CHILD = 'c1';
let clock = 0;
function ev(
  work: string,
  key: string,
  old: Status | null,
  next: Status,
  source: ProgressEvent['source'],
  reason: string | null = null,
): ProgressEvent {
  clock += 1;
  return {
    child_id: CHILD, classroom_id: 'room', work_key: key, work_name: work, area: 'language',
    old_status: old, new_status: next, source, actor: 't',
    // One event per DAY: rule 4's same-day dedupe allows one ladder move per
    // (child, work) per day, so a fixture packed into one morning would replay as
    // a single move and prove nothing about the selection rule.
    created_at: new Date(Date.UTC(2026, 8, clock, 2, 0)).toISOString(),
    reason, evidence_id: null,
  };
}

function jsStatuses(events: ProgressEvent[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const row of rebuiltRowsFor(CHILD, events)) out.set(row.work_key, row.status);
  return out;
}

describe('rule 3 — the SQL rebuild and the engine rebuild derive the same statuses', () => {
  const cases: Array<[string, ProgressEvent[]]> = [
    [
      'a plain forward climb',
      [
        ev('t Dark Phonics work 3', 'dp:t:3', null, 'presented', 'tap'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'presented', 'practicing', 'tap'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'practicing', 'mastered', 'photo'),
      ],
    ],
    [
      'THE §3 CASE — a downgrade journalled without a reason (the SQL used to take it)',
      [
        ev('t Dark Phonics work 3', 'dp:t:3', null, 'presented', 'tap'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'presented', 'mastered', 'tap'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'mastered', 'practicing', 'tap'),
      ],
    ],
    [
      'a downgrade as a correction WITH a reason — both must take it',
      [
        ev('t Dark Phonics work 3', 'dp:t:3', null, 'mastered', 'tap'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'mastered', 'practicing', 'correction', 'wrong child'),
      ],
    ],
    [
      'a correction with NO reason — both must refuse it',
      [
        ev('t Dark Phonics work 3', 'dp:t:3', null, 'practicing', 'tap'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'practicing', 'mastered', 'correction', null),
      ],
    ],
    [
      'evidence rows (old = new) never decide a status',
      [
        ev('t Dark Phonics work 3', 'dp:t:3', null, 'presented', 'tap'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'presented', 'presented', 'photo'),
      ],
    ],
    [
      'several works at once, mixed sources',
      [
        ev('s Dark Phonics work 1', 'dp:s:1', null, 'presented', 'tap'),
        ev('s Dark Phonics work 1', 'dp:s:1', 'presented', 'mastered', 'photo'),
        ev('Writing Shelf tray 2', 'ws:2', null, 'presented', 'digital'),
        ev('t Dark Phonics work 3', 'dp:t:3', null, 'presented', 'import'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'presented', 'practicing', 'ai'),
      ],
    ],
    [
      'a correction that RAISES the rung, with a reason',
      [
        ev('t Dark Phonics work 3', 'dp:t:3', null, 'presented', 'tap'),
        ev('t Dark Phonics work 3', 'dp:t:3', 'presented', 'mastered', 'correction', 'confirmed on video'),
      ],
    ],
  ];

  it.each(cases)('%s', (_label, events) => {
    expect(Object.fromEntries(sqlRebuildMirror(CHILD, events))).toEqual(
      Object.fromEntries(jsStatuses(events)),
    );
  });

  it('349 v3: ONE key under TWO work_names yields ONE row (the second production 23505)', () => {
    // The failure of 2026-09-08. The child holds a keyed row filed under
    // "Sentence Building (Card Set)"; 349 §2 merges the legacy keyless row
    // "Sentence Building" into it and journals the merge WITH the key attached.
    // 348's function partitioned by name, so it produced a winner for each
    // spelling and aimed two INSERTs at one (child_id, work_key) —
    // 23505 on idx_montree_child_progress_child_work_key. Keyed, there is one.
    const events = [
      ev('Sentence Building', 'la_sentence_building', null, 'mastered', 'tap'),
      ev('Sentence Building (Card Set)', 'la_sentence_building', 'mastered', 'presented', 'tap'),
    ];
    const mirrored = sqlRebuildMirror(CHILD, events);
    expect(mirrored.size, 'one row per work_key').toBe(1);
    // The unreasoned downgrade is refused by both, so the newest ACCEPTED row wins.
    expect(mirrored.get('la_sentence_building')).toBe('mastered');
    expect(jsStatuses(events).get('la_sentence_building')).toBe('mastered');
  });

  it('349 v3: the merge EVIDENCE row documents and decides nothing', () => {
    // 349 §2 writes old_status = new_status = the legacy row's own status, source
    // 'correction' with a reason. v2 wrote <status> → 'not_started', which is the
    // one shape rule 4 accepts as a deliberate downgrade — §6's rebuild took it and
    // would have knocked the surviving keyed row down to not_started.
    const events = [
      ev('Sentence Building (Card Set)', 'la_sentence_building', null, 'mastered', 'tap'),
      ev('Sentence Building', 'la_sentence_building', 'mastered', 'mastered', 'correction',
        '349: legacy row "Sentence Building" (mastered) merged into keyed row la_sentence_building'),
    ];
    expect(jsStatuses(events).get('la_sentence_building')).toBe('mastered');
    expect(sqlRebuildMirror(CHILD, events).get('la_sentence_building')).toBe('mastered');
    // …and it does not rename the work to the spelling it just retired.
    expect(sqlRebuildNames(CHILD, events).get('la_sentence_building'))
      .toBe('Sentence Building (Card Set)');
    expect(rebuiltRowsFor(CHILD, events)[0].work_name).toBe('Sentence Building (Card Set)');
  });

  it('a v2-shaped merge row would have downgraded the keeper — both refuse it now', () => {
    const evidence = [
      ev('Sentence Building (Card Set)', 'la_sentence_building', null, 'mastered', 'tap'),
      ev('Sentence Building', 'la_sentence_building', 'mastered', 'not_started', 'correction',
        '349 v2: legacy row merged'),
    ];
    // The v2 shape IS a reasoned correction, so the ledger takes it. That is the
    // defect, recorded here so nobody re-introduces the shape.
    expect(jsStatuses(evidence).get('la_sentence_building')).toBe('not_started');
    expect(sqlRebuildMirror(CHILD, evidence).get('la_sentence_building')).toBe('not_started');
  });

  it('two keys under one work_name: both survive the rebuild, one reaches the cache', () => {
    // (child_id, work_name) has been unique since migration 111, so the child
    // cannot hold both rows. The keyed rebuild derives BOTH statuses — nothing is
    // silently merged — and the writer reports the one it cannot file. 348 hid this
    // by collapsing to one row per name.
    const events = [
      ev('Sandpaper Letters', 'lang:sandpaper-a', null, 'presented', 'tap'),
      ev('Sandpaper Letters', 'lang:sandpaper-b', null, 'practicing', 'tap'),
    ];
    expect(sqlRebuildMirror(CHILD, events).size).toBe(2);
    expect(jsStatuses(events).size).toBe(2);
  });

  it('the mirror is a real mirror — it can disagree, and 346 did', () => {
    // The pre-348 rule ("newest change wins", no ledger refusals) applied to the
    // §3 case. Proof this test would have caught the shipped divergence.
    const events = cases[1][1];
    const naive346 = [...events]
      .filter((e) => e.old_status !== e.new_status)
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0].new_status;
    expect(naive346).toBe('practicing');
    expect(jsStatuses(events).get('dp:t:3')).toBe('mastered');
    expect(sqlRebuildMirror(CHILD, events).get('dp:t:3')).toBe('mastered');
  });
});
