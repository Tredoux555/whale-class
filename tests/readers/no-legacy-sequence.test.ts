// tests/readers/no-legacy-sequence.test.ts
//
// The legacy-sequence guard. Constitution rule 8:
//
//   "montree_child_english_progress (1–128) is RETIRED; parent reports read
//    the ribbon."
//
// A rule that lives only in a doc gets re-broken the next time someone needs
// a reading sentence in a hurry. This test walks every READER tree and fails
// the build if any file there imports english-sequence/lesson-map or touches
// montree_child_english_progress again.
//
// It deliberately does NOT police the whole repo: the Library's lesson
// content pages and the phonics-data interop maps still reference the 128
// lessons as reference data, which is allowed. What is forbidden is a
// READER — anything that produces a string a teacher or parent reads —
// consulting a second English sequence.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Every tree whose output a human reads. */
export const READER_DIRS = [
  'app/api/montree/reports',
  'app/api/montree/parent',
  'app/api/montree/weekly-admin-docs',
  'lib/montree/reports',
  'lib/montree/weekly-admin',
];

/** The two retired sources, as they appear in code. */
const FORBIDDEN: Array<{ label: string; test: (src: string) => boolean }> = [
  {
    label: "import of english-sequence/lesson-map",
    // An import, not a mention: the retirement notice in a comment is fine.
    test: (src) => /from\s+['"][^'"]*english-sequence\/lesson-map['"]/.test(src)
      || /require\(\s*['"][^'"]*english-sequence\/lesson-map['"]/.test(src),
  },
  {
    label: 'read of montree_child_english_progress',
    // .from('montree_child_english_progress') — a comment saying the table is
    // retired is fine, a query against it is not.
    test: (src) => /\.from\(\s*['"`]montree_child_english_progress['"`]\s*\)/.test(src),
  },
];

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('readers never consult the retired English sequence', () => {
  const files = READER_DIRS.flatMap((d) => walk(join(ROOT, d)));

  it('finds the reader trees at all (the guard is not vacuous)', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const { label, test } of FORBIDDEN) {
    it(`has no ${label}`, () => {
      const offenders = files
        .filter((f) => test(readFileSync(f, 'utf8')))
        .map((f) => f.slice(ROOT.length));
      expect(offenders).toEqual([]);
    });
  }

  it('the retired lesson-map still carries its RETIRED header', () => {
    const src = readFileSync(join(ROOT, 'lib/montree/english-sequence/lesson-map.ts'), 'utf8');
    expect(src.slice(0, 400)).toContain('RETIRED 2026-09-06');
    expect(src.slice(0, 400)).toContain('do not import in readers');
  });
});
