// tests/progress/one-door.test.ts
//
// RULE 2 of docs/tracking/TRACKING_CONSTITUTION.md — ONE DOOR:
//
//   "All progress changes go through write-progress.ts. Bypass writers are rerouted
//    or removed. A test fails the build if any other file references
//    montree_child_progress with insert/upsert/update/delete."
//
// This is that test. It is deliberately a TEXT SCAN, not a type-level check: the
// thing being prevented is somebody writing `supabase.from('montree_child_progress')
// .upsert(...)` in a new route at 11pm, and no type system can stop that. The scan
// is the same shape as the audit that found the ten bypass writers in the first
// place, so what it reports is directly comparable.
//
// Heuristic: a file matches if it contains from('montree_child_progress') followed,
// BEFORE THE END OF THAT STATEMENT, by .insert( / .upsert( / .update( / .delete(.
// Reads (.select) are untouched — the door is about writes.
//
// STATEMENT-SCOPED, NOT A FIXED WINDOW (audit 08-verify-tracking §7). This used to
// scan a flat 400 characters, which is wrong in both directions: it false-POSITIVES
// when an unrelated write follows a read within a screenful (the audit hand-cleared
// three such hits — fill-shelf:175, guru/concern:174, advance-shelf-after-mastery:54
// — all `.select()` on montree_child_progress followed by a write to a DIFFERENT
// table), and it false-NEGATIVES on a builder chain longer than 400 characters. The
// scan now stops at the terminating `;`, so the write it reports is a write on the
// SAME builder chain. MAX_STATEMENT is a safety stop for a file with no semicolons.
//
// If this test fails, the fix is to route your write through
// lib/montree/progress/write-progress.ts — NOT to add yourself to EXCEPTIONS.
//
// FIVE TABLES, NOT ONE (audit 08-verify-tracking §7). The guard only ever watched
// montree_child_progress, so the four tables the engine ALSO owns were unguarded:
//
//   montree_progress_events        rule 3's journal — the truth the cache derives
//                                  from. One writer, and it must stay one.
//   montree_progress_review_queue  rule 5's holding pen — the door files rows, the
//                                  resolve route closes them. Nothing else.
//   montree_child_focus_works      documented in the handoff as "a DERIVED CACHE",
//                                  with ELEVEN live writers. The list below is a
//                                  frozen allow-list, not an approval: it exists so
//                                  a TWELFTH cannot appear unnoticed, and the goal
//                                  is for it to SHRINK to zero as the writers are
//                                  routed through the derivation.
//   montree_game_progress          the games surface's own progress record. It is
//                                  NOT montree_child_progress and deliberately does
//                                  not go through the door (a trace-game session is
//                                  telemetry, not a rung on the Montessori ladder),
//                                  but it is progress-shaped, school-scoped and
//                                  child-keyed, so a third writer appearing without
//                                  anyone noticing is the same failure mode.
//
// And ONE FUNCTION: montree_rebuild_child_progress(uuid) (migrations 346/348) is a
// server-side writer of montree_child_progress that no regex over `.from(...)` can
// see. It has zero callers today and rule 2 says it keeps them.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
/**
 * Every root that can hold a bypass writer. The audit's own census (§7) used
 * eleven roots against this guard's four and that is why it could report writer
 * counts this test could not see. Roots that do not exist are walked harmlessly
 * (walk() swallows ENOENT), so this list may name a worker package before it
 * lands rather than being edited afterwards.
 *
 * `tests` is DELIBERATELY NOT HERE. A test's fake Supabase client legitimately
 * names these tables, and this very file quotes the forbidden call in its own
 * header; scanning tests would make the guard fire on the people writing tests
 * for the door. Production code is what the constitution constrains.
 */
const ROOTS = [
  'app', 'lib', 'scripts', 'jobs',
  'components', 'hooks', 'types', 'db', 'supabase',
  'native', 'montage-worker', 'potato-worker',
];
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
const SKIP_DIRECTORIES = new Set(['node_modules', '.next', 'dist', 'build', 'out', 'archive']);

/** THE door. The only file allowed to write montree_child_progress. */
const ALLOWED = ['lib/montree/progress/write-progress.ts'];

/**
 * Files that still write the table directly and could NOT be routed through the
 * door. Every entry needs a reason, and the goal is an EMPTY list.
 *
 * NOTHING may be added here without one of the two reasons below being genuinely
 * true. "It was faster" is not a reason.
 */
const EXCEPTIONS: Array<{ file: string; why: string }> = [
  {
    file: 'app/api/montree/curriculum/duplicates/route.ts',
    why:
      'CURRICULUM MERGE, NOT A STATUS CHANGE. Consolidating duplicate curriculum works ' +
      'renames montree_child_progress.work_name from the loser to the winner (and deletes ' +
      'the row when the child already has the winner). No rung moves. writeProgress is ' +
      'keyed on (child_id, work_name) and has no vocabulary for "same rung, new name" — ' +
      'routing this through it would mean delete + re-create, throwing away presented_at ' +
      'and mastered_at, which is strictly worse. The audit trail that WAS missing is now ' +
      'there: every affected child gets an appendEvents() row, source "correction", ' +
      'reason "duplicate-merge: <loser> renamed to <winner>".',
  },
  {
    file: 'scripts/institutions/backfill-work-keys.mjs',
    why:
      'REPAIR SCRIPT, NEVER A STATUS WRITE. It fills work_key / classroom_id / school_id ' +
      'on rows that predate migration 311 — the very stamps the door exists to guarantee ' +
      'going forward. It touches no status column, is a manual --apply one-off, and is an ' +
      '.mjs script that cannot import the TypeScript primitive.',
  },
  {
    file: 'scripts/run-migration-111.js',
    why:
      'ONE-OFF MIGRATION RUNNER for migration 111 (the de-duplication that created the ' +
      'unique (child_id, work_name) constraint the door now upserts on). Already applied; ' +
      'kept as a record. Plain .js, cannot import the TypeScript primitive.',
  },
];

/**
 * Deprecated bypass writers, kept only as a record of what was run. Renamed rather
 * than deleted, and skipped by filename so the rename itself is the guard: anything
 * called *.DEPRECATED.* is not part of the build and must not be run.
 */
const DEPRECATED_SUFFIX = '.DEPRECATED.';

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // an optional root (jobs/) may not exist
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry)) continue;
      walk(full, out);
    } else if (CODE_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const WRITE_CALL = /\.(insert|upsert|update|delete)\(/;
/** Safety stop for a file with no `;` after the reference (minified, or a .mjs one-liner). */
const MAX_STATEMENT = 2000;

function tableReference(table: string): RegExp {
  return new RegExp(`from\\(\\s*['"\`]${table}['"\`]\\s*\\)`, 'g');
}

/**
 * The rest of the statement that opened with `from('<table>')` — everything up to
 * the terminating `;`, capped. Binding the write to the same statement is what
 * removes both failure modes of the old fixed window; see the header.
 */
function restOfStatement(source: string, from: number): string {
  const semicolon = source.indexOf(';', from);
  const end = semicolon < 0 ? from + MAX_STATEMENT : Math.min(semicolon, from + MAX_STATEMENT);
  return source.slice(from, end);
}

function writersOf(table: string): Array<{ file: string; op: string; line: number }> {
  const found: Array<{ file: string; op: string; line: number }> = [];
  const reference = tableReference(table);
  for (const root of ROOTS) {
    for (const absolute of walk(join(REPO_ROOT, root))) {
      const file = relative(REPO_ROOT, absolute).split(sep).join('/');
      if (file.includes(DEPRECATED_SUFFIX)) continue;
      const source = readFileSync(absolute, 'utf8');
      if (!source.includes(table)) continue;
      reference.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = reference.exec(source)) !== null) {
        const write = WRITE_CALL.exec(restOfStatement(source, match.index + match[0].length));
        if (!write) continue;
        found.push({
          file,
          op: write[1],
          line: source.slice(0, match.index).split('\n').length,
        });
        break; // one report per file is enough to fail it
      }
    }
  }
  return found;
}

function writersOfProgressTable(): Array<{ file: string; op: string; line: number }> {
  return writersOf('montree_child_progress');
}

/**
 * The other four tables the tracking engine owns. `allowed` is the complete list
 * of files permitted to write each — anything else fails the build, and an entry
 * that no longer writes is stale and must be deleted.
 */
const GUARDED_TABLES: Array<{ table: string; why: string; allowed: string[] }> = [
  {
    table: 'montree_progress_events',
    why:
      'RULE 3: the journal IS the record. Everything a human reads is derived from it, ' +
      'and montree_child_progress is only its cache. A second writer means a status ' +
      'change nobody can attribute, or a change that never happened. appendEvents() is ' +
      'exported for the one curriculum-merge exception, which calls it rather than the ' +
      'table (see EXCEPTIONS above); migrations write it directly, and are not scanned.',
    allowed: ['lib/montree/progress/write-progress.ts'],
  },
  {
    table: 'montree_progress_review_queue',
    why:
      'RULE 5: an unresolvable name never writes progress — it waits here for a human. ' +
      'The door files the row; the resolve route closes it and replays the observation ' +
      'through the door. A third writer would be a way to answer the question without ' +
      'the answer going through rule 1.',
    allowed: [
      'lib/montree/progress/write-progress.ts',
      'app/api/montree/tracking/review-queue/resolve/route.ts',
    ],
  },
  {
    table: 'montree_child_focus_works',
    why:
      'FROZEN ALLOW-LIST, NOT AN APPROVAL. docs/handoffs/HANDOFF_TRACKING_ENGINE_V2_2026-09-06.md ' +
      'calls this table "a DERIVED CACHE" while eleven files write it directly. Until ' +
      'they are routed through the derivation, this list holds them still: a twelfth ' +
      'writer fails the build, and every removal from the list is progress. SHRINKING ' +
      'THIS LIST IS THE GOAL — nothing may be added to it.',
    allowed: [
      'app/api/montree/children/[childId]/fill-shelf/route.ts',
      'app/api/montree/focus-works/route.ts',
      'app/api/montree/guru/photo-insight/route.ts',
      'app/api/montree/progress/update/route.ts',
      'app/api/montree/shelf-autopilot/route.ts',
      'app/api/montree/shelf/route.ts',
      'app/api/montree/weekly-review/[childId]/apply-shelf/route.ts',
      'lib/montree/guru/post-conversation-processor.ts',
      'lib/montree/guru/tool-executor.ts',
      'lib/montree/progress/advance-shelf-after-mastery.ts',
      'lib/montree/reports/replan-child.ts',
    ],
  },
  {
    table: 'montree_game_progress',
    why:
      'THE GAMES SURFACE\'S OWN RECORD (migration 252), and deliberately NOT routed ' +
      'through the door: a trace-game session is telemetry — attempts, score, seconds ' +
      'spent — not a rung on the Montessori ladder, and writeProgress has no vocabulary ' +
      'for it. What it IS, is progress-shaped, child-keyed and school-scoped, so the ' +
      'failure mode rule 2 exists to prevent applies unchanged: a third writer landing ' +
      'unnoticed with its own idea of the rules. Two writers, both school-scoped on ' +
      'every statement. If a games write ever needs to move a real rung, it calls ' +
      'writeProgress — it does not add itself here.',
    allowed: [
      'app/api/games/progress/route.ts',
      'app/api/games/track/route.ts',
    ],
  },
];

/**
 * The writer no `.from(...)` scan can see: migrations 346/348 define
 * montree_rebuild_child_progress(uuid), which upserts montree_child_progress
 * SERVER-SIDE. It is rule 3's rebuild, kept replay-equivalent to the TypeScript
 * rebuiltRowsFor() by tests/tracking/rebuild-parity.test.ts — but equivalence is a
 * property that has already been broken once (migration 346 chose the LATEST row
 * where the engine RE-EVALUATES it, so the SQL said 'practicing' where the JS said
 * 'mastered'). The live rebuild button and the nightly sweep both take the
 * TypeScript path, and this asserts they still do: the function has zero callers,
 * and a new one has to arrive here deliberately rather than by accident.
 */
const REBUILD_RPC = 'montree_rebuild_child_progress';
const REBUILD_RPC_ALLOWED: string[] = [];

function rpcCallersOf(fn: string): Array<{ file: string; line: number }> {
  const reference = new RegExp(`rpc\\(\\s*['"\`]${fn}['"\`]`, 'g');
  const found: Array<{ file: string; line: number }> = [];
  for (const root of ROOTS) {
    for (const absolute of walk(join(REPO_ROOT, root))) {
      const file = relative(REPO_ROOT, absolute).split(sep).join('/');
      if (file.includes(DEPRECATED_SUFFIX)) continue;
      const source = readFileSync(absolute, 'utf8');
      if (!source.includes(fn)) continue;
      reference.lastIndex = 0;
      const match = reference.exec(source);
      if (!match) continue;
      found.push({ file, line: source.slice(0, match.index).split('\n').length });
    }
  }
  return found;
}

describe('rule 2 — one door into montree_child_progress', () => {
  const writers = writersOfProgressTable();
  const writerFiles = [...new Set(writers.map((w) => w.file))].sort();
  const permitted = [...ALLOWED, ...EXCEPTIONS.map((e) => e.file)].sort();

  it('finds the door itself (the scan actually works)', () => {
    // A scan that matches nothing would pass silently forever.
    expect(writerFiles).toContain('lib/montree/progress/write-progress.ts');
  });

  it('permits no writer outside the door and the documented exceptions', () => {
    const unexpected = writers.filter((w) => !permitted.includes(w.file));
    expect(
      unexpected.map((w) => `${w.file}:${w.line} .${w.op}()`),
      'These files write montree_child_progress directly. Route them through ' +
        'writeProgress()/writeProgressBatch()/writeProgressBatchChunked() in ' +
        'lib/montree/progress/write-progress.ts. Do not add them to EXCEPTIONS.',
    ).toEqual([]);
  });

  it('has an exceptions list that is exactly the files that still need it', () => {
    // An exception that no longer corresponds to a real writer is stale and must be
    // deleted, so the list can never quietly grow permission it does not use.
    const stale = EXCEPTIONS.filter((e) => !writerFiles.includes(e.file)).map((e) => e.file);
    expect(stale, 'Stale EXCEPTIONS entries — these files no longer write the table').toEqual([]);
  });

  it('gives every exception a reason', () => {
    for (const exception of EXCEPTIONS) {
      expect(exception.why.length, `${exception.file} needs a real reason`).toBeGreaterThan(80);
    }
  });

  it('has not let the deprecated bypass scripts back into the build', () => {
    // They were renamed, not deleted. If one comes back under its old name it starts
    // failing the scan again — which is the point.
    const revived = ['run_replan_all_whale.mjs', 'run_replan_all_whale_zh.mjs', 'run_replan_kevin.mjs']
      .filter((name) => writerFiles.some((f) => f.endsWith(`/${name}`)));
    expect(revived).toEqual([]);
  });
});

describe('rule 2 — the four other tables the engine owns', () => {
  for (const guarded of GUARDED_TABLES) {
    describe(guarded.table, () => {
      const writers = writersOf(guarded.table);
      const files = [...new Set(writers.map((w) => w.file))].sort();

      it('the scan finds the writers it is supposed to find', () => {
        // A scan that matches nothing would pass silently forever.
        expect(files.length, `no writer of ${guarded.table} found — is the scan still working?`).toBeGreaterThan(0);
      });

      it('permits no writer outside the allow-list', () => {
        const unexpected = writers.filter((w) => !guarded.allowed.includes(w.file));
        expect(
          unexpected.map((w) => `${w.file}:${w.line} .${w.op}()`),
          `${guarded.table}: ${guarded.why}`,
        ).toEqual([]);
      });

      it('has no stale entry in its allow-list', () => {
        // An allow-list entry that no longer writes is permission nobody uses. For
        // montree_child_focus_works this is the ratchet: once a writer is routed
        // through the derivation, its line here must go.
        const stale = guarded.allowed.filter((f) => !files.includes(f));
        expect(stale, `${guarded.table}: these files no longer write it — delete them from the allow-list`).toEqual([]);
      });
    });
  }

  it('montree_child_focus_works has not grown past the eleven writers the audit counted', () => {
    const eleven = GUARDED_TABLES.find((g) => g.table === 'montree_child_focus_works')!;
    expect(
      eleven.allowed.length,
      'The 2026-09-06 audit counted eleven. This number may go DOWN as writers are ' +
        'routed through the derivation; it may never go up.',
    ).toBeLessThanOrEqual(11);
  });
});

describe('rule 2 — the server-side rebuild is not a second door', () => {
  it(`nothing calls rpc('${REBUILD_RPC}')`, () => {
    const callers = rpcCallersOf(REBUILD_RPC);
    const unexpected = callers.filter((c) => !REBUILD_RPC_ALLOWED.includes(c.file));
    expect(
      unexpected.map((c) => `${c.file}:${c.line}`),
      `${REBUILD_RPC}(uuid) writes montree_child_progress inside Postgres, where no ` +
        'scan of this file can see it. Rule 3\'s rebuild runs through ' +
        'lib/montree/tracking/persistence.ts rebuiltRowsFor() + applyRebuiltProgress(). ' +
        'If you need the SQL path, tests/tracking/rebuild-parity.test.ts is the proof ' +
        'obligation that comes with it.',
    ).toEqual([]);
  });
});
