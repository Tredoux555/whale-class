// tests/tracking/writing-shelf-curriculum.test.ts
//
// PART A's acceptance harness. Three things are asserted here:
//
//   1. The eight records are complete, consistent and carry the LOCKED specs
//      from docs/handoffs/ (the sixteen-tile letter box, the presentation order,
//      the four-box words, Set A / Set B, the six chains and the 30-tile tin,
//      the dictation deck and heart-word ring, the three-compartment tin and
//      punctuation tiles, the three photo sequences, the word-for-word scribe
//      pad, and the black triangle / red circle / blue triangle).
//   2. migrations/352_writing_shelf_curriculum.sql is exactly what the emitter
//      produces — a hand edit to the SQL fails the build instead of winning.
//   3. The name-reader accepts the new display names, the old bare names and
//      every typed form, and the parent summary never doubles the material.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  WRITING_SHELF_BY_KEY,
  WRITING_SHELF_MATERIALS,
  WRITING_SHELF_NAMES,
  WRITING_SHELF_WORKS,
  writingShelfBareName,
} from '@/lib/montree/dark-phonics/writing-shelf-curriculum';
import { resolveWorkName } from '@/lib/montree/tracking/resolve';
import { englishSummary } from '@/lib/montree/tracking/summary';
import type { CurriculumWork } from '@/lib/montree/tracking/types';
import { buildLedger, buildWorks } from './fixture';

const ROOT = join(__dirname, '..', '..');
const works = buildWorks();

describe('the eight records', () => {
  it('is ws:1..ws:8, in order, one per tray', () => {
    expect(WRITING_SHELF_WORKS.map((w) => w.work_key)).toEqual([
      'ws:1', 'ws:2', 'ws:3', 'ws:4', 'ws:5', 'ws:6', 'ws:7', 'ws:8',
    ]);
    expect(WRITING_SHELF_WORKS.map((w) => w.tray)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(WRITING_SHELF_WORKS.map((w) => w.sequence)).toEqual([
      901, 902, 903, 904, 905, 906, 907, 908,
    ]);
  });

  it('carries the owner\'s display names', () => {
    expect(WRITING_SHELF_NAMES).toEqual([
      'Writing Shelf tray 1 · Sound boxes',
      'Writing Shelf tray 2 · Movable alphabet',
      'Writing Shelf tray 3 · Word chains',
      'Writing Shelf tray 4 · Dictation',
      'Writing Shelf tray 5 · Sentence builder',
      'Writing Shelf tray 6 · Story books',
      "Writing Shelf tray 7 · Author's chair",
      'Writing Shelf tray 8 · Grammar symbols',
    ]);
  });

  it('carries the Chinese names', () => {
    expect(WRITING_SHELF_WORKS.map((w) => w.name_chinese)).toEqual([
      '声音盒', '活动字母', '词链', '听写', '造句', '故事书', '作者椅', '语法符号',
    ]);
  });

  it('keeps `description` the MATERIAL alone — never a sentence', () => {
    for (const w of WRITING_SHELF_WORKS) {
      expect(w.description).not.toMatch(/[.!?]/);
      expect(w.description.split(/\s+/).length).toBeLessThanOrEqual(3);
      // The display name is heading + ' · ' + material, and nothing else.
      expect(w.name).toBe(`${writingShelfBareName(w.tray)} · ${w.description}`);
    }
    expect(WRITING_SHELF_MATERIALS).toEqual([
      'Sound boxes', 'Movable alphabet', 'Word chains', 'Dictation',
      'Sentence builder', 'Story books', "Author's chair", 'Grammar symbols',
    ]);
  });

  it('fills every curriculum column for every tray', () => {
    for (const w of WRITING_SHELF_WORKS) {
      expect(w.age_range).toBe('4-6');
      expect(w.direct_aims.length).toBeGreaterThanOrEqual(3);
      expect(w.indirect_aims.length).toBeGreaterThanOrEqual(3);
      expect(w.materials.length).toBeGreaterThanOrEqual(3);
      expect(w.prerequisites.length).toBeGreaterThanOrEqual(2);
      for (const text of [
        w.control_of_error, w.quick_guide, w.presentation_notes,
        w.parent_description, w.why_it_matters, w.video_search_terms,
      ]) {
        expect(text.trim().length).toBeGreaterThan(20);
      }
      expect(w.presentation_steps).toHaveLength(10);
      expect(w.presentation_steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      for (const s of w.presentation_steps) {
        expect(s.title.trim()).not.toBe('');
        expect(s.description.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('marks the thin places "(from spec)" rather than inventing detail', () => {
    // Tray 6's three sequences and tray 7's "big print" are named in the
    // handoffs, not on the shelf page — so they say so, in those words.
    expect(WRITING_SHELF_BY_KEY.get('ws:6')!.presentation_notes).toContain('(from spec)');
    expect(WRITING_SHELF_BY_KEY.get('ws:7')!.presentation_notes).toContain('(from spec');
  });
});

describe('the locked specs survive', () => {
  const notes = (key: string) => WRITING_SHELF_BY_KEY.get(key)!;

  it('tray 1 — sixteen-tile letter box, presentation order, four-box words', () => {
    const t = notes('ws:1');
    expect(t.materials.join(' ')).toContain('s a t p i n m d g o c k e u b h');
    expect(t.presentation_notes).toContain('sun → mug → hat → bed → pig → cat');
    expect(t.presentation_notes).toContain('naps → snap → spat → spit → stuck');
  });

  it('tray 2 — Set A and Set B, locked', () => {
    const t = notes('ws:2');
    const text = `${t.materials.join(' ')} ${t.presentation_notes}`;
    for (const word of ['cat', 'pig', 'dog', 'pot', 'pan', 'tin', 'mop', 'peg']) {
      expect(text).toContain(word);
    }
    for (const word of ['sun', 'mug', 'hat', 'bed', 'nut', 'bin', 'cot', 'kit']) {
      expect(text).toContain(word);
    }
  });

  it('tray 3 — six chains and a 30-tile tin', () => {
    const t = notes('ws:3');
    expect(t.materials.join(' ')).toContain('30 letter tiles');
    expect(t.materials.join(' ')).toContain('6 chain cards');
    expect(t.presentation_notes).toContain('Six chains');
  });

  it('tray 4 — the twelve dictation words and the heart-word ring', () => {
    const t = notes('ws:4');
    const deck = `${t.materials.join(' ')} ${t.presentation_notes}`;
    for (const word of ['cat', 'pig', 'hat', 'mug', 'bed', 'dog', 'pen', 'bag', 'log', 'rug', 'cot', 'jam']) {
      expect(deck).toContain(word);
    }
    for (const heart of ['a', 'I', 'ate', 'the']) {
      expect(t.materials.join(' ')).toContain(heart);
    }
  });

  it('tray 5 — three-compartment word tin and punctuation tiles', () => {
    const t = notes('ws:5');
    expect(t.materials.join(' ')).toContain('three compartments');
    expect(t.materials.join(' ')).toContain('3 punctuation tiles');
    expect(t.presentation_notes).toContain('THREE-COMPARTMENT');
  });

  it('tray 6 — three photo sequences', () => {
    const t = notes('ws:6');
    for (const seq of ['seed → flower', 'egg → hen', 'apple → core']) {
      expect(`${t.materials.join(' ')} ${t.presentation_notes}`).toContain(seq);
    }
  });

  it('tray 7 — word for word, big print, never corrected', () => {
    const t = notes('ws:7');
    expect(t.presentation_notes).toContain('WORD FOR WORD');
    expect(t.presentation_notes).toContain('big print');
    expect(t.presentation_notes).toContain('NEVER corrected');
  });

  it('tray 8 — black triangle, red circle, blue triangle, control-card reveal', () => {
    const t = notes('ws:8');
    const text = `${t.materials.join(' ')} ${t.presentation_notes} ${t.control_of_error}`;
    expect(text).toContain('black triangle');
    expect(text).toContain('red circle');
    expect(text).toContain('dark-blue triangle');
    expect(t.presentation_notes).toContain('control card is the reveal');
  });
});

describe('migrations/352_writing_shelf_curriculum.sql', () => {
  const sql = readFileSync(join(ROOT, 'migrations', '352_writing_shelf_curriculum.sql'), 'utf8');

  it('is byte-identical to the emitter\'s output', () => {
    const emitted = execFileSync(
      process.execPath,
      ['--experimental-strip-types', 'scripts/curriculum/writing-shelf/emit_ws_seed_sql.ts'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 8 * 1024 * 1024 },
    );
    expect(sql).toBe(emitted);
  });

  it('upserts on the partial index, in one transaction, and records itself', () => {
    expect(sql).toContain('BEGIN;');
    expect(sql).toContain('COMMIT;');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION montree_seed_writing_shelf_works(p_classroom_id uuid)');
    expect(sql).toContain("ON CONFLICT (classroom_id, work_key) WHERE work_key LIKE 'ws:%'");
    expect(sql).toContain('FOR r IN SELECT id FROM montree_classrooms LOOP');
    expect(sql).toContain("INSERT INTO montree_migrations (filename) VALUES ('352_writing_shelf_curriculum.sql')");
  });

  it('leaves RLS alone', () => {
    // The only mention of a policy in this file is the comment forbidding one.
    expect(sql).not.toMatch(/^\s*CREATE POLICY/im);
    expect(sql).not.toMatch(/^\s*DROP POLICY/im);
    expect(sql).not.toMatch(/^\s*ALTER TABLE .* ROW LEVEL SECURITY/im);
  });

  it('carries every curriculum column', () => {
    for (const col of [
      'direct_aims', 'indirect_aims', 'materials', 'control_of_error', 'prerequisites',
      'quick_guide', 'presentation_steps', 'presentation_notes', 'parent_description',
      'why_it_matters', 'video_search_terms', 'name_chinese', 'name_zh', 'age_range',
    ]) {
      expect(sql).toContain(col);
    }
  });

  it('quotes the apostrophe in tray 7 rather than breaking the literal', () => {
    expect(sql).toContain("Writing Shelf tray 7 · Author''s chair");
  });
});

describe('rule 6 — the name-reader accepts every form of a tray', () => {
  const forms: Array<[string, string]> = [
    ['Writing Shelf tray 3 · Word chains', 'ws:3'],
    ['Writing Shelf tray 3', 'ws:3'],
    ['writing shelf 3', 'ws:3'],
    ['ws tray 3', 'ws:3'],
    ['tray 3 word chains', 'ws:3'],
    ['Writing Shelf tray 3, Word chains', 'ws:3'],
    ['tray3', 'ws:3'],
    ['ws3', 'ws:3'],
    ['Word chains', 'ws:3'],
    ["Writing Shelf tray 7 · Author's chair", 'ws:7'],
    ["Author's chair", 'ws:7'],
    ['writing shelf tray 1 sound boxes', 'ws:1'],
    ['Sound boxes', 'ws:1'],
    ['WS TRAY 8', 'ws:8'],
    ['Grammar symbols', 'ws:8'],
  ];

  for (const [typed, key] of forms) {
    it(`"${typed}" → ${key}`, () => {
      const r = resolveWorkName(typed, works);
      expect(r.kind).toBe('resolved');
      if (r.kind === 'resolved') expect(r.work.work_key).toBe(key);
    });
  }

  it('a tray that does not exist is still unknown, never a neighbour', () => {
    expect(resolveWorkName('Writing shelf tray 9', works).kind).toBe('unknown');
    expect(resolveWorkName('ws 0', works).kind).toBe('unknown');
  });

  it('a material the classroom does not carry is unknown', () => {
    const withoutTrays = works.filter((w) => !w.work_key.startsWith('ws:'));
    expect(resolveWorkName('Word chains', withoutTrays).kind).toBe('unknown');
  });
});

describe('rule 9 — the summary never doubles the material', () => {
  const ledger = buildLedger();

  it('"Writing Shelf tray 1, Sound boxes" stays exactly that', () => {
    expect(englishSummary(ledger, 'tom', ledger.weekStarts[3]).text).toBe(
      'Tom worked on Writing Shelf tray 1, Sound boxes. He is starting to form the letters with more control. Next week we will continue with tray 1.',
    );
  });

  it('a row with no description falls back to the name\'s tail, not the whole name', () => {
    const noDescription = ledger.works.map((w): CurriculumWork =>
      w.work_key === 'ws:1' ? { ...w, description: null } : w
    );
    expect(englishSummary({ ...ledger, works: noDescription }, 'tom', ledger.weekStarts[3]).text).toContain(
      'Writing Shelf tray 1, Sound boxes.'
    );
  });

  it('a bare heading with nothing behind it drops the clause entirely', () => {
    const headingOnly = ledger.works.map((w): CurriculumWork =>
      w.work_key === 'ws:1' ? { ...w, description: null, name: 'Writing Shelf tray 1' } : w
    );
    expect(englishSummary({ ...ledger, works: headingOnly }, 'tom', ledger.weekStarts[3]).text).toContain(
      'worked on Writing Shelf tray 1.'
    );
  });
});
