// tests/photo-onboarding-reconcile.test.ts
//
// reconcileRoster() is the only place Photo Onboarding decides whether an
// uploaded name is a NEW child, an EXISTING child, or whether a child on the
// roster has LEFT. Nothing it produces is written without teacher review, but
// a wrong default here is what the teacher sees and trusts — and the
// empty-extraction guard is the difference between "that photo was blurry"
// and "the whole class got archived".
//
// Get it wrong the other way and the review screen offers to add a second copy
// of a child who is standing in the classroom. It is a pure function precisely
// so that this file can pin that behaviour down without a database.
//
// The bilingual cases below are not hypotheticals. A Chinese/English Montessori
// school ran its new-year list through this flow and the roster's "Amy" came
// back as a brand-new student called "Amy 王小美" while the real Amy went into
// the departed bucket. Every "regression" test here is that day, written down.

import { describe, it, expect } from 'vitest';
import {
  EmptyExtractionError,
  ageFromDob,
  reconcileRoster,
  segmentName,
} from '@/lib/montree/photo-onboarding/reconcile';
import {
  MATCH_CONFIDENCE_FLOOR,
  POSSIBLE_MATCH_FLOOR,
  type ExtractedStudent,
  type RosterChild,
} from '@/lib/montree/photo-onboarding/types';

// ───────────────────────── helpers ─────────────────────────

/**
 * An extracted student with only the fields a given test cares about.
 *
 * Accepts either call style, because both read naturally in different tests:
 *   student('Austin')                       — just a name
 *   student('A', { date_of_birth: '…' })    — a name plus overrides
 *   student({ name: 'Amy', alternate_name: '王小美' })
 */
function student(
  input: string | (Partial<ExtractedStudent> & { name: string }),
  extra: Partial<ExtractedStudent> = {}
): ExtractedStudent {
  const partial = typeof input === 'string' ? { name: input, ...extra } : input;
  return {
    alternate_name: null,
    date_of_birth: null,
    age: null,
    gender: null,
    notes: null,
    ...partial,
  };
}

const child = (id: string, name: string): RosterChild => ({ id, name });

type Entry = ReturnType<typeof reconcileRoster>['entries'][number];

const extracted = (entries: Entry[]) => entries.filter((e) => e.kind === 'extracted');
const departed = (entries: Entry[]) => entries.filter((e) => e.kind === 'departed');
const byName = (entries: Entry[], name: string) => {
  const found = entries.find((e) => e.kind === 'extracted' && e.name_raw === name);
  if (!found) throw new Error(`no extracted entry named "${name}"`);
  return found;
};
const departedFor = (entries: Entry[], childId: string) =>
  departed(entries).find((e) => e.matched_child_id === childId);

const ROSTER: RosterChild[] = [
  { id: 'c-emily', name: 'Emily Chen' },
  { id: 'c-austin', name: 'Austin' },
  { id: 'c-zhang', name: '张伟' },
];

describe('reconcileRoster — matching', () => {
  it('proposes update on an exact name match', () => {
    const { entries, counts } = reconcileRoster([student('Austin')], ROSTER);
    const row = entries.find((e) => e.name_raw === 'Austin');

    expect(row?.suggested_action).toBe('update');
    expect(row?.matched_child_id).toBe('c-austin');
    expect(row?.match_type).toBe('exact');
    expect(counts.update).toBe(1);
  });

  it('proposes update on a close fuzzy match (a misspelling on the list)', () => {
    const { entries } = reconcileRoster([student('Austen')], ROSTER);
    const row = entries.find((e) => e.name_raw === 'Austen');

    expect(row?.suggested_action).toBe('update');
    expect(row?.matched_child_id).toBe('c-austin');
    expect(row?.match_type).toBe('fuzzy');
    expect(row?.match_confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('proposes create for a name nobody on the roster resembles', () => {
    const { entries, counts } = reconcileRoster([student('Priya Nair')], ROSTER);
    const row = entries.find((e) => e.name_raw === 'Priya Nair');

    expect(row?.suggested_action).toBe('create');
    expect(row?.matched_child_id).toBeNull();
    expect(row?.match_type).toBe('none');
    expect(counts.create).toBe(1);
  });

  it('matches Chinese names exactly, without transliterating', () => {
    const { entries } = reconcileRoster([student('张伟')], ROSTER);
    const row = entries.find((e) => e.name_raw === '张伟');

    expect(row?.suggested_action).toBe('update');
    expect(row?.matched_child_id).toBe('c-zhang');
  });
});

describe('reconcileRoster — departures', () => {
  it('proposes archive for an active child missing from the uploaded list', () => {
    const { entries, counts } = reconcileRoster([student('Austin')], ROSTER);

    const departedRows = entries.filter((e) => e.kind === 'departed');
    expect(departedRows.map((e) => e.matched_child_id).sort()).toEqual(['c-emily', 'c-zhang']);
    expect(departedRows.every((e) => e.suggested_action === 'archive')).toBe(true);
    expect(counts.archive).toBe(2);
  });

  it('proposes no archives when every child is on the list', () => {
    const { counts } = reconcileRoster(
      [student('Emily Chen'), student('Austin'), student('张伟')],
      ROSTER,
    );

    expect(counts.archive).toBe(0);
    expect(counts.update).toBe(3);
  });
});

describe('reconcileRoster — the empty-extraction guard', () => {
  // 🚨 The single most destructive failure this feature can have: an
  // unreadable photo yields no students, every child looks departed, and one
  // tap of Apply empties the roster. Behaviour must not drift.
  it('throws rather than proposing to archive everyone', () => {
    expect(() => reconcileRoster([], ROSTER)).toThrow(EmptyExtractionError);
  });

  it('treats blank/whitespace names as no students at all', () => {
    expect(() => reconcileRoster([student('   '), student('')], ROSTER)).toThrow(EmptyExtractionError);
  });

  it('throws when every extracted name is blank or unusable', () => {
    // Wider than the case above: the model can hand back a null name, and the
    // JSON it produced can contain a null row outright.
    const rows = [
      student({ name: '   ' }),
      { name: null } as unknown as ExtractedStudent,
      null as unknown as ExtractedStudent,
    ];
    expect(() => reconcileRoster(rows, [child('c1', 'Amy')])).toThrow(EmptyExtractionError);
  });
});

describe('reconcileRoster — duplicate matches', () => {
  it('lets only the strongest row claim a child; the loser becomes a create', () => {
    // Two lines both resolve toward Austin. One record must not receive two
    // conflicting updates.
    const { entries } = reconcileRoster([student('Austin'), student('Austen')], ROSTER);

    const claimants = entries.filter((e) => e.matched_child_id === 'c-austin');
    expect(claimants).toHaveLength(1);
    expect(claimants[0].name_raw).toBe('Austin'); // exact beats fuzzy

    const demoted = entries.find((e) => e.name_raw === 'Austen');
    expect(demoted?.suggested_action).toBe('create');
    expect(demoted?.matched_child_id).toBeNull();
  });
});

describe('reconcileRoster — field normalisation', () => {
  it('keeps a valid ISO birthday and derives the age from it', () => {
    const dob = `${new Date().getUTCFullYear() - 4}-01-01`;
    const { entries } = reconcileRoster([student('Priya', { date_of_birth: dob })], ROSTER);
    const row = entries.find((e) => e.name_raw === 'Priya');

    expect(row?.date_of_birth).toBe(dob);
    expect(row?.age).toBe(ageFromDob(dob));
  });

  it('drops an impossible or non-ISO birthday instead of storing garbage', () => {
    const { entries } = reconcileRoster(
      [student('A', { date_of_birth: '2019-02-31' }), student('B', { date_of_birth: '05/03/2019' })],
      ROSTER,
    );

    expect(entries.find((e) => e.name_raw === 'A')?.date_of_birth).toBeNull();
    expect(entries.find((e) => e.name_raw === 'B')?.date_of_birth).toBeNull();
  });

  it('only accepts boy/girl for gender', () => {
    const { entries } = reconcileRoster(
      [student('A', { gender: 'boy' }), student('B', { gender: 'unknown' as 'boy' })],
      ROSTER,
    );

    expect(entries.find((e) => e.name_raw === 'A')?.gender).toBe('boy');
    expect(entries.find((e) => e.name_raw === 'B')?.gender).toBeNull();
  });
});

describe('ageFromDob', () => {
  it('returns null for missing or malformed input', () => {
    expect(ageFromDob(null)).toBeNull();
    expect(ageFromDob('not a date')).toBeNull();
    expect(ageFromDob('2019/03/05')).toBeNull();
  });

  it('computes whole years', () => {
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setUTCFullYear(fiveYearsAgo.getUTCFullYear() - 5);
    expect(ageFromDob(fiveYearsAgo.toISOString().slice(0, 10))).toBe(5);
  });
});

// ───────────────────────── segmentation ─────────────────────────

describe('segmentName', () => {
  it('splits on whitespace and on Latin/CJK boundaries alike', () => {
    expect(segmentName('Amy 王小美')).toEqual(['Amy', '王小美']);
    // No space at all — extremely common on a handwritten list.
    expect(segmentName('Amy王小美')).toEqual(['Amy', '王小美']);
    expect(segmentName('王小美 Amy')).toEqual(['王小美', 'Amy']);
  });

  it('treats the punctuation schools pair names with as a separator', () => {
    expect(segmentName('Amy (王小美)')).toEqual(['Amy', '王小美']);
    expect(segmentName('Amy / 王小美')).toEqual(['Amy', '王小美']);
    expect(segmentName('王小美・Amy')).toEqual(['王小美', 'Amy']);
  });

  it('drops fragments too short to identify anybody', () => {
    // A lone initial or a bare surname character would fuzzy-match half the
    // class, so it never becomes a candidate.
    expect(segmentName('J. Oliver')).toEqual(['Oliver']);
    expect(segmentName('Amy 王')).toEqual(['Amy']);
  });

  it('leaves a single-script name whole', () => {
    expect(segmentName('王小美')).toEqual(['王小美']);
    expect(segmentName('Amy')).toEqual(['Amy']);
  });
});

// ───────────────────────── the production bug ─────────────────────────

describe('bilingual lists (the real-world failure)', () => {
  const roster = [child('amy', 'Amy'), child('ben', 'Ben Carter')];

  it('AUTO-matches "Amy 王小美" to roster "Amy" on the whole written name', () => {
    // Jaro-Winkler on the full string scores 0.87 here — above the 0.85 floor,
    // because the Latin part leads and the Winkler prefix bonus carries it. A
    // whole written name is allowed to act on its own, so this is an update,
    // NOT a possible match. Asserting it pins the cheapest good outcome: the
    // teacher is asked nothing at all.
    const { entries } = reconcileRoster([student({ name: 'Amy 王小美' })], roster);
    const row = byName(entries, 'Amy 王小美');

    expect(row.suggested_action).toBe('update');
    expect(row.matched_child_id).toBe('amy');
    expect(row.match_confidence).toBeGreaterThanOrEqual(MATCH_CONFIDENCE_FLOOR);
    // Auto-matched → Amy is not departed.
    expect(departedFor(entries, 'amy')).toBeUndefined();
  });

  it('flags "王小美 Amy" as a POSSIBLE match — the exact row that duplicated Amy', () => {
    // This ordering is what actually broke in production. Jaro-Winkler finds
    // ZERO matching characters in the match window ("amy" sits past the end of
    // the window when the Chinese name leads), so the whole string scores 0
    // and the old code proposed a brand-new student. The segment "Amy" now
    // matches exactly — but a SEGMENT never auto-matches, because "Amy" alone
    // cannot tell an Amy Chen from an Amy Wang. So: teacher decides.
    const { entries } = reconcileRoster([student({ name: '王小美 Amy' })], roster);
    const row = byName(entries, '王小美 Amy');

    expect(row.match_type).toBe('possible');
    expect(row.matched_child_id).toBe('amy');
    expect(row.match_confidence).toBe(1);
    // Still proposed as a create — "not sure" reads as "new child" until the
    // teacher says otherwise.
    expect(row.suggested_action).toBe('create');
  });

  it('keeps the departed row for a possibly-matched child', () => {
    // 🚨 LOAD-BEARING. The review screen needs BOTH rows to offer the choice:
    // "same child" hides this archive proposal, "new student" keeps it. Drop
    // it here and answering "new student" silently leaves the real Amy on the
    // roster with a duplicate beside her.
    const { entries } = reconcileRoster([student({ name: '王小美 Amy' })], roster);

    const amyDeparted = departedFor(entries, 'amy');
    expect(amyDeparted).toBeDefined();
    expect(amyDeparted?.suggested_action).toBe('archive');
    expect(amyDeparted?.name_raw).toBe('Amy');
  });

  it('AUTO-matches through alternate_name when the extractor split the entry', () => {
    // Layer 1's payoff: the model hands us name "Amy" + alternate_name "王小美",
    // and the whole-name candidate hits Amy exactly. No question asked.
    const { entries } = reconcileRoster(
      [student({ name: 'Amy', alternate_name: '王小美' })],
      roster
    );
    const row = byName(entries, 'Amy');

    expect(row.suggested_action).toBe('update');
    expect(row.match_type).toBe('exact');
    expect(row.matched_child_id).toBe('amy');
    // The second script is carried through to the entry so the review screen
    // can offer it, and the commit route can remember it as an alias.
    expect(row.alternate_name).toBe('王小美');
    expect(departedFor(entries, 'amy')).toBeUndefined();
  });

  it('matches on the OTHER script when the roster holds the Chinese name', () => {
    // The mirror image: the record is Chinese, this year's list leads with the
    // English name. alternate_name is the whole-name candidate that lands it.
    const chineseRoster = [child('amy', '王小美')];
    const { entries } = reconcileRoster(
      [student({ name: 'Amy', alternate_name: '王小美' })],
      chineseRoster
    );
    const row = byName(entries, 'Amy');

    expect(row.suggested_action).toBe('update');
    expect(row.matched_child_id).toBe('amy');
    expect(departedFor(entries, 'amy')).toBeUndefined();
  });

  it('never invents a match for a genuinely new bilingual child', () => {
    const { entries } = reconcileRoster(
      [student({ name: 'Toby 李思远', alternate_name: '李思远' })],
      roster
    );
    const row = byName(entries, 'Toby 李思远');

    expect(row.suggested_action).toBe('create');
    expect(row.match_type).toBe('none');
    expect(row.matched_child_id).toBeNull();
    // Both roster children are untouched and both are proposed for archive,
    // because neither appeared on this one-line list.
    expect(departed(entries)).toHaveLength(2);
  });
});

// ───────────────────────── aliases ─────────────────────────

describe('alias memory', () => {
  const roster = [child('amy', 'Amy'), child('ben', 'Ben Carter')];

  it('auto-matches a pure-Chinese name through a saved alias', () => {
    // This is what last year's "same child" answer buys: the list is now
    // written only in Chinese and it still lands on Amy without a question.
    const { entries } = reconcileRoster([student({ name: '王小美' })], roster, [
      { child_id: 'amy', alias: '王小美' },
    ]);
    const row = byName(entries, '王小美');

    expect(row.suggested_action).toBe('update');
    expect(row.match_type).toBe('alias');
    expect(row.matched_child_id).toBe('amy');
    expect(departedFor(entries, 'amy')).toBeUndefined();
  });

  it('honours an alias found inside a dual-script entry', () => {
    // A segment normally cannot auto-match — but an alias is UNIQUE per
    // classroom, so it cannot point at two children, and a teacher confirmed
    // it by hand. That is enough to act on.
    const { entries } = reconcileRoster([student({ name: '王小美 Amy' })], roster, [
      { child_id: 'amy', alias: '王小美' },
    ]);
    const row = byName(entries, '王小美 Amy');

    expect(row.suggested_action).toBe('update');
    expect(row.match_type).toBe('alias');
    expect(row.matched_child_id).toBe('amy');
  });

  it('ignores an alias belonging to a child who is no longer on the roster', () => {
    const { entries } = reconcileRoster([student({ name: '林大伟' })], roster, [
      { child_id: 'archived-child', alias: '林大伟' },
    ]);
    const row = byName(entries, '林大伟');

    expect(row.suggested_action).toBe('create');
    expect(row.matched_child_id).toBeNull();
  });
});

// ───────────────────────── misspellings ─────────────────────────

describe('misspellings and misreadings', () => {
  it('auto-matches "Sejina" to roster "Segina" (0.91, comfortably over the floor)', () => {
    const { entries } = reconcileRoster(
      [student({ name: 'Sejina' })],
      [child('seg', 'Segina')]
    );
    const row = byName(entries, 'Sejina');

    expect(row.suggested_action).toBe('update');
    expect(row.match_type).toBe('fuzzy');
    expect(row.match_confidence).toBeGreaterThanOrEqual(MATCH_CONFIDENCE_FLOOR);
    expect(departedFor(entries, 'seg')).toBeUndefined();
  });

  it('asks about a misreading that lands between the two floors', () => {
    // 陈子涵 / 陈紫涵 scores 0.80 — one character apart, far too close to call
    // a stranger and far too far to merge on our own.
    const { entries } = reconcileRoster(
      [student({ name: '陈紫涵' })],
      [child('chen', '陈子涵')]
    );
    const row = byName(entries, '陈紫涵');

    expect(row.match_type).toBe('possible');
    expect(row.suggested_action).toBe('create');
    expect(row.matched_child_id).toBe('chen');
    expect(row.match_confidence).toBeGreaterThanOrEqual(POSSIBLE_MATCH_FLOOR);
    expect(row.match_confidence).toBeLessThan(MATCH_CONFIDENCE_FLOOR);
  });

  it('leaves an unrelated name alone rather than asking a pointless question', () => {
    // Jaro-Winkler is generous on short strings; POSSIBLE_MATCH_FLOOR is set
    // where it is so a class full of genuinely new children does not turn into
    // a wall of "is this Segina?" prompts. See the constant's comment.
    const { entries } = reconcileRoster(
      [student({ name: 'Sofia' })],
      [child('seg', 'Segina')]
    );
    const row = byName(entries, 'Sofia');

    expect(row.match_type).toBe('none');
    expect(row.matched_child_id).toBeNull();
    expect(row.suggested_action).toBe('create');
  });
});

// ───────────────────────── one child, two rows ─────────────────────────

describe('greedy de-duplication', () => {
  // The "earlier row wins" half of this contest is covered above by
  // "reconcileRoster — duplicate matches"; these are the cases it does not
  // reach — reverse ordering, and auto-vs-possible.

  it('lets a later, stronger row take the child off an earlier one', () => {
    // A duplicated line, or twins written alike. Two updates to one record is
    // never the right answer — the loser becomes a create the teacher can skip,
    // no matter which order the two rows arrived in.
    const { entries } = reconcileRoster(
      [student({ name: 'Amyy' }), student({ name: 'Amy' })],
      [child('amy', 'Amy')]
    );

    expect(byName(entries, 'Amyy').matched_child_id).toBeNull();
    expect(byName(entries, 'Amyy').suggested_action).toBe('create');
    expect(byName(entries, 'Amy').suggested_action).toBe('update');
    expect(byName(entries, 'Amy').matched_child_id).toBe('amy');
  });

  it('never offers one child to both an auto match and a possible match', () => {
    // "Amy" matches exactly; "王小美 Amy" only reaches her through a segment.
    // The auto match outranks the possible one whatever the numbers say, and
    // because a child IS auto-claimed here, no departed row is produced.
    const { entries } = reconcileRoster(
      [student({ name: '王小美 Amy' }), student({ name: 'Amy' })],
      [child('amy', 'Amy')]
    );

    expect(byName(entries, 'Amy').suggested_action).toBe('update');
    expect(byName(entries, 'Amy').matched_child_id).toBe('amy');

    const loser = byName(entries, '王小美 Amy');
    expect(loser.suggested_action).toBe('create');
    expect(loser.matched_child_id).toBeNull();
    expect(loser.match_type).toBe('none');

    expect(departedFor(entries, 'amy')).toBeUndefined();
    expect(departed(entries)).toHaveLength(0);
  });

  it('offers a contested child to only ONE possible match', () => {
    const { entries } = reconcileRoster(
      [student({ name: '王小美 Amy' }), student({ name: '李小美 Amy' })],
      [child('amy', 'Amy')]
    );

    const claiming = extracted(entries).filter((e) => e.match_type === 'possible');
    expect(claiming).toHaveLength(1);
    expect(extracted(entries).filter((e) => e.matched_child_id === 'amy')).toHaveLength(1);
    // Nobody auto-claimed Amy, so her archive proposal survives.
    expect(departedFor(entries, 'amy')).toBeDefined();
  });
});

// ───────────────────────── shape + counts ─────────────────────────

describe('entry shape and counts', () => {
  it('carries alternate_name onto the entry and null on departed rows', () => {
    const { entries } = reconcileRoster(
      [student({ name: 'Amy', alternate_name: '  王小美  ' })],
      [child('amy', 'Amy'), child('ben', 'Ben Carter')]
    );

    expect(byName(entries, 'Amy').alternate_name).toBe('王小美');
    expect(departedFor(entries, 'ben')?.alternate_name).toBeNull();
  });

  it('treats a blank alternate_name, and a missing one, as absent', () => {
    // Backward compatibility: an extraction from before Layer 1 shipped has no
    // alternate_name field at all.
    const legacy = {
      name: 'Ben Carter',
      date_of_birth: null,
      age: null,
      gender: null,
      notes: null,
    } as ExtractedStudent;

    const { entries } = reconcileRoster(
      [legacy, student({ name: 'Amy', alternate_name: '   ' })],
      [child('ben', 'Ben Carter'), child('amy', 'Amy')]
    );

    expect(byName(entries, 'Ben Carter').alternate_name).toBeNull();
    expect(byName(entries, 'Ben Carter').suggested_action).toBe('update');
    expect(byName(entries, 'Amy').alternate_name).toBeNull();
  });

  it('counts a possible match under BOTH create and possible', () => {
    const { counts, entries } = reconcileRoster(
      [
        student({ name: 'Amy' }),          // update
        student({ name: '陈紫涵' }),        // possible → create
        student({ name: 'Zola Mbeki' }),   // create
      ],
      [child('amy', 'Amy'), child('chen', '陈子涵'), child('gone', 'Ravi Patel')]
    );

    expect(counts.update).toBe(1);
    expect(counts.possible).toBe(1);
    expect(counts.create).toBe(2);
    // 陈子涵 is only possibly matched, so she is still proposed for archive
    // alongside Ravi, who nobody claimed at all.
    expect(counts.archive).toBe(2);
    expect(departed(entries).map((e) => e.matched_child_id).sort()).toEqual(['chen', 'gone']);
  });

  it('normalises dates, ages and genders as before', () => {
    const { entries } = reconcileRoster(
      [
        student({ name: 'Amy', date_of_birth: '2019-02-31', gender: 'girl', age: 5 }),
        // 'unknown' is off the enum on purpose — the model can and does return
        // values the schema never promised, and they must normalise to null.
        student({
          name: 'Ben',
          date_of_birth: '2020-03-05',
          gender: 'unknown' as unknown as ExtractedStudent['gender'],
          notes: '  ',
        }),
      ],
      [child('amy', 'Amy')]
    );

    const amy = byName(entries, 'Amy');
    expect(amy.date_of_birth).toBeNull(); // February has no 31st
    expect(amy.age).toBe(5);
    expect(amy.gender).toBe('girl');

    const ben = byName(entries, 'Ben');
    expect(ben.date_of_birth).toBe('2020-03-05');
    expect(ben.age).toBe(ageFromDob('2020-03-05')); // a real birthday beats a typed age
    expect(ben.gender).toBeNull();
    expect(ben.notes).toBeNull();
  });
});
