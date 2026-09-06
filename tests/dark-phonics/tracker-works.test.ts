import { describe, expect, it } from 'vitest';
import {
  REQUIRED_STATUS,
  TRACKER_LETTERS,
  isLetterMastered,
  letterFromWorkName,
  masteryFromProgress,
  nextLetter,
  parseWorkName,
  workId,
  workName,
} from '@/lib/montree/dark-phonics/tracker-works';

describe('workName / workId', () => {
  it('builds the canonical typeable name', () => {
    expect(workName('t', 1)).toBe('t Dark Phonics work 1');
    expect(workName('ck', 4)).toBe('ck Dark Phonics work 4');
  });

  it('builds the stable storage id', () => {
    expect(workId('t', 1)).toBe('dp:t:1');
  });
});

describe('parseWorkName', () => {
  it.each([
    't Dark Phonics work 1',
    't dark phonics work 1',
    't dp work 1',
    't work 1',
    't w1',
    'T-Work-1',
    'T Work 1',
    '  t   work   1  ',
    't. work. 1!',
  ])('parses %s as {letter: t, n: 1}', (input) => {
    expect(parseWorkName(input)).toEqual({ letter: 't', n: 1 });
  });

  it('parses digraphs (ck, qu)', () => {
    expect(parseWorkName('ck Dark Phonics work 4')).toEqual({ letter: 'ck', n: 4 });
    expect(parseWorkName('CK-W4')).toEqual({ letter: 'ck', n: 4 });
    expect(parseWorkName('qu work 2')).toEqual({ letter: 'qu', n: 2 });
    expect(parseWorkName('qu w2')).toEqual({ letter: 'qu', n: 2 });
  });

  it('rejects unknown letters', () => {
    expect(parseWorkName('zz work 1')).toBeNull();
  });

  it('rejects out-of-range work numbers', () => {
    expect(parseWorkName('t work 0')).toBeNull();
    expect(parseWorkName('t work 6')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(parseWorkName('')).toBeNull();
    expect(parseWorkName('hello there')).toBeNull();
    // @ts-expect-error deliberately wrong type
    expect(parseWorkName(null)).toBeNull();
  });

  it('every canonical name round-trips through parseWorkName', () => {
    for (const letter of TRACKER_LETTERS) {
      for (const work of letter.works) {
        expect(parseWorkName(work.name)).toEqual({ letter: letter.letter, n: work.n });
      }
    }
  });
});

describe('isLetterMastered', () => {
  it('is false with no done works', () => {
    expect(isLetterMastered(new Set(), 't')).toBe(false);
  });

  it('is false when only some of the 5 works are done', () => {
    const done = new Set([workId('t', 1), workId('t', 2), workId('t', 3), workId('t', 4)]);
    expect(isLetterMastered(done, 't')).toBe(false);
  });

  it('is true once all 5 works are done', () => {
    const done = new Set([1, 2, 3, 4, 5].map((n) => workId('t', n)));
    expect(isLetterMastered(done, 't')).toBe(true);
  });

  it('is false for an unknown letter', () => {
    expect(isLetterMastered(new Set(), 'zz')).toBe(false);
  });

  it('is not confused by another letter\'s done works', () => {
    const done = new Set([1, 2, 3, 4, 5].map((n) => workId('a', n)));
    expect(isLetterMastered(done, 't')).toBe(false);
  });
});

describe('nextLetter', () => {
  it('starts at the first letter (s) with nothing done', () => {
    expect(nextLetter(new Set())).toBe('s');
  });

  it('advances to the next unmastered live letter', () => {
    const done = new Set([1, 2, 3, 4, 5].map((n) => workId('s', n)));
    expect(nextLetter(done)).toBe('a');
  });

  it('falls through to a "coming" letter once every live letter is mastered', () => {
    const done = new Set<string>();
    for (const letter of TRACKER_LETTERS) {
      if (letter.status !== 'live') continue;
      for (let n = 1; n <= 5; n++) done.add(workId(letter.letter, n));
    }
    const next = nextLetter(done);
    const nextDef = TRACKER_LETTERS.find((l) => l.letter === next);
    expect(nextDef?.status).toBe('coming');
  });

  it('returns null once every letter is mastered', () => {
    const done = new Set<string>();
    for (const letter of TRACKER_LETTERS) {
      for (let n = 1; n <= 5; n++) done.add(workId(letter.letter, n));
    }
    expect(nextLetter(done)).toBeNull();
  });
});

describe('letterFromWorkName', () => {
  it('extracts just the letter from any accepted form', () => {
    expect(letterFromWorkName('t Dark Phonics work 1')).toBe('t');
    expect(letterFromWorkName('t w1')).toBe('t');
    expect(letterFromWorkName('CK-Work-4')).toBe('ck');
  });

  it('returns null for unresolvable input', () => {
    expect(letterFromWorkName('hello there')).toBeNull();
  });
});

describe('masteryFromProgress', () => {
  const doneRowsFor = (letter: string, statuses: string[]) =>
    statuses.map((status, i) => ({ work_name: workName(letter, i + 1), status }));

  it('every letter defaults to not-started with no rows', () => {
    const result = masteryFromProgress([]);
    for (const def of TRACKER_LETTERS) {
      expect(result[def.letter]).toBe('not-started');
    }
  });

  it('is mastered once all 5 works reach REQUIRED_STATUS', () => {
    const rows = doneRowsFor('t', ['mastered', 'mastered', 'mastered', 'mastered', 'mastered']);
    const result = masteryFromProgress(rows);
    expect(result.t).toBe('mastered');
  });

  it('is in-progress with partial completion', () => {
    const rows = doneRowsFor('t', ['mastered', 'practicing', 'presented']);
    const result = masteryFromProgress(rows);
    expect(result.t).toBe('in-progress');
  });

  it('accepts sloppily typed work_name values via parseWorkName', () => {
    const rows = [
      { work_name: 'T Work 1', status: 'mastered' },
      { work_name: 't-w2', status: 'mastered' },
      { work_name: 't dp work 3', status: 'mastered' },
      { work_name: 'T.WORK.4', status: 'mastered' },
      { work_name: 't w5', status: 'mastered' },
    ];
    expect(masteryFromProgress(rows).t).toBe('mastered');
  });

  it('ignores rows that do not resolve to any known work', () => {
    const rows = [
      { work_name: 'gibberish not a work', status: 'mastered' },
      { work_name: 'zz work 1', status: 'mastered' },
    ];
    const result = masteryFromProgress(rows);
    expect(result.t).toBe('not-started');
  });

  it('REQUIRED_STATUS is mastered by default', () => {
    expect(REQUIRED_STATUS).toBe('mastered');
  });

  it('does not mix up two different letters', () => {
    const rows = [
      ...doneRowsFor('t', ['mastered', 'mastered', 'mastered', 'mastered', 'mastered']),
      ...doneRowsFor('a', ['presented']),
    ];
    const result = masteryFromProgress(rows);
    expect(result.t).toBe('mastered');
    expect(result.a).toBe('in-progress');
    expect(result.p).toBe('not-started');
  });
});
