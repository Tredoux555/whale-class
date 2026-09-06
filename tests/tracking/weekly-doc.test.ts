// tests/tracking/weekly-doc.test.ts
//
// Rule 9 for ALL FIVE AREAS: the Weekly Summary sentences and the Weekly Plan
// cells are templates built in code, in both languages, under a 40-word cap.

import { describe, expect, it } from 'vitest';
import {
  DOC_AREAS,
  summaryParagraph,
  weeklyDocForChild,
  weeklyDocForClass,
} from '@/lib/montree/tracking/weekly-doc';
import { countWords } from '@/lib/montree/tracking/summary';
import type { CurriculumWork, Ledger, ProgressEvent, Status } from '@/lib/montree/tracking/types';

const WEEK = '2026-09-07'; // a Monday

function work(
  key: string,
  name: string,
  area: string,
  sequence: number,
  nameZh?: string,
): CurriculumWork {
  return { work_key: key, name, area, sequence, name_chinese: nameZh ?? null };
}

const WORKS: CurriculumWork[] = [
  work('pl:1', 'Pouring', 'practical_life', 1, '倒水'),
  work('pl:2', 'Tweezing', 'practical_life', 2, '夹子夹'),
  work('se:1', 'Cylinder Blocks', 'sensorial', 1, '带插座圆柱体'),
  work('se:2', 'Colour Box 2', 'sensorial', 2, '色板盒2'),
  work('ma:1', 'Number Rods', 'mathematics', 1, '数棒'),
  work('ma:2', 'Sandpaper Numerals', 'mathematics', 2, '砂数字'),
  work('cu:1', 'Sink and Float', 'cultural', 1, '沉与浮'),
  work('cu:2', 'Land and Water Forms', 'cultural', 2),
  // Language uses the engine's own keys (rule 9 keeps it on dp:/ws:).
  work('dp:s:1', "Dark Phonics 's' work 1", 'language', 10),
  work('dp:s:2', "Dark Phonics 's' work 2", 'language', 11),
];

function ev(
  childId: string,
  key: string,
  name: string,
  area: string,
  from: Status | null,
  to: Status,
  day: string,
): ProgressEvent {
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

function ledgerWith(events: ProgressEvent[]): Ledger {
  return {
    events,
    works: WORKS,
    children: [
      { id: 'mei', name: 'Mei', pronoun: 'she' },
      { id: 'chris', name: 'Chris', pronoun: 'he' },
      { id: 'li', name: 'Li', pronoun: 'they' },
    ],
    classWeekLetter: 's',
    weekStarts: [WEEK],
    timezone: 'UTC',
  };
}

/** Mei: seen in all four non-Language areas this week, plus one Language work. */
const BUSY_WEEK = ledgerWith([
  ev('mei', 'pl:1', 'Pouring', 'practical_life', null, 'presented', '2026-09-08'),
  ev('mei', 'se:1', 'Cylinder Blocks', 'sensorial', null, 'presented', '2026-09-08'),
  ev('mei', 'se:1', 'Cylinder Blocks', 'sensorial', 'presented', 'practicing', '2026-09-09'),
  ev('mei', 'ma:1', 'Number Rods', 'mathematics', null, 'presented', '2026-09-09'),
  ev('mei', 'ma:1', 'Number Rods', 'mathematics', 'presented', 'practicing', '2026-09-10'),
  ev('mei', 'ma:1', 'Number Rods', 'mathematics', 'practicing', 'mastered', '2026-09-11'),
  ev('mei', 'cu:1', 'Sink and Float', 'cultural', null, 'presented', '2026-09-10'),
  ev('mei', 'dp:s:1', "Dark Phonics 's' work 1", 'language', null, 'presented', '2026-09-09'),
]);

describe('weeklyDocForChild — English templates', () => {
  const doc = weeklyDocForChild(BUSY_WEEK, 'mei', WEEK)!;

  it('answers for every area', () => {
    expect(doc).not.toBeNull();
    expect(Object.keys(doc.areas).sort()).toEqual([...DOC_AREAS].sort());
    expect(doc.lang).toBe('en');
  });

  it('presented → "being introduced to"', () => {
    expect(doc.areas.practical_life.summary).toContain('Mei worked on Pouring this week.');
    expect(doc.areas.practical_life.summary).toContain('She is being introduced to it.');
  });

  it('practicing → "practising"', () => {
    expect(doc.areas.sensorial.summary).toContain('She is practising it.');
  });

  it('mastered → "confident with", and next week moves on', () => {
    const math = doc.areas.mathematics;
    expect(math.summary).toContain('She is confident with it.');
    expect(math.summary).toContain('Next week she will move on to Sandpaper Numerals.');
  });

  it('an unfinished work is continued, not moved on from', () => {
    expect(doc.areas.sensorial.summary).toContain('Next week she will continue with Cylinder Blocks.');
  });

  it('every area stays inside the 40-word cap', () => {
    for (const area of DOC_AREAS) {
      expect(doc.areas[area].words).toBeLessThanOrEqual(40);
      expect(countWords(doc.areas[area].summary)).toBe(doc.areas[area].words);
    }
  });

  it('is deterministic', () => {
    const again = weeklyDocForChild(BUSY_WEEK, 'mei', WEEK)!;
    expect(JSON.stringify(again)).toBe(JSON.stringify(doc));
  });
});

describe('weeklyDocForChild — pronouns', () => {
  const l = ledgerWith([
    ev('chris', 'pl:1', 'Pouring', 'practical_life', null, 'presented', '2026-09-08'),
    ev('li', 'pl:1', 'Pouring', 'practical_life', null, 'presented', '2026-09-08'),
  ]);

  it('he / she / they each get their own verb', () => {
    const chris = weeklyDocForChild(l, 'chris', WEEK)!;
    expect(chris.areas.practical_life.summary).toContain('He is being introduced to it.');
    expect(chris.areas.practical_life.summary).toContain('Next week he will');

    const li = weeklyDocForChild(l, 'li', WEEK)!;
    expect(li.areas.practical_life.summary).toContain('They are being introduced to it.');
    expect(li.areas.practical_life.summary).toContain('Next week they will');
  });
});

describe('weeklyDocForChild — no observation', () => {
  const doc = weeklyDocForChild(BUSY_WEEK, 'chris', WEEK)!;

  it('falls back to "continued with <area>" and never invents a work', () => {
    const pl = doc.areas.practical_life;
    expect(pl.noObservation).toBe(true);
    expect(pl.workName).toBeNull();
    expect(pl.summary.startsWith('Chris continued with Practical Life this week.')).toBe(true);
    expect(pl.summary).not.toContain('worked on');
  });

  it('still names what is planned next, from guidance', () => {
    expect(doc.areas.practical_life.summary).toContain('Next week he will start Pouring.');
    expect(doc.areas.practical_life.planCell).toBe('Pouring');
  });

  it('stays inside the cap', () => {
    for (const area of DOC_AREAS) {
      expect(doc.areas[area].words).toBeLessThanOrEqual(40);
    }
  });
});

describe('weeklyDocForChild — Chinese templates', () => {
  const doc = weeklyDocForChild(BUSY_WEEK, 'mei', WEEK, { lang: 'zh' })!;

  it('uses the work\'s Chinese name when the curriculum row has one', () => {
    expect(doc.areas.practical_life.summary).toBe(
      'Mei本周做了倒水的工作。她正在初步接触这项工作。下周她将继续倒水。',
    );
  });

  it('mirrors the English shape sentence for sentence', () => {
    expect(doc.areas.sensorial.summary).toContain('她正在练习这项工作。');
    expect(doc.areas.mathematics.summary).toContain('她正在熟练掌握这项工作。');
    expect(doc.areas.mathematics.summary).toContain('下周她将开始砂数字。');
  });

  it('falls back to the English name when there is no Chinese one', () => {
    // cu:2 "Land and Water Forms" carries no name_chinese — the zh sentence
    // must still name it rather than emitting an empty cell.
    const l = ledgerWith([
      ev('mei', 'cu:2', 'Land and Water Forms', 'cultural', null, 'presented', '2026-09-08'),
    ]);
    const cu = weeklyDocForChild(l, 'mei', WEEK, { lang: 'zh' })!.areas.cultural;
    expect(cu.summary).toContain('Land and Water Forms');
    expect(cu.summary).toContain('她正在初步接触这项工作。');
  });

  it('has a Chinese no-observation fallback too', () => {
    const chris = weeklyDocForChild(BUSY_WEEK, 'chris', WEEK, { lang: 'zh' })!;
    expect(chris.areas.practical_life.summary.startsWith('Chris本周继续进行日常区的工作。')).toBe(true);
  });

  it('plan cells come back in Chinese', () => {
    expect(doc.areas.sensorial.planCell).toBe('带插座圆柱体');
    expect(doc.areas.mathematics.planCell).toBe('砂数字');
  });
});

describe('plan cells', () => {
  it('continue before you start — an in-progress work stays in the cell', () => {
    const doc = weeklyDocForChild(BUSY_WEEK, 'mei', WEEK)!;
    expect(doc.areas.sensorial.planCell).toBe('Cylinder Blocks');
  });

  it('a mastered work is replaced by the next in sequence', () => {
    const doc = weeklyDocForChild(BUSY_WEEK, 'mei', WEEK)!;
    expect(doc.areas.mathematics.planCell).toBe('Sandpaper Numerals');
  });

  it('Language keeps the engine\'s own cell', () => {
    const doc = weeklyDocForChild(BUSY_WEEK, 'mei', WEEK)!;
    expect(doc.areas.language.planCell).toBe("Dark Phonics 's' work 1");
  });
});

describe('weeklyDocForClass + summaryParagraph', () => {
  it('covers the whole roster in order', () => {
    const docs = weeklyDocForClass(BUSY_WEEK, WEEK);
    expect(docs.map((d) => d.childName)).toEqual(['Mei', 'Chris', 'Li']);
  });

  it('prints the English Language sentence first, then the Chinese area lines', () => {
    const en = weeklyDocForChild(BUSY_WEEK, 'mei', WEEK)!;
    const zh = weeklyDocForChild(BUSY_WEEK, 'mei', WEEK, { lang: 'zh' })!;
    const lines = summaryParagraph(en, zh);
    expect(lines[0].startsWith('Mei: ')).toBe(true);
    expect(lines[1].startsWith('日常：')).toBe(true);
    expect(lines.some((l) => l.startsWith('感官：'))).toBe(true);
    expect(lines.some((l) => l.startsWith('数学：'))).toBe(true);
    expect(lines.some((l) => l.startsWith('文化：'))).toBe(true);
    expect(lines.some((l) => l.startsWith('语言：'))).toBe(false);
  });
});

describe('the cap is enforced, not assumed', () => {
  it('drops trailing sentences rather than emitting 41 words', () => {
    const longName = 'Extended Practical Life Pouring Between Two Identical Glass Jugs With A Sponge';
    const l = ledgerWith([ev('mei', 'pl:1', 'Pouring', 'practical_life', null, 'presented', '2026-09-08')]);
    l.works = WORKS.map((w) => (w.work_key === 'pl:1' ? { ...w, name: longName } : w));
    const doc = weeklyDocForChild(l, 'mei', WEEK)!;
    expect(doc.areas.practical_life.words).toBeLessThanOrEqual(40);
  });
});
