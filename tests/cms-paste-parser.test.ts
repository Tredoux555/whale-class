// tests/cms-paste-parser.test.ts
//
// The teacher's paste box is the front door of phase 4, and a parser that
// silently mangles one line in twenty is worse than no parser at all — the
// teacher fixes what they can see in the preview and trusts the rest.
//
// So these tests pin the behaviours that a human would never think to re-check:
// the three date formats a real class list arrives in, the two-digit year that
// must not resolve to 2098, the tab that is a COLUMN BOUNDARY and not
// whitespace (that one was a real bug, found here), the CJK names that must
// survive a parser written by somebody who reads left to right, and the
// duplicate that a re-paste is supposed to produce.
//
// `lib/cms/engine/paste-parser.ts` is pure, so every case below is the same
// function the browser preview and the server import both call.

import { describe, it, expect } from 'vitest';
import { parseRoster, rosterKey } from '@/lib/cms/engine/paste-parser';

/** Fixed "today" so an assertion about age never rots. */
const TODAY = new Date('2026-08-12T00:00:00Z');

const P = (text: string, dateOrder: 'dmy' | 'mdy' = 'dmy') =>
  parseRoster(text, { today: TODAY, dateOrder });

describe('dates, in the three formats a class list actually arrives in', () => {
  it('reads ISO, day-first slash and worded dates to the same day', () => {
    const r = P(
      [
        'Amara Okonkwo',
        'Amara Two, 2021-03-05',
        'Amara Three, 05/03/2021',
        'Amara Four, 5 March 2021',
        'Amara Five, March 5, 2021',
      ].join('\n')
    );
    expect(r.lines[0].dateOfBirth).toBeNull();
    expect(r.lines[1].dateOfBirth).toBe('2021-03-05');
    expect(r.lines[2].dateOfBirth).toBe('2021-03-05');
    expect(r.lines[3].dateOfBirth).toBe('2021-03-05');
    expect(r.lines[4].dateOfBirth).toBe('2021-03-05');
  });

  it('flags 05/03 as ambiguous but never flags an ISO date', () => {
    const r = P('One, 2021-03-05\nTwo, 05/03/2021');
    expect(r.lines[0].issues).not.toContain('ambiguous_date');
    expect(r.lines[1].issues).toContain('ambiguous_date');
  });

  it('honours the month-first convention when the teacher picks it', () => {
    expect(P('Kid, 05/03/2021', 'mdy').lines[0].dateOfBirth).toBe('2021-05-03');
  });

  it('does not guess when one number can only be a day or only a month', () => {
    const r = P('One, 27/03/2021\nTwo, 03/27/2021');
    expect(r.lines[0].dateOfBirth).toBe('2021-03-27');
    expect(r.lines[0].issues).not.toContain('ambiguous_date');
    expect(r.lines[1].dateOfBirth).toBe('2021-03-27');
    expect(r.lines[1].issues).not.toContain('ambiguous_date');
  });

  it('expands a two-digit year backwards, never into the future', () => {
    const r = P('One, 2.11.21\nTwo, 5.3.98');
    expect(r.lines[0].dateOfBirth).toBe('2021-11-02');
    expect(r.lines[1].dateOfBirth).toBe('1998-03-05'); // not 2098
    expect(r.lines[1].issues).toContain('implausible_age');
  });

  it('rejects a date that does not round-trip, and keeps the raw text', () => {
    const r = P('Kid, 2019-02-31');
    // `new Date()` silently turns Feb 31st into March 3rd. It must not.
    expect(r.lines[0].dateOfBirth).toBeNull();
    expect(r.lines[0].issues).toContain('bad_date');
    expect(r.lines[0].dateText).toBe('2019-02-31');
  });

  it('flags a future date rather than accepting it', () => {
    expect(P('Kid, 2030-01-01').lines[0].issues).toContain('future_date');
  });

  it('lifts a trailing date out of the name when there is no separator', () => {
    const r = P('Amara Okonkwo 2021-03-05');
    expect(r.lines[0].name).toBe('Amara Okonkwo');
    expect(r.lines[0].dateOfBirth).toBe('2021-03-05');
  });
});

describe('the shapes a real paste arrives in', () => {
  it('drops blank lines and list furniture, keeping the original line numbers', () => {
    const r = P('\n\n  1. Amara Okonkwo  \n\n- Zhang Wei\n•  Sofía Marín\n\n   \n');
    expect(r.total).toBe(3);
    expect(r.lines.map((l) => l.name)).toEqual(['Amara Okonkwo', 'Zhang Wei', 'Sofía Marín']);
    // The preview points at the line the teacher can see in their clipboard.
    expect(r.lines.map((l) => l.line)).toEqual([3, 5, 6]);
  });

  it('treats a TAB as a column boundary, not as whitespace', () => {
    // The bug this test exists for: collapsing whitespace before splitting turns
    // a four-column spreadsheet row into one very long name.
    const r = P('Amara Okonkwo\tSunrise Room\t2021-06-04\t+27 82 555 0101');
    expect(r.lines[0].name).toBe('Amara Okonkwo');
    expect(r.lines[0].dateOfBirth).toBe('2021-06-04');
  });

  it('splits CRLF and normalises NBSP', () => {
    const r = P('Amara Okonkwo, 2021-06-04\r\nZhang Wei');
    expect(r.total).toBe(2);
    expect(r.lines[0].name).toBe('Amara Okonkwo');
  });

  it('keeps a line that has a date but no name, flagged rather than dropped', () => {
    const r = P(', 2021-06-04');
    expect(r.total).toBe(1);
    expect(r.lines[0].issues).toContain('no_name');
  });

  it('caps a runaway paste instead of hanging the tab', () => {
    const huge = Array.from({ length: 500 }, (_, i) => `Child ${i}`).join('\n');
    expect(parseRoster(huge, { today: TODAY, maxLines: 200 }).total).toBe(200);
  });
});

describe('CJK names', () => {
  it('survives a name with no spaces, and the commas a CJK spreadsheet emits', () => {
    const r = P('张伟\n李娜，2021-06-04\n王小明、2021-07-15\n　佐藤 花子　, 2021-02-02');
    expect(r.lines[0].name).toBe('张伟');
    expect(r.lines[1].name).toBe('李娜');
    expect(r.lines[1].dateOfBirth).toBe('2021-06-04');
    expect(r.lines[2].name).toBe('王小明');
    expect(r.lines[2].dateOfBirth).toBe('2021-07-15');
    // U+3000 (the ideographic space) collapses to one ordinary space.
    expect(r.lines[3].name).toBe('佐藤 花子');
    expect(r.needsAttention).toBe(0);
  });
});

describe('duplicates — because a teacher WILL paste the same list twice', () => {
  it('flags an exact and a case-folded repeat, but not a genuine namesake', () => {
    const r = P(
      [
        'Amara Okonkwo, 2021-06-04',
        'Amara Okonkwo, 2021-06-04',
        'AMARA OKONKWO, 2021-06-04',
        'Amara Okonkwo, 2022-01-01',
      ].join('\n')
    );
    expect(r.lines[1].issues).toContain('duplicate_in_paste');
    expect(r.lines[2].issues).toContain('duplicate_in_paste');
    // Two Amaras born on different days are two children, not a mistake.
    expect(r.lines[3].issues).not.toContain('duplicate_in_paste');
    expect(r.duplicates).toBe(2);
  });

  it('folds case and whitespace into one de-duplication key', () => {
    expect(rosterKey('  Amara   Okonkwo ', '2021-06-04')).toBe(
      rosterKey('amara okonkwo', '2021-06-04')
    );
  });
});
