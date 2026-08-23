// tests/paper-scan-layout.test.ts
//
// Layer 1 (sheet layout learning) and the seam where it meets Layer 2:
//   · the extraction prompt is byte-identical to the generic one when no
//     profile is active — teaching one classroom must never change how every
//     other classroom's sheets are read;
//   · with a profile, the prompt carries its legend, its reading instructions
//     and its pitfalls, and says the profile overrides the generic legend;
//   · a model payload is coerced into a safe profile (enums, caps, shapes);
//   · resolution order: explicit → classroom active → school-wide active →
//     built-in only when the page says MT-STD-1 → nothing.

import { describe, it, expect } from 'vitest';
import { buildLayoutBlock, buildSheetExtractionPrompt } from '@/lib/montree/paper-scan/extractor';
import {
  buildLayoutLearningPrompt,
  layoutRowToSummary,
  normaliseLayoutProfile,
  summariseLayoutProfile,
} from '@/lib/montree/paper-scan/layout-learner';
import {
  mentionsTemplateCode,
  pickActiveLayoutRow,
  resolveLayoutProfile,
} from '@/lib/montree/paper-scan/layout-resolver';
import { MONTREE_STANDARD_V1 } from '@/lib/montree/paper-scan/layouts/montree-standard-v1';
import type { SheetLayoutProfile, SheetLayoutRow } from '@/lib/montree/paper-scan/layout-types';

const ROSTER = [{ id: 'c1', name: 'Amy' }, { id: 'c2', name: 'Ben' }];
const WORKS = [{ name: 'Pink Tower', work_key: 'se_pink_tower', area_key: 'sensorial' }];

function layoutRow(over: Partial<SheetLayoutRow> = {}): SheetLayoutRow {
  return {
    id: 'layout-1',
    school_id: 'school-1',
    classroom_id: 'class-1',
    name: 'Whale Class paper form',
    source: 'learned',
    status: 'active',
    version: 1,
    template_code: null,
    profile: MONTREE_STANDARD_V1,
    sample_paths: [],
    model: 'claude-sonnet-4-6',
    created_by: null,
    created_at: '2026-08-22T00:00:00.000Z',
    updated_at: '2026-08-22T00:00:00.000Z',
    ...over,
  };
}

describe('prompt assembly', () => {
  it('is unchanged when the classroom has taught nothing', () => {
    const generic = buildSheetExtractionPrompt({ roster: ROSTER, works: WORKS });
    const explicitNull = buildSheetExtractionPrompt({ roster: ROSTER, works: WORKS, layout: null });

    expect(explicitNull).toBe(generic);
    expect(generic).not.toContain('KNOWN SHEET LAYOUT');
    // The generic legend paragraphs must still be there.
    expect(generic).toContain('STATUS MARKS');
    expect(generic).toContain('AMI CONCENTRATION CODES');
    expect(generic).toContain('TIME AND REPETITION');
    expect(generic).toContain('CLASS ROSTER');
  });

  it('injects the profile, its instructions and its pitfalls', () => {
    const withLayout = buildSheetExtractionPrompt({ roster: ROSTER, works: WORKS, layout: MONTREE_STANDARD_V1 });

    expect(withLayout).toContain('KNOWN SHEET LAYOUT');
    expect(withLayout).toContain('OVERRIDES the generic legend');
    expect(withLayout).toContain('READING INSTRUCTIONS FOR THIS SHEET');
    expect(withLayout).toContain('KNOWN PITFALLS ON THIS SHEET');
    expect(withLayout).toContain(MONTREE_STANDARD_V1.pitfalls[0]);
    // The legend travels as JSON, so a mark description survives verbatim.
    expect(withLayout).toContain('Practical Life');
    expect(withLayout).toContain('mastered');
    // …and the reading aids still follow it.
    expect(withLayout).toContain('CLASS ROSTER');
    expect(withLayout.indexOf('KNOWN SHEET LAYOUT')).toBeLessThan(withLayout.indexOf('CLASS ROSTER'));
  });

  it('renders nothing for a missing profile', () => {
    expect(buildLayoutBlock(null)).toBe('');
    expect(buildLayoutBlock(undefined)).toBe('');
  });

  it('asks for layout only, never for child data, when learning', () => {
    const prompt = buildLayoutLearningPrompt({ photoCount: 2, sheetName: 'Whale form', notes: 'triangles mean status' });
    expect(prompt).toContain('2 photographs');
    expect(prompt).toContain('do not transcribe a single child');
    expect(prompt).toContain('Whale form');
    expect(prompt).toContain('triangles mean status');
    expect(prompt).toContain('describe_sheet_layout');
  });
});

describe('normaliseLayoutProfile', () => {
  it('coerces a model payload into a safe profile', () => {
    const profile = normaliseLayoutProfile({
      sheet_name: '  Whale form  ',
      orientation: 'sideways',            // invalid → portrait
      language: ['en', 'zh', 12],          // a non-string is dropped, not stringified
      unit: 'child_per_week',
      header: { fields: [{ label: 'Date', meaning: 'date', position: 'top' }, { label: '', meaning: 'date', position: 'x' }] },
      structure: {
        kind: 'per_child_block',
        child_locator: 'block header',
        columns: [
          { header_verbatim: 'Work', meaning: 'work', area_key: null },
          { header_verbatim: 'Area', meaning: 'area', area_key: 'sensorial' },
          { header_verbatim: 'Odd', meaning: 'nonsense', area_key: 'not_an_area' },
        ],
        rows_per_child: 'variable',
        work_locator: 'handwritten',
      },
      legend: {
        status_marks: [{ mark: 'MARK', status: 'mastered' }, { mark: '', status: 'presented' }],
        time_marks: [{ mark: '9:15-9:40', time_bucket: null, minutes: 25 }],
        tally_convention: null,
        concentration_codes: [{ code: 'DC', value: 'dc' }],
        area_abbreviations: [{ abbreviation: 'PL', area_key: 'practical_life' }],
        other_symbols: [{ mark: '*', meaning: 'absent' }],
      },
      machine_marks: { fiducials: false, qr: true, template_code: '' },
      reading_instructions: 'Walk each block from the top.',
      pitfalls: ['Notes are not work names', ''],
    });

    expect(profile).not.toBeNull();
    expect(profile!.schema_version).toBe(1);
    expect(profile!.sheet_name).toBe('Whale form');
    expect(profile!.orientation).toBe('portrait');
    expect(profile!.unit).toBe('child_per_week');
    expect(profile!.language).toEqual(['en', 'zh']);
    expect(profile!.header.fields).toHaveLength(1);
    expect(profile!.structure.rows_per_child).toBe('variable');
    expect(profile!.structure.columns[2].meaning).toBe('other');
    expect(profile!.structure.columns[2].area_key).toBeUndefined();
    expect(profile!.legend.status_marks).toEqual([{ mark: 'MARK', status: 'mastered' }]);
    expect(profile!.legend.time_marks[0]).toEqual({ mark: '9:15-9:40', minutes: 25 });
    expect(profile!.legend.area_abbreviations).toEqual({ PL: 'practical_life' });
    expect(profile!.machine_marks).toEqual({ fiducials: false, qr: true });
    expect(profile!.pitfalls).toEqual(['Notes are not work names']);
  });

  it('accepts area_abbreviations as an object too, and rejects a non-object payload', () => {
    const profile = normaliseLayoutProfile({
      sheet_name: 'x',
      legend: { area_abbreviations: { S: 'sensorial', Bad: 42 } },
    });
    expect(profile!.legend.area_abbreviations).toEqual({ S: 'sensorial' });
    expect(normaliseLayoutProfile(null)).toBeNull();
    expect(normaliseLayoutProfile('a sheet')).toBeNull();
  });

  it('falls back to a usable name and empty legend for an empty payload', () => {
    const profile = normaliseLayoutProfile({}, 'Fallback sheet') as SheetLayoutProfile;
    expect(profile.sheet_name).toBe('Fallback sheet');
    expect(profile.legend.status_marks).toEqual([]);
    expect(profile.legend.tally_convention).toBeNull();
    expect(profile.reading_instructions).toBe('');
  });

  it('summarises a profile for the review screen', () => {
    const summary = summariseLayoutProfile(MONTREE_STANDARD_V1);
    expect(summary.columns).toBe(MONTREE_STANDARD_V1.structure.columns.length);
    expect(summary.status_marks).toHaveLength(3);
    expect(summary.pitfalls.length).toBeGreaterThan(0);

    const row = layoutRowToSummary(layoutRow());
    expect(row.id).toBe('layout-1');
    expect(row.status).toBe('active');
    expect(row.summary.orientation).toBe('landscape');
  });
});

describe('layout resolution', () => {
  it('prefers the classroom profile over the school-wide one', () => {
    const rows = [
      layoutRow({ id: 'school-wide', classroom_id: null }),
      layoutRow({ id: 'classroom', classroom_id: 'class-1' }),
    ];
    expect(pickActiveLayoutRow(rows, 'class-1')?.id).toBe('classroom');
  });

  it('falls back to the school-wide profile, and ignores drafts and retired rows', () => {
    expect(pickActiveLayoutRow([layoutRow({ id: 'sw', classroom_id: null })], 'class-1')?.id).toBe('sw');
    expect(pickActiveLayoutRow([layoutRow({ status: 'draft' }), layoutRow({ id: 'r', status: 'retired' })], 'class-1')).toBeNull();
    expect(pickActiveLayoutRow([], 'class-1')).toBeNull();
    expect(pickActiveLayoutRow(null, 'class-1')).toBeNull();
  });

  it('spots the printed template code', () => {
    expect(mentionsTemplateCode('MT-STD-1|abc|2026-09-04|1/2')).toBe(true);
    expect(mentionsTemplateCode('the header prints mt-std-1 beside a QR code')).toBe(true);
    expect(mentionsTemplateCode('a hand-ruled grid')).toBe(false);
    expect(mentionsTemplateCode(null)).toBe(false);
  });

  const stubSupabase = (rows: SheetLayoutRow[] | null, error: { message: string } | null = null) => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          or: async () => ({ data: rows, error }),
        }),
      }),
    }),
  }) as never;

  it('uses the classroom active profile', async () => {
    const res = await resolveLayoutProfile(stubSupabase([layoutRow()]), { classroomId: 'class-1', schoolId: 'school-1' });
    expect(res.layoutId).toBe('layout-1');
    expect(res.source).toBe('learned');
    expect(res.profile).toBe(MONTREE_STANDARD_V1);
  });

  it('honours an explicit layout_id even when another row is active', async () => {
    const rows = [layoutRow(), layoutRow({ id: 'chosen', status: 'retired', name: 'Old form' })];
    const res = await resolveLayoutProfile(stubSupabase(rows), {
      classroomId: 'class-1',
      schoolId: 'school-1',
      layoutId: 'chosen',
    });
    expect(res.layoutId).toBe('chosen');
    expect(res.name).toBe('Old form');
  });

  it('reports an edited profile as edited', async () => {
    const res = await resolveLayoutProfile(stubSupabase([layoutRow({ source: 'edited' })]), {
      classroomId: 'class-1',
      schoolId: 'school-1',
    });
    expect(res.source).toBe('edited');
  });

  it('uses the built-in standard only when the page says MT-STD-1', async () => {
    const withCode = await resolveLayoutProfile(stubSupabase([]), {
      classroomId: 'class-1',
      schoolId: 'school-1',
      hintText: 'printed code MT-STD-1|class|2026-09-04|1/2',
    });
    expect(withCode.source).toBe('builtin');
    expect(withCode.layoutId).toBeNull();
    expect(withCode.profile).toBe(MONTREE_STANDARD_V1);

    const withoutCode = await resolveLayoutProfile(stubSupabase([]), {
      classroomId: 'class-1',
      schoolId: 'school-1',
      hintText: 'a hand-ruled notebook page',
    });
    expect(withoutCode.source).toBe('none');
    expect(withoutCode.profile).toBeNull();
  });

  it('degrades to a generic read when the table is missing or the ids are blank', async () => {
    const missing = await resolveLayoutProfile(stubSupabase(null, { message: 'relation does not exist' }), {
      classroomId: 'class-1',
      schoolId: 'school-1',
    });
    expect(missing.source).toBe('none');

    const noIds = await resolveLayoutProfile(stubSupabase([layoutRow()]), { classroomId: '', schoolId: '' });
    expect(noIds.source).toBe('none');
  });
});
