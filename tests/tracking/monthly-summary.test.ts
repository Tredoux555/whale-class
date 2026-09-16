// tests/tracking/monthly-summary.test.ts
//
// The Monthly Summary (2026-09-15): one short English-area sentence per child,
// from the tracking ledger, <= 35 words, ENGLISH ONLY (owner, 2026-09-16),
// never "no observations".

import { describe, expect, it } from 'vitest';
import {
  MONTHLY_WORD_CAP,
  monthBounds,
  monthlyLanguageSummary,
  monthlyLanguageWorks,
  verbFor,
} from '@/lib/montree/tracking/monthly-summary';
import { rangeTicks } from '@/lib/montree/tracking/derive';
import { countWords } from '@/lib/montree/tracking/summary';
import type { CurriculumWork, Ledger, ProgressEvent, Status } from '@/lib/montree/tracking/types';

const MONTH = '2026-09-01';
const TZ = 'Asia/Shanghai';

const WORKS: CurriculumWork[] = [
  { work_key: 'dp:t:1', name: "Dark Phonics 't' work 1", area: 'Language', sequence: 11 },
  { work_key: 'dp:t:2', name: "Dark Phonics 't' work 2", area: 'Language', sequence: 12 },
  { work_key: 'dp:t:3', name: "Dark Phonics 't' work 3", area: 'Language', sequence: 13 },
  { work_key: 'dp:s:5', name: "Dark Phonics 's' work 5", area: 'Language', sequence: 5 },
  {
    work_key: 'ws:2',
    name: 'Writing Shelf tray 2 · Word chains',
    description: 'Word chains',
    area: 'Language',
    sequence: 5002,
  },
  {
    work_key: 'custom_cvc_encoding_1',
    name: 'CVC Encoding',
    name_chinese: 'CVC拼写',
    area: 'language',
    sequence: 700,
  },
  { work_key: 'pl:pouring', name: 'Pouring', name_chinese: '倒水', area: 'practical_life', sequence: 1 },
  { work_key: 'custom_number_rods_1', name: 'Number Rods', area: 'mathematics', sequence: 2 },
];

const AREA: Record<string, string> = Object.fromEntries(WORKS.map((w) => [w.work_key, w.area]));
const NAME: Record<string, string> = Object.fromEntries(WORKS.map((w) => [w.work_key, w.name]));

/** A tap at 10:00 Beijing (02:00Z) on `day`, unless `at` gives the full instant. */
function ev(child: string, key: string, from: Status | null, to: Status, day: string, at?: string): ProgressEvent {
  return {
    child_id: child,
    work_key: key,
    work_name: NAME[key] ?? key,
    area: AREA[key] ?? null,
    old_status: from,
    new_status: to,
    source: 'tap',
    created_at: at ?? `${day}T02:00:00.000Z`,
  };
}

const EVENTS: ProgressEvent[] = [
  // Eric — dp:t:2 presented → practising → mastered across September; a
  // Writing Shelf tray presented late in the month; lots of Pouring (ignored).
  ev('eric', 'dp:t:2', null, 'presented', '2026-09-03'),
  ev('eric', 'dp:t:2', 'presented', 'practicing', '2026-09-10'),
  ev('eric', 'dp:t:2', 'practicing', 'practicing', '2026-09-15'),
  ev('eric', 'dp:t:2', 'practicing', 'mastered', '2026-09-22'),
  ev('eric', 'ws:2', null, 'presented', '2026-09-28'),
  ev('eric', 'pl:pouring', null, 'presented', '2026-09-01'),
  ev('eric', 'pl:pouring', 'presented', 'practicing', '2026-09-02'),
  ev('eric', 'pl:pouring', 'practicing', 'practicing', '2026-09-04'),
  ev('eric', 'pl:pouring', 'practicing', 'practicing', '2026-09-07'),
  ev('eric', 'pl:pouring', 'practicing', 'mastered', '2026-09-08'),

  // Joey — a classroom-custom Language work, introduced then practised.
  ev('joey', 'custom_cvc_encoding_1', null, 'presented', '2026-09-08'),
  ev('joey', 'custom_cvc_encoding_1', 'presented', 'practicing', '2026-09-15'),
  ev('joey', 'custom_cvc_encoding_1', 'practicing', 'practicing', '2026-09-22'),

  // Stella — 's' work 5 mastered in August, repeated in September (consolidated);
  // the tray is new this month.
  ev('stella', 'dp:s:5', null, 'presented', '2026-08-18'),
  ev('stella', 'dp:s:5', 'presented', 'mastered', '2026-08-25'),
  ev('stella', 'dp:s:5', 'mastered', 'mastered', '2026-09-02'),
  ev('stella', 'dp:s:5', 'mastered', 'mastered', '2026-09-09'),
  ev('stella', 'ws:2', null, 'presented', '2026-09-16'),
  ev('stella', 'ws:2', 'presented', 'practicing', '2026-09-23'),

  // Mia — three works of the 't' book this month (a family).
  ev('mia', 'dp:t:1', null, 'mastered', '2026-09-02'),
  ev('mia', 'dp:t:2', null, 'mastered', '2026-09-09'),
  ev('mia', 'dp:t:3', null, 'presented', '2026-09-16'),
  ev('mia', 'dp:t:3', 'presented', 'practicing', '2026-09-23'),

  // Leo — timezone edges. 2026-08-31T16:30Z is 1 Sep 00:30 in Beijing (IN);
  // 2026-09-30T16:30Z is 1 Oct 00:30 in Beijing (OUT).
  ev('leo', 'dp:t:1', null, 'presented', '', '2026-08-31T16:30:00.000Z'),
  ev('leo', 'dp:t:1', 'presented', 'mastered', '', '2026-09-30T16:30:00.000Z'),

  // Amy — only non-Language work this month → the speaking phrase bank.
  ev('amy', 'custom_number_rods_1', null, 'presented', '2026-09-10'),
  ev('amy', 'pl:pouring', null, 'presented', '2026-09-11'),
  // Amy did Language in AUGUST only — must not leak into September.
  ev('amy', 'dp:t:1', null, 'presented', '2026-08-20'),

  // Tom — nothing at all.
];

function ledger(events: ProgressEvent[] = EVENTS): Ledger {
  return {
    events,
    works: WORKS,
    children: [
      { id: 'eric', name: 'Eric', pronoun: 'he' },
      { id: 'joey', name: 'Joey', pronoun: 'he' },
      { id: 'stella', name: 'Stella', pronoun: 'she' },
      { id: 'mia', name: 'Mia', pronoun: 'she' },
      { id: 'leo', name: 'Leo', pronoun: 'he' },
      { id: 'amy', name: 'Amy', pronoun: 'she', dateOfBirth: '2021-05-02' },
      { id: 'tom', name: 'Tom', pronoun: 'they', pronounSet: false },
    ],
    classWeekLetter: 't',
    weekStarts: [],
    timezone: TZ,
  };
}

const L = ledger();
const IDS = L.children.map((c) => c.id);

describe('monthBounds / rangeTicks', () => {
  it('covers the whole calendar month', () => {
    expect(monthBounds('2026-09-01')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(monthBounds('2028-02-01')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('reads the window inclusively, in school time', () => {
    const days = rangeTicks(L.events, 'leo', '2026-09-01', '2026-09-30', TZ).map((t) => t.day);
    expect(days).toEqual(['2026-09-01']);
    // In UTC the same two rows fall on 31 Aug and 30 Sep instead.
    const utc = rangeTicks(L.events, 'leo', '2026-09-01', '2026-09-30', 'UTC').map((t) => t.day);
    expect(utc).toEqual(['2026-09-30']);
  });
});

describe('verbFor — one transition, one verb', () => {
  const cases: Array<[Status, Status, string]> = [
    ['not_started', 'presented', 'introduced'],
    ['presented', 'presented', 'revisited'],
    ['not_started', 'practicing', 'practising'],
    ['presented', 'practicing', 'practising'],
    ['practicing', 'practicing', 'continued'],
    ['not_started', 'mastered', 'confident'],
    ['presented', 'mastered', 'confident'],
    ['practicing', 'mastered', 'confident-from-practice'],
    ['mastered', 'mastered', 'consolidated'],
  ];
  it.each(cases)('%s → %s = %s', (from, to, verb) => {
    expect(verbFor(from, to, false)).toBe(verb);
  });
  it('a Dark Phonics family is "progressed"', () => {
    expect(verbFor('not_started', 'practicing', true)).toBe('progressed');
  });
});

describe('monthlyLanguageWorks', () => {
  it('Eric: dp:t:2 moved presented→mastered, the tray was introduced, Pouring is ignored', () => {
    const works = monthlyLanguageWorks(L, 'eric', MONTH);
    expect(works.map((w) => w.id)).toEqual(['dp:t', 'ws:2']);
    expect(works[0]).toMatchObject({ from: 'not_started', to: 'mastered', verb: 'confident', count: 4 });
    expect(works[1]).toMatchObject({ verb: 'introduced', label: 'Writing Shelf tray 2 (Word chains)' });
  });

  it('Joey: a custom_* Language row is recognised by its area', () => {
    const works = monthlyLanguageWorks(L, 'joey', MONTH);
    expect(works).toHaveLength(1);
    expect(works[0]).toMatchObject({ label: 'CVC Encoding', verb: 'practising' });
    expect(works[0]).not.toHaveProperty('labelZh');
  });

  it('Stella: a work mastered before the month and repeated in it is consolidated', () => {
    const works = monthlyLanguageWorks(L, 'stella', MONTH);
    const s = works.find((w) => w.id === 'dp:s');
    expect(s).toMatchObject({ from: 'mastered', to: 'mastered', verb: 'consolidated' });
  });

  it('Mia: several works of one book collapse into one family', () => {
    const works = monthlyLanguageWorks(L, 'mia', MONTH);
    expect(works).toHaveLength(1);
    expect(works[0]).toMatchObject({ id: 'dp:t', label: "Dark Phonics 't' Works 1–3", verb: 'progressed', to: 'practicing' });
  });

  it('Amy: non-Language work and last month\'s Language work are both ignored', () => {
    expect(monthlyLanguageWorks(L, 'amy', MONTH)).toEqual([]);
  });

  it('is shuffle-stable', () => {
    const shuffled = ledger([...EVENTS].reverse());
    for (const id of IDS) {
      expect(monthlyLanguageWorks(shuffled, id, MONTH)).toEqual(monthlyLanguageWorks(L, id, MONTH));
    }
  });
});

describe('monthlyLanguageSummary', () => {
  it('every child gets one English sentence, <= 35 words, no Chinese, never "no observations"', () => {
    for (const id of IDS) {
      const s = monthlyLanguageSummary(L, id, MONTH);
      expect(s.text.length).toBeGreaterThan(0);
      expect(countWords(s.text)).toBeLessThanOrEqual(MONTHLY_WORD_CAP);
      expect(s.words).toBe(countWords(s.text));
      expect(s.text).not.toMatch(/no observation/i);
      expect(s.text).not.toMatch(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/);
    }
  });

  it('an unknown child gets an empty summary', () => {
    expect(monthlyLanguageSummary(L, 'nobody', MONTH)).toEqual({ text: '', words: 0, works: [], fallback: false });
  });

  it('picks the verb from the transition', () => {
    expect(monthlyLanguageSummary(L, 'joey', MONTH).text).toBe(
      'This month Joey was introduced to CVC Encoding and is practising it with growing accuracy.',
    );
    expect(monthlyLanguageSummary(L, 'eric', MONTH).text).toBe(
      "This month Eric became confident with Dark Phonics 't' Work 2 and was introduced to Writing Shelf tray 2 (Word chains).",
    );
    expect(monthlyLanguageSummary(L, 'leo', MONTH).text).toBe(
      "This month Leo was introduced to Dark Phonics 't' Work 1 and has begun to explore it.",
    );
    expect(monthlyLanguageSummary(L, 'mia', MONTH).text).toContain('worked steadily through');
    // The strongest movement leads, whatever the frequency order.
    expect(monthlyLanguageSummary(L, 'stella', MONTH).text).toBe(
      "This month Stella consolidated Dark Phonics 's' Work 5 and began practising Writing Shelf tray 2 (Word chains).",
    );
  });

  it('a quiet month uses the speaking-domain phrase bank', () => {
    const amy = monthlyLanguageSummary(L, 'amy', MONTH);
    expect(amy.fallback).toBe(true);
    expect(amy.works).toEqual([]);
    expect(amy.text.startsWith('Amy ')).toBe(true);
    expect(amy.text).toMatch(/English|speak|words|sentences|sounds|stories|vocabulary|letters/i);
    const tom = monthlyLanguageSummary(L, 'tom', MONTH);
    expect(tom.fallback).toBe(true);
    expect(tom.text.startsWith('Tom ')).toBe(true);
  });

  it('is deterministic', () => {
    for (const id of IDS) {
      expect(monthlyLanguageSummary(L, id, MONTH)).toEqual(monthlyLanguageSummary(ledger(), id, MONTH));
      expect(monthlyLanguageSummary(ledger([...EVENTS].reverse()), id, MONTH)).toEqual(monthlyLanguageSummary(L, id, MONTH));
    }
  });

  it('drops works (never the sentence) to stay under the cap', () => {
    const long = 'A Very Long Curriculum Work Name That Goes On And On';
    const works: CurriculumWork[] = [1, 2, 3].map((i) => ({
      work_key: `custom_long_${i}`,
      name: `${long} ${i}`,
      area: 'Language',
      sequence: i,
    }));
    const events: ProgressEvent[] = [1, 2, 3].map((i) => ({
      child_id: 'eric',
      work_key: `custom_long_${i}`,
      work_name: `${long} ${i}`,
      area: 'Language',
      old_status: null,
      new_status: 'presented',
      source: 'tap',
      created_at: `2026-09-1${i}T02:00:00.000Z`,
    }));
    const s = monthlyLanguageSummary({ ...L, events, works }, 'eric', MONTH);
    expect(countWords(s.text)).toBeLessThanOrEqual(MONTHLY_WORD_CAP);
    expect(s.works.length).toBeLessThan(3);
    expect(s.text.endsWith('.')).toBe(true);
  });

  it('SAMPLES (printed for the owner)', () => {
    const lines: string[] = [];
    for (const c of L.children) {
      const s = monthlyLanguageSummary(L, c.id, MONTH);
      lines.push(`${c.name}  (${s.words}w): ${s.text}`);
    }
    console.log(`\n── Monthly Summary samples, September 2026 ──\n${lines.join('\n')}\n`);
    expect(lines).toHaveLength(IDS.length);
  });
});
