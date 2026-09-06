// tests/weekly-admin-export.test.ts
//
// The one-button .docx export: what /api/montree/weekly-admin-docs/export
// packs is a real Word file, laid out like the handed-in samples, with every
// child on it and every English summary inside rule 9's 40-word cap.
//
// The route's own body is auth + Supabase; what is testable without a database
// is the pure pipeline it runs — weekly-doc.ts → doc-generator.ts → packDocument.

import { describe, expect, it, beforeAll } from 'vitest';
import JSZip from 'jszip';
import {
  generateWeeklyPlan,
  generateWeeklySummary,
  packDocument,
  type ChildNotes,
} from '@/lib/montree/weekly-admin/doc-generator';
import {
  DOC_AREAS,
  summaryParagraph,
  weeklyDocForChild,
} from '@/lib/montree/tracking/weekly-doc';
import { countWords } from '@/lib/montree/tracking/summary';
import type { CurriculumWork, Ledger, ProgressEvent, Status } from '@/lib/montree/tracking/types';

const WEEK = '2026-09-07';
const WEEK_LABEL = 'W37 (2026-09-07 – 2026-09-13)';

const WORKS: CurriculumWork[] = [
  { work_key: 'pl:1', name: 'Pouring', area: 'practical_life', sequence: 1, name_chinese: '倒水' },
  { work_key: 'pl:2', name: 'Tweezing', area: 'practical_life', sequence: 2, name_chinese: '夹子夹' },
  { work_key: 'se:1', name: 'Cylinder Blocks', area: 'sensorial', sequence: 1, name_chinese: '带插座圆柱体' },
  { work_key: 'ma:1', name: 'Number Rods', area: 'mathematics', sequence: 1, name_chinese: '数棒' },
  { work_key: 'ma:2', name: 'Sandpaper Numerals', area: 'mathematics', sequence: 2, name_chinese: '砂数字' },
  { work_key: 'cu:1', name: 'Sink and Float', area: 'cultural', sequence: 1, name_chinese: '沉与浮' },
  { work_key: 'dp:s:1', name: "Dark Phonics 's' work 1", area: 'language', sequence: 10 },
];

const NAMES = ['Joey', 'Kayla', 'Kevin', 'Amy', 'Segina', 'Austin', 'Rachel'];

function ev(childId: string, key: string, name: string, area: string, from: Status | null, to: Status, day: string): ProgressEvent {
  return {
    child_id: childId,
    work_key: key,
    work_name: name,
    area,
    old_status: from,
    new_status: to,
    source: 'tap',
    created_at: `${day}T02:00:00.000Z`,
  };
}

const LEDGER: Ledger = {
  works: WORKS,
  children: NAMES.map((n, i) => ({
    id: `c${i}`,
    name: n,
    pronoun: (i % 2 === 0 ? 'he' : 'she') as 'he' | 'she',
  })),
  classWeekLetter: 's',
  weekStarts: [WEEK],
  timezone: 'UTC',
  events: NAMES.flatMap((_, i) => [
    ev(`c${i}`, 'pl:1', 'Pouring', 'practical_life', null, 'presented', '2026-09-08'),
    ev(`c${i}`, 'se:1', 'Cylinder Blocks', 'sensorial', null, 'presented', '2026-09-08'),
    ev(`c${i}`, 'ma:1', 'Number Rods', 'mathematics', null, 'presented', '2026-09-09'),
    ev(`c${i}`, 'ma:1', 'Number Rods', 'mathematics', 'presented', 'practicing', '2026-09-10'),
    ev(`c${i}`, 'cu:1', 'Sink and Float', 'cultural', null, 'presented', '2026-09-10'),
    ev(`c${i}`, 'dp:s:1', "Dark Phonics 's' work 1", 'language', null, 'presented', '2026-09-09'),
  ]),
};

/** Exactly what the export route assembles, minus Supabase. */
function buildChildNotes(docType: 'summary' | 'plan', lang: 'en' | 'zh'): ChildNotes[] {
  return LEDGER.children.map((child) => {
    const en = weeklyDocForChild(LEDGER, child.id, WEEK, { lang: 'en' })!;
    const zh = weeklyDocForChild(LEDGER, child.id, WEEK, { lang: 'zh' })!;
    if (docType === 'summary') {
      return {
        childId: child.id,
        childName: child.name,
        englishSummary: summaryParagraph(en, lang === 'zh' ? zh : en).join('\n'),
        chineseSummary: '',
      };
    }
    const planAreas: ChildNotes['planAreas'] = {};
    for (const area of DOC_AREAS) {
      planAreas[area] = { en: (lang === 'zh' ? zh : en).areas[area].planCell || '' };
    }
    return { childId: child.id, childName: child.name, planAreas };
  });
}

async function documentXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file('word/document.xml');
  expect(file).not.toBeNull();
  return file!.async('string');
}

function unescapeXml(s: string): string {
  return s
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Rows of a docx table, as arrays of their columns' plain text. */
function tableRows(xml: string): string[][][] {
  const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g) || [];
  return tables.map((tbl) =>
    (tbl.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || []).map((tr) =>
      (tr.match(/<w:tc>[\s\S]*?<\/w:tc>/g) || []).map((tc) =>
        (tc.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
          .map((t) => unescapeXml(t.replace(/<[^>]+>/g, '')))
          .join(''),
      ),
    ),
  );
}

describe('Weekly Summary .docx export', () => {
  let xml = '';
  beforeAll(async () => {
    xml = await documentXml(await packDocument(generateWeeklySummary(buildChildNotes('summary', 'zh'), WEEK_LABEL)));
  });

  it('unzips to a document.xml', () => {
    expect(xml).toContain('<w:document');
    expect(xml.length).toBeGreaterThan(1000);
  });

  it('contains every child\'s name', () => {
    for (const name of NAMES) expect(xml).toContain(name);
  });

  it('is one row per child plus the header row', () => {
    const [table] = tableRows(xml);
    expect(table).toHaveLength(NAMES.length + 1);
    expect(table[0][0]).toBe('Child');
  });

  it('keeps every English summary inside the 40-word cap', () => {
    for (const child of LEDGER.children) {
      const doc = weeklyDocForChild(LEDGER, child.id, WEEK)!;
      for (const area of DOC_AREAS) {
        expect(countWords(doc.areas[area].summary)).toBeLessThanOrEqual(40);
      }
    }
  });

  it('prints the Chinese area lines under the English sentence', () => {
    const [table] = tableRows(xml);
    const joey = table[1][1];
    expect(joey).toContain('Joey');
    expect(joey).toContain('日常：');
    expect(joey).toContain('数学：');
  });
});

describe('Weekly Plan .docx export', () => {
  let xml = '';
  beforeAll(async () => {
    xml = await documentXml(await packDocument(generateWeeklyPlan(buildChildNotes('plan', 'en'), 'W37')));
  });

  it('contains every child\'s name', () => {
    for (const name of NAMES) expect(xml).toContain(name);
  });

  it('is a 7-column grid: the week label plus the six sample columns', () => {
    const tables = tableRows(xml);
    for (const table of tables) {
      for (const row of table) expect(row).toHaveLength(7);
    }
    expect(tables[0][0]).toEqual([
      'W37',
      'Practical',
      'Sensorial',
      'Math',
      'Language',
      'Science & Culture',
      'Notes',
    ]);
  });

  it('gives each child a work row and a notes row, five children per page', () => {
    const tables = tableRows(xml);
    // 7 children → two tables (5 + 2), each padded to 1 header + 5×2 rows.
    expect(tables).toHaveLength(2);
    for (const table of tables) expect(table).toHaveLength(11);
    const first = tables[0];
    expect(first[1][0]).toBe('Joey');
    expect(first[3][0]).toBe('Kayla');
  });

  it('fills every area cell from the engine', () => {
    const [first] = tableRows(xml);
    // Joey's work row: Pouring / Cylinder Blocks / Number Rods / dp work / Sink and Float
    expect(first[1][1]).toBe('Pouring');
    expect(first[1][2]).toBe('Cylinder Blocks');
    expect(first[1][3]).toBe('Number Rods');
    expect(first[1][4]).toBe("Dark Phonics 's' work 1");
    expect(first[1][5]).toBe('Sink and Float');
  });

  it('renders Chinese work names when lang=zh', async () => {
    const zhXml = await documentXml(await packDocument(generateWeeklyPlan(buildChildNotes('plan', 'zh'), 'W37')));
    const [first] = tableRows(zhXml);
    expect(first[1][1]).toBe('倒水');
    expect(first[1][3]).toBe('数棒');
  });
});
