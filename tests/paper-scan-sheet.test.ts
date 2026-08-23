// tests/paper-scan-sheet.test.ts
//
// The Standard Observation Sheet is what the teacher prints every morning and
// what the extractor is told to expect (layouts/montree-standard-v1). These
// tests pin the parts that would silently break a day of paper records:
// pagination (a child falling off page 2), work selection (practicing before
// presented, nothing from a foreign area), the printed template code the
// extractor keys on, and that the rendered HTML really contains every child.

import { describe, it, expect } from 'vitest';
import {
  SHEET_AREAS,
  SHEET_TEMPLATE_CODE,
  formatSheetDate,
  paginateChildren,
  renderStandardSheetHtml,
  rowsPerPage,
  sheetPageCode,
  type SheetChildInput,
} from '@/lib/montree/paper-scan/sheet-template';
import { normaliseSheetArea, selectSheetWorks } from '@/lib/montree/paper-scan/sheet-works';
import { MONTREE_STANDARD_V1 } from '@/lib/montree/paper-scan/layouts/montree-standard-v1';

const CLASSROOM = '9b1f3c2a-1111-4e5f-8a9b-0c1d2e3f4a5b';

function child(i: number): SheetChildInput {
  return { id: `c${i}`, name: `Child ${i}`, works: {} };
}

describe('pagination', () => {
  it('splits a 19-child roster into 3 pages at 2 works/area and 2 at 1 work/area', () => {
    const roster = Array.from({ length: 19 }, (_, i) => child(i + 1));
    expect(paginateChildren(roster, 2).map((p) => p.length)).toEqual([7, 7, 5]);
    expect(paginateChildren(roster, 1).map((p) => p.length)).toEqual([10, 9]);
    expect(rowsPerPage(2)).toBe(7);
    expect(rowsPerPage(1)).toBe(10);
  });

  it('returns no pages for an empty roster', () => {
    expect(paginateChildren([], 2)).toEqual([]);
  });
});

describe('page code', () => {
  it('starts with the template code and carries classroom, date, page/pages', () => {
    const code = sheetPageCode(CLASSROOM, '2026-09-04', 2, 3);
    expect(code).toBe(`MT-STD-1|${CLASSROOM}|2026-09-04|2/3`);
    expect(code.startsWith(SHEET_TEMPLATE_CODE)).toBe(true);
  });

  it('the built-in profile advertises the same template code', () => {
    expect(MONTREE_STANDARD_V1.machine_marks?.template_code).toBe(SHEET_TEMPLATE_CODE);
    const areaCols = MONTREE_STANDARD_V1.structure.columns.filter((c) => c.meaning === 'area').map((c) => c.area_key);
    expect(areaCols).toEqual([...SHEET_AREAS]);
  });
});

describe('formatSheetDate', () => {
  it('prefixes the weekday (UTC, so stable on any server)', () => {
    expect(formatSheetDate('2026-09-04')).toBe('Fri 2026-09-04');
    expect(formatSheetDate('not-a-date')).toBe('not-a-date');
  });
});

describe('selectSheetWorks', () => {
  const areaByKey = new Map<string, 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'cultural'>([
    ['pl_pouring', 'practical_life'],
  ]);

  it('prefers practicing over presented, newest first, capped per area', () => {
    const works = selectSheetWorks(
      [
        { child_id: 'c', work_name: 'Old presented', work_key: null, area: 'language', status: 'presented', updated_at: '2026-01-01' },
        { child_id: 'c', work_name: 'Practicing A', work_key: null, area: 'language', status: 'practicing', updated_at: '2026-02-01' },
        { child_id: 'c', work_name: 'Practicing B', work_key: null, area: 'language', status: 'practicing', updated_at: '2026-03-01' },
        { child_id: 'c', work_name: 'Mastered', work_key: null, area: 'language', status: 'mastered', updated_at: '2026-04-01' },
      ],
      areaByKey,
      2,
    );
    expect(works.language?.map((w) => w.work_name)).toEqual(['Practicing B', 'Practicing A']);
  });

  it('resolves area through work_key when the progress row has none, and folds "math"', () => {
    const works = selectSheetWorks(
      [
        { child_id: 'c', work_name: 'Pouring', work_key: 'pl_pouring', area: null, status: 'practicing', updated_at: null },
        { child_id: 'c', work_name: 'Spindles', work_key: null, area: 'math', status: 'presented', updated_at: null },
        { child_id: 'c', work_name: 'Mystery', work_key: 'unknown', area: null, status: 'presented', updated_at: null },
      ],
      areaByKey,
      2,
    );
    expect(works.practical_life?.[0].work_name).toBe('Pouring');
    expect(works.mathematics?.[0].work_name).toBe('Spindles');
    expect(Object.values(works).flat()).toHaveLength(2);
  });

  it('normaliseSheetArea accepts the legacy spellings', () => {
    expect(normaliseSheetArea('Practical Life')).toBe('practical_life');
    expect(normaliseSheetArea('math')).toBe('mathematics');
    expect(normaliseSheetArea('')).toBeNull();
    expect(normaliseSheetArea('gardening')).toBeNull();
  });
});

describe('renderStandardSheetHtml', () => {
  it('prints every child, their works, the header fields and the page codes', () => {
    const roster = Array.from({ length: 9 }, (_, i) => child(i + 1));
    roster[0].works = { sensorial: [{ work_name: 'Pink <Tower>', status: 'practicing' }] };
    const chunks = paginateChildren(roster, 2);
    const html = renderStandardSheetHtml(
      {
        school_name: '稻香湖幼儿园',
        classroom_name: 'Whale Class',
        teacher_name: 'Tredoux',
        date: '2026-09-04',
        works_per_area: 2,
        pages: chunks.map((c, i) => ({
          code: sheetPageCode(CLASSROOM, '2026-09-04', i + 1, chunks.length),
          children: c,
          first_index: i === 0 ? 1 : 8,
        })),
      },
      { autoPrint: false },
    );
    for (const c of roster) expect(html).toContain(c.name);
    expect(html).toContain('Pink &lt;Tower&gt;');
    expect(html).toContain('Whale Class');
    expect(html).toContain('Fri 2026-09-04');
    expect(html).toContain(`MT-STD-1|${CLASSROOM}|2026-09-04|2/2`);
    expect(html.match(/<section class="page/g)).toHaveLength(2);
    expect(html).toContain('size: A4 landscape');
    expect(html).not.toContain('window.print');
    // child 08 is the first on page 2
    expect(html).toContain('<td class="num">08</td>');
  });

  it('injects the print dialog by default', () => {
    const html = renderStandardSheetHtml({
      school_name: '', classroom_name: '', teacher_name: '', date: '2026-09-04', works_per_area: 1, pages: [],
    });
    expect(html).toContain('window.print()');
  });
});
