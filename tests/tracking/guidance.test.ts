// tests/tracking/guidance.test.ts
//
// The guidance engine (rule 7: "sequence is data, next is computed") across
// ALL FIVE AREAS. Every case is a plain in-memory ledger — no Supabase, no AI.

import { describe, expect, it } from 'vitest';
import {
  CORE_AREAS,
  classGuidance,
  effectiveSequence,
  nextWorkByArea,
  nextWorks,
  normaliseArea,
  type AreaGuidance,
} from '@/lib/montree/tracking/guidance';
import type { Child, CurriculumWork, Ledger, ProgressEvent, Status } from '@/lib/montree/tracking/types';
import { buildLedger, WEEK_STARTS } from './fixture';

// ── builders ─────────────────────────────────────────────────────────────

const KID: Child = { id: 'kid', name: 'Kid', pronoun: 'they' };

function work(
  work_key: string,
  name: string,
  area: string,
  sequence: number,
  group?: CurriculumWork['group']
): CurriculumWork {
  return { work_key, name, area, sequence, group };
}

function evt(
  work_key: string,
  status: Status,
  day: string,
  childId = 'kid',
  extra: Partial<ProgressEvent> = {}
): ProgressEvent {
  return {
    child_id: childId,
    classroom_id: 'class-1',
    work_key,
    work_name: work_key,
    area: null,
    old_status: null,
    new_status: status,
    source: 'tap',
    actor: 'teacher:ruth',
    created_at: `${day}T09:00:00.000Z`,
    reason: null,
    evidence_id: null,
    ...extra,
  };
}

function ledgerOf(works: CurriculumWork[], events: ProgressEvent[], children: Child[] = [KID]): Ledger {
  return {
    events,
    works,
    children,
    classWeekLetter: 's',
    weekStarts: ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'],
  };
}

const ASOF = '2026-02-02T09:00:00.000Z';
const OPTS = { asOf: ASOF };

/** Three Practical Life works in sequence. */
const PL = [
  work('pl:1', 'Pouring water', 'practical_life', 10),
  work('pl:2', 'Spooning beans', 'practical_life', 20),
  work('pl:3', 'Buttoning frame', 'practical_life', 30),
];

function pl(g: AreaGuidance[]): AreaGuidance {
  return g.find((x) => x.area === 'practical_life' && x.track === 'main')!;
}

const dpWorks = (letter: string, base: number): CurriculumWork[] =>
  [1, 2, 3, 4, 5].map((n) =>
    work(`dp:${letter}:${n}`, `${letter} Dark Phonics work ${n}`, 'language', base + n, 'dark-phonics')
  );

const wsWorks = (): CurriculumWork[] =>
  [1, 2, 3].map((n) => work(`ws:${n}`, `Writing Shelf tray ${n}`, 'language', 5000 + n, 'writing-shelf'));

// ── shape ────────────────────────────────────────────────────────────────

describe('nextWorks — shape', () => {
  it('answers for every core area even when the curriculum is empty', () => {
    const g = nextWorks(ledgerOf([], []), 'kid', OPTS);
    expect(g.map((x) => x.area)).toEqual([...CORE_AREAS]);
  });

  it('keeps the canonical area order with extra areas last', () => {
    const g = nextWorks(ledgerOf([work('mu:1', 'Bells', 'music', 1)], []), 'kid', OPTS);
    expect(g.map((x) => x.area)).toEqual([...CORE_AREAS, 'music']);
  });

  it('reports an empty area as area-complete and says the curriculum is empty', () => {
    const g = pl(nextWorks(ledgerOf([], []), 'kid', OPTS));
    expect(g.reason).toBe('area-complete');
    expect(g.next).toBeNull();
    expect(g.because).toMatch(/curriculum/i);
  });

  it('gives every entry a non-empty because', () => {
    const g = nextWorks(ledgerOf(PL, []), 'kid', OPTS);
    expect(g.every((x) => x.because.trim().length > 0)).toBe(true);
  });

  it('restricts to opts.areas', () => {
    const g = nextWorks(ledgerOf(PL, []), 'kid', { ...OPTS, areas: ['practical_life'] });
    expect(g).toHaveLength(1);
    expect(g[0].area).toBe('practical_life');
  });

  it('normalises area spellings', () => {
    expect(normaliseArea('Language')).toBe('language');
    expect(normaliseArea('culture')).toBe('cultural');
    expect(normaliseArea('Practical Life')).toBe('practical_life');
    expect(normaliseArea('Maths')).toBe('mathematics');
  });

  it('nextWorkByArea keys the main track by area', () => {
    const byArea = nextWorkByArea(ledgerOf(PL, []), 'kid', OPTS);
    expect(byArea.practical_life.next?.work_key).toBe('pl:1');
  });
});

// ── the sequence rules ───────────────────────────────────────────────────

describe('nextWorks — sequence', () => {
  it('starts at the lowest-sequence work when nothing is touched', () => {
    const g = pl(nextWorks(ledgerOf(PL, []), 'kid', OPTS));
    expect(g.reason).toBe('present-next');
    expect(g.next?.work_key).toBe('pl:1');
    expect(g.current).toBeNull();
  });

  it('names the work in the because', () => {
    const g = pl(nextWorks(ledgerOf(PL, []), 'kid', OPTS));
    expect(g.because).toContain('Pouring water');
  });

  it('advances to the next work once the first is mastered', () => {
    const g = pl(nextWorks(ledgerOf(PL, [evt('pl:1', 'mastered', '2026-01-05')]), 'kid', OPTS));
    expect(g.next?.work_key).toBe('pl:2');
    expect(g.reason).toBe('present-next');
  });

  it('never jumps more than one unmastered work ahead', () => {
    const g = pl(nextWorks(ledgerOf(PL, [evt('pl:1', 'mastered', '2026-01-05')]), 'kid', OPTS));
    expect(g.next?.work_key).not.toBe('pl:3');
  });

  it('reports area-complete when everything is mastered', () => {
    const events = PL.map((w) => evt(w.work_key, 'mastered', '2026-01-05'));
    const g = pl(nextWorks(ledgerOf(PL, events), 'kid', OPTS));
    expect(g.reason).toBe('area-complete');
    expect(g.next).toBeNull();
  });

  it('breaks a sequence tie by name', () => {
    const works = [
      work('x:b', 'Bravo', 'sensorial', 10),
      work('x:a', 'Alpha', 'sensorial', 10),
    ];
    const g = nextWorks(ledgerOf(works, []), 'kid', OPTS).find((x) => x.area === 'sensorial')!;
    expect(g.next?.work_key).toBe('x:a');
  });

  it('breaks a name tie by key', () => {
    const works = [
      work('x:b', 'Same', 'sensorial', 10),
      work('x:a', 'Same', 'sensorial', 10),
    ];
    const g = nextWorks(ledgerOf(works, []), 'kid', OPTS).find((x) => x.area === 'sensorial')!;
    expect(g.next?.work_key).toBe('x:a');
  });
});

// ── continue / re-present ────────────────────────────────────────────────

describe('nextWorks — continue before you start', () => {
  it('continues a practicing work instead of presenting anything new', () => {
    const g = pl(nextWorks(ledgerOf(PL, [evt('pl:1', 'practicing', '2026-01-05')]), 'kid', OPTS));
    expect(g.reason).toBe('continue-practising');
    expect(g.next?.work_key).toBe('pl:1');
    expect(g.current?.work_key).toBe('pl:1');
  });

  it('continues the practicing work even when a later work is also in progress', () => {
    const events = [evt('pl:1', 'practicing', '2026-01-05'), evt('pl:2', 'presented', '2026-02-01')];
    const g = pl(nextWorks(ledgerOf(PL, events), 'kid', OPTS));
    // current = highest-sequence in-progress work
    expect(g.current?.work_key).toBe('pl:2');
    expect(g.next?.work_key).toBe('pl:2');
  });

  it('re-presents a presented work left cold for more than 7 days', () => {
    const g = pl(nextWorks(ledgerOf(PL, [evt('pl:1', 'presented', '2026-01-05')]), 'kid', OPTS));
    expect(g.reason).toBe('re-present');
    expect(g.next?.work_key).toBe('pl:1');
    expect(g.because).toMatch(/present it again/i);
  });

  it('does not re-present a work presented within the window', () => {
    const g = pl(nextWorks(ledgerOf(PL, [evt('pl:1', 'presented', '2026-01-31')]), 'kid', OPTS));
    expect(g.reason).toBe('continue-practising');
    expect(g.next?.work_key).toBe('pl:1');
  });

  it('does not re-present when there IS a second observation', () => {
    const events = [
      evt('pl:1', 'presented', '2026-01-05'),
      evt('pl:1', 'presented', '2026-01-12'), // repeat observation, no ladder move
    ];
    const g = pl(nextWorks(ledgerOf(PL, events), 'kid', OPTS));
    expect(g.reason).toBe('continue-practising');
    expect(g.because).toMatch(/returned to/i);
  });

  it('honours a custom rePresentAfterDays', () => {
    const l = ledgerOf(PL, [evt('pl:1', 'presented', '2026-01-31')]);
    expect(pl(nextWorks(l, 'kid', { ...OPTS, rePresentAfterDays: 1 })).reason).toBe('re-present');
  });

  it('counts the idle days in the because', () => {
    const g = pl(nextWorks(ledgerOf(PL, [evt('pl:1', 'presented', '2026-01-05')]), 'kid', OPTS));
    expect(g.because).toContain('28 days');
  });
});

// ── gaps ─────────────────────────────────────────────────────────────────

describe('nextWorks — gaps are flagged, never filled', () => {
  const gapped = ledgerOf(PL, [evt('pl:3', 'mastered', '2026-01-05')]);

  it('goes back for the untouched work below a mastered one', () => {
    const g = pl(nextWorks(gapped, 'kid', OPTS));
    expect(g.reason).toBe('gap-below');
    expect(g.next?.work_key).toBe('pl:1');
  });

  it('lists every gap', () => {
    const g = pl(nextWorks(gapped, 'kid', OPTS));
    expect(g.gaps.map((x) => x.work_key)).toEqual(['pl:1', 'pl:2']);
  });

  it('explains each gap', () => {
    const g = pl(nextWorks(gapped, 'kid', OPTS));
    expect(g.gaps[0].because).toMatch(/never started/i);
  });

  it('reports no gaps when nothing is mastered', () => {
    expect(pl(nextWorks(ledgerOf(PL, []), 'kid', OPTS)).gaps).toEqual([]);
  });

  it('still prefers continuing a practicing work over closing a gap', () => {
    const events = [evt('pl:3', 'mastered', '2026-01-05'), evt('pl:2', 'practicing', '2026-02-01')];
    const g = pl(nextWorks(ledgerOf(PL, events), 'kid', OPTS));
    expect(g.reason).toBe('continue-practising');
    expect(g.next?.work_key).toBe('pl:2');
    expect(g.gaps.map((x) => x.work_key)).toEqual(['pl:1']);
  });
});

// ── Dark Phonics ribbon ──────────────────────────────────────────────────

describe('nextWorks — Dark Phonics follows the ribbon', () => {
  const dp = [...dpWorks('s', 0), ...dpWorks('a', 10)];

  it('walks 1 → 5 inside a letter', () => {
    const events = [1, 2, 3].map((n) => evt(`dp:s:${n}`, 'mastered', '2026-01-05'));
    const g = nextWorks(ledgerOf(dp, events), 'kid', OPTS).find((x) => x.area === 'language')!;
    expect(g.next?.work_key).toBe('dp:s:4');
  });

  it('does not open the next letter until the current one is mastered', () => {
    const events = [1, 2, 3, 4].map((n) => evt(`dp:s:${n}`, 'mastered', '2026-01-05'));
    const g = nextWorks(ledgerOf(dp, events), 'kid', OPTS).find((x) => x.area === 'language')!;
    expect(g.next?.work_key).toBe('dp:s:5');
  });

  it('opens the next letter once all five works are mastered', () => {
    const events = [1, 2, 3, 4, 5].map((n) => evt(`dp:s:${n}`, 'mastered', '2026-01-05'));
    const g = nextWorks(ledgerOf(dp, events), 'kid', OPTS).find((x) => x.area === 'language')!;
    expect(g.next?.work_key).toBe('dp:a:1');
    expect(g.because).toMatch(/'a' book/);
  });

  it('ignores a wrong sequence in the curriculum table — the key decides', () => {
    const scrambled = [
      work('dp:a:1', 'a Dark Phonics work 1', 'language', 1, 'dark-phonics'),
      work('dp:s:1', 's Dark Phonics work 1', 'language', 999, 'dark-phonics'),
    ];
    const g = nextWorks(ledgerOf(scrambled, []), 'kid', OPTS).find((x) => x.area === 'language')!;
    expect(g.next?.work_key).toBe('dp:s:1');
    expect(effectiveSequence(scrambled[1])).toBeLessThan(effectiveSequence(scrambled[0]));
  });

  it('never proposes a letter whose book is not published', () => {
    const coming = dpWorks('v', 0); // 'v' is status 'coming'
    const g = nextWorks(ledgerOf(coming, []), 'kid', OPTS).find((x) => x.area === 'language')!;
    expect(g.reason).toBe('area-complete');
    expect(g.next).toBeNull();
  });
});

// ── Writing Shelf gate ───────────────────────────────────────────────────

describe('nextWorks — the Writing Shelf is a gated parallel track', () => {
  const lang = [...dpWorks('s', 0), ...dpWorks('b', 170), ...wsWorks()];

  it('offers no tray while the child is still on an early letter', () => {
    const g = nextWorks(ledgerOf(lang, [evt('dp:s:1', 'mastered', '2026-01-05')]), 'kid', OPTS);
    expect(g.some((x) => x.track === 'writing-shelf')).toBe(false);
  });

  it('opens the trays once the child reaches the threshold letter', () => {
    const g = nextWorks(ledgerOf(lang, [evt('dp:b:1', 'presented', '2026-02-01')]), 'kid', OPTS);
    const tray = g.find((x) => x.track === 'writing-shelf');
    expect(tray?.next?.work_key).toBe('ws:1');
  });

  it('opens the trays when one has already been touched, whatever the letter', () => {
    const g = nextWorks(ledgerOf(lang, [evt('ws:1', 'practicing', '2026-02-01')]), 'kid', OPTS);
    const tray = g.find((x) => x.track === 'writing-shelf');
    expect(tray?.next?.work_key).toBe('ws:1');
    expect(tray?.reason).toBe('continue-practising');
  });

  it('keeps trays OUT of the main Language shelf while letters remain', () => {
    const g = nextWorks(ledgerOf(lang, [evt('ws:1', 'practicing', '2026-02-01')]), 'kid', OPTS);
    const main = g.find((x) => x.area === 'language' && x.track === 'main')!;
    expect(main.next?.work_key).toBe('dp:s:1');
  });

  it('lets a tray carry the main shelf when every letter is mastered', () => {
    const events = [...dpWorks('s', 0), ...dpWorks('b', 170)].map((w) =>
      evt(w.work_key, 'mastered', '2026-01-05')
    );
    const g = nextWorks(ledgerOf(lang, events), 'kid', OPTS);
    const main = g.find((x) => x.area === 'language' && x.track === 'main')!;
    expect(main.next?.work_key).toBe('ws:1');
  });

  it('respects a custom threshold letter', () => {
    const l = ledgerOf(lang, [evt('dp:b:1', 'presented', '2026-02-01')]);
    const g = nextWorks(l, 'kid', { ...OPTS, writingShelfAfterLetter: 'x' });
    expect(g.some((x) => x.track === 'writing-shelf')).toBe(false);
  });

  it('suppresses the extra track when includeTracks is false', () => {
    const l = ledgerOf(lang, [evt('dp:b:1', 'presented', '2026-02-01')]);
    const g = nextWorks(l, 'kid', { ...OPTS, includeTracks: false });
    expect(g.some((x) => x.track === 'writing-shelf')).toBe(false);
  });
});

// ── determinism ──────────────────────────────────────────────────────────

describe('nextWorks — deterministic', () => {
  const works = [...PL, ...dpWorks('s', 0)];
  const events = [
    evt('pl:1', 'mastered', '2026-01-05'),
    evt('dp:s:1', 'presented', '2026-01-06'),
    evt('dp:s:1', 'practicing', '2026-01-20'),
  ];

  it('gives the same answer twice', () => {
    const a = nextWorks(ledgerOf(works, events), 'kid', OPTS);
    const b = nextWorks(ledgerOf(works, events), 'kid', OPTS);
    expect(a).toEqual(b);
  });

  it('does not depend on the order events arrive in', () => {
    const a = nextWorks(ledgerOf(works, events), 'kid', OPTS);
    const b = nextWorks(ledgerOf(works, [...events].reverse()), 'kid', OPTS);
    expect(a).toEqual(b);
  });

  it('does not depend on the order works are listed in', () => {
    const a = nextWorks(ledgerOf(works, events), 'kid', OPTS);
    const b = nextWorks(ledgerOf([...works].reverse(), events), 'kid', OPTS);
    expect(a).toEqual(b);
  });

  it('answers only about the child asked for', () => {
    const two = ledgerOf(PL, [evt('pl:1', 'mastered', '2026-01-05', 'other')]);
    expect(pl(nextWorks(two, 'kid', OPTS)).next?.work_key).toBe('pl:1');
  });
});

// ── the class view ───────────────────────────────────────────────────────

describe('classGuidance', () => {
  const term = buildLedger();
  const asOf = `${WEEK_STARTS[6]}T09:00:00.000Z`; // end of the stall window

  it('names the children ready to open a new book', () => {
    const g = classGuidance(term, { asOf });
    const mei = g.readyForNextLetter.find((r) => r.childId === 'mei');
    expect(mei?.letter).toBe('t');
    expect(mei?.because).toMatch(/book is next/);
  });

  it('reuses derive.flags for stuck children', () => {
    const g = classGuidance(term, { asOf });
    expect(g.stuck.map((s) => s.childId)).toContain('li');
    expect(g.stuck[0].because).toMatch(/weeks running/);
  });

  it('lists works nobody has been presented', () => {
    const g = classGuidance(term, { asOf });
    expect(g.idleWorks.some((w) => w.work_key === 'ws:3')).toBe(true);
    expect(g.idleWorks.some((w) => w.work_key === 'ws:1')).toBe(false); // Tom touched it
  });

  it('never lists an unpublished letter as an idle work', () => {
    const g = classGuidance(term, { asOf });
    expect(g.idleWorks.some((w) => w.work_key.startsWith('dp:v:'))).toBe(false);
  });

  it('groups children who need the same presentation', () => {
    const g = classGuidance(term, { asOf });
    const group = g.presentTogether.find((p) => p.childIds.length >= 2);
    expect(group).toBeDefined();
    expect(group!.because).toMatch(/together/);
  });

  it('never groups a single child', () => {
    const g = classGuidance(term, { asOf });
    expect(g.presentTogether.every((p) => p.childIds.length >= 2)).toBe(true);
  });

  it('is deterministic', () => {
    expect(classGuidance(term, { asOf })).toEqual(classGuidance(term, { asOf }));
  });
});
