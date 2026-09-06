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
// Heuristic: a file matches if it contains from('montree_child_progress') followed
// WITHIN 400 CHARACTERS by .insert( / .upsert( / .update( / .delete(. Reads
// (.select) are untouched — the door is about writes. 400 characters is roughly a
// screenful: long enough to catch a query builder split across a dozen lines,
// short enough that an unrelated write further down the file doesn't false-positive.
//
// If this test fails, the fix is to route your write through
// lib/montree/progress/write-progress.ts — NOT to add yourself to EXCEPTIONS.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ROOTS = ['app', 'lib', 'scripts', 'jobs'];
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

const TABLE_REFERENCE = /from\(\s*['"`]montree_child_progress['"`]\s*\)/g;
const WRITE_CALL = /\.(insert|upsert|update|delete)\(/;
const WINDOW = 400;

function writersOfProgressTable(): Array<{ file: string; op: string; line: number }> {
  const found: Array<{ file: string; op: string; line: number }> = [];
  for (const root of ROOTS) {
    for (const absolute of walk(join(REPO_ROOT, root))) {
      const file = relative(REPO_ROOT, absolute).split(sep).join('/');
      if (file.includes(DEPRECATED_SUFFIX)) continue;
      const source = readFileSync(absolute, 'utf8');
      if (!source.includes('montree_child_progress')) continue;
      TABLE_REFERENCE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = TABLE_REFERENCE.exec(source)) !== null) {
        const write = WRITE_CALL.exec(source.slice(match.index + match[0].length, match.index + match[0].length + WINDOW));
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
