// tests/tracking/simulated-term.test.ts
//
// The acceptance harness for docs/tracking/TRACKING_CONSTITUTION.md. A whole
// twelve-week term is played through the engine as events and every scenario
// in the constitution is asserted on the derived reads — the exact sentences,
// the ribbon, the flags, the plan cell, the resolver, the dedupe, the
// correction, the AI-confidence routing and the retired 1–128 pointer.

import { describe, expect, it } from 'vitest';
import {
  applyEvent,
  dedupeSameDay,
  emptyState,
  rebuildCurrent,
  replay,
  sortEvents,
  currentStatus,
} from '@/lib/montree/tracking/ledger';
import {
  childCurrent,
  currentLetter,
  flags,
  impliedDarkPhonics,
  isLetterMastered,
  planLanguageCell,
  ribbon,
  weekTicks,
  withImpliedDarkPhonics,
} from '@/lib/montree/tracking/derive';
import { resolveWorkName } from '@/lib/montree/tracking/resolve';
import { englishSummary, WORD_CAP } from '@/lib/montree/tracking/summary';
import { checkInvariants } from '@/lib/montree/tracking/invariants';
import { nextWorks } from '@/lib/montree/tracking/guidance';
import type { Ledger, ProgressEvent, Source } from '@/lib/montree/tracking/types';
import { buildLedger, buildWorks, day, ev, WEEK_STARTS } from './fixture';

const ledger = buildLedger();
const works = ledger.works;
const W = (n: number) => WEEK_STARTS[n - 1];
const sunday = (n: number) => day(n, 6);

describe('rule 3 — the journal is the truth', () => {
  it('rebuildCurrent equals the incrementally applied state', () => {
    let state = emptyState();
    for (const e of sortEvents(ledger.events)) state = applyEvent(state, e).state;
    const rebuilt = rebuildCurrent(ledger.events);

    const flatten = (m: Map<string, Map<string, string>>) =>
      [...m]
        .map(([child, works_]) => [child, [...works_].sort()] as const)
        .sort((a, b) => a[0].localeCompare(b[0]));

    expect(flatten(rebuilt)).toEqual(flatten(state.current));
  });

  it('is order-independent for a shuffled journal', () => {
    const shuffled = [...ledger.events].reverse();
    expect([...rebuildCurrent(shuffled).get('chris')!].sort()).toEqual(
      [...rebuildCurrent(ledger.events).get('chris')!].sort()
    );
  });
});

describe('rule 4 — status only moves forward on its own', () => {
  const base = ev('kid', 'dp:s:1', 1, 0, { status: 'presented' });

  it('accepts a forward move', () => {
    const r = applyEvent(emptyState(), base);
    expect(r.accepted).toBe(true);
  });

  it('rejects a repeat as a no-op, but keeps it as evidence', () => {
    const after = applyEvent(emptyState(), base).state;
    const r = applyEvent(after, ev('kid', 'dp:s:1', 1, 1, { status: 'presented' }));
    expect(r).toMatchObject({ accepted: false, why: 'no-op', attachAsEvidence: true });
  });

  it('rejects a backward move without a correction', () => {
    const after = applyEvent(emptyState(), ev('kid', 'dp:s:1', 1, 0)).state;
    const r = applyEvent(after, ev('kid', 'dp:s:1', 1, 1, { status: 'presented' }));
    expect(r.accepted).toBe(false);
    expect(r.why).toBe('backward-without-correction');
  });

  it('rejects a correction with no reason', () => {
    const after = applyEvent(emptyState(), ev('kid', 'dp:s:1', 1, 0)).state;
    const r = applyEvent(
      after,
      ev('kid', 'dp:s:1', 1, 1, { status: 'practicing', source: 'correction' })
    );
    expect(r.accepted).toBe(false);
    expect(r.why).toBe('correction-without-reason');
  });

  it('rejects a row with no key (rule 1)', () => {
    const orphan: ProgressEvent = { ...base, work_key: null, work_name: 'Blue Series blends' };
    expect(applyEvent(emptyState(), orphan)).toMatchObject({ accepted: false, why: 'no-key' });
  });

  it('scenario "Downward correction with reason": Mei\'s t work 1 comes back down', () => {
    expect(currentStatus(ledger.events, 'mei', 'dp:t:1')).toBe('practicing');
    const correction = ledger.events.find(
      (e) => e.child_id === 'mei' && e.source === 'correction'
    );
    expect(correction?.reason).toContain('Tagged the wrong child');
  });
});

describe('scenario "Duplicate photo same morning"', () => {
  it('the second photo of the same work on the same day never advances twice', () => {
    const first = ev('kid', 'dp:s:1', 1, 0, { source: 'photo', evidence_id: 'p1' });
    const state = applyEvent(emptyState(), first).state;
    const second = ev('kid', 'dp:s:1', 1, 0, { source: 'photo', evidence_id: 'p2', hour: 11 });

    expect(dedupeSameDay(state, second)).toEqual({
      accepted: false,
      why: 'duplicate-same-day',
      attachAsEvidence: true,
    });
    expect(applyEvent(state, second)).toMatchObject({
      accepted: false,
      why: 'duplicate-same-day',
      attachAsEvidence: true,
    });
  });

  it('a correction is exempt from the same-day dedupe', () => {
    const state = applyEvent(emptyState(), ev('kid', 'dp:s:1', 1, 0)).state;
    const fix = ev('kid', 'dp:s:1', 1, 0, {
      status: 'presented',
      source: 'correction',
      reason: 'wrong child',
      hour: 15,
    });
    expect(dedupeSameDay(state, fix)).toEqual({ accepted: true });
    expect(applyEvent(state, fix).accepted).toBe(true);
  });

  it('Mei\'s duplicated a-work-3 photo produced one ladder move', () => {
    const { rows } = replay(ledger.events);
    const a3 = rows.filter((r) => r.event.child_id === 'mei' && r.event.work_key === 'dp:a:3');
    expect(a3).toHaveLength(2);
    expect(a3.filter((r) => r.result.accepted)).toHaveLength(1);
    expect(a3[1].result.why).toBe('duplicate-same-day');
    expect(a3[1].result.attachAsEvidence).toBe(true);
  });
});

describe('rule 9 — the English summary, verbatim', () => {
  it('Chris week 5 (steady, finishes the s book)', () => {
    expect(englishSummary(ledger, 'chris', W(5)).text).toBe(
      "Chris did Dark Phonics 's' work 5. He can now build the sentences on his own. Next week we will start the 'a' book."
    );
  });

  it('Mei week 3 (racer, five works in one week)', () => {
    expect(englishSummary(ledger, 'mei', W(3)).text).toBe(
      "Mei did Dark Phonics 'a' works 1 to 5. She can now build the sentences on her own. Next week we will start the 't' book."
    );
  });

  it('Li week 7 (stalled — "continued", they/are)', () => {
    expect(englishSummary(ledger, 'li', W(7)).text).toBe(
      "Li continued with Dark Phonics 's' work 4. They are starting to build the sentence by choosing the changing word. Next week we will try to complete the series."
    );
  });

  // 2026-09-06 Whale-class burn-in. This used to read "Amir continued with the Dark
  // Phonics 't' book this week." Amir has never had a single 't' event — the class
  // is on 't', he is not — so "continued" was a fact about a week that did not
  // happen, sent to a parent. Rule 9 (templates state only what the ticks say) and
  // rule 11 (nothing is guessed) both forbid it. The class-letter fallback stays;
  // its verb now depends on whether the child has actually opened that book.
  it('Amir week 9 (absent, and has never started the class letter)', () => {
    expect(englishSummary(ledger, 'amir', W(9)).text).toBe(
      "Amir has not started the Dark Phonics 't' book yet. Next week we will introduce 't' work 1."
    );
  });

  it('"continued" survives for a child who HAS opened the class book', () => {
    // Ava did 's' work 1 in week 1 and nothing since. With the class on 's', she
    // IS in the book — "continued" is a true statement about a quiet week, and
    // the burn-in fix must not have thrown it away.
    const onS = { ...ledger, classWeekLetter: 's' };
    expect(englishSummary(onS, 'ava', W(2)).text).toBe(
      "Ava continued with the Dark Phonics 's' book this week. Next week we will try to complete the series."
    );
  });

  it('Sara week 10 (mid-year joiner, contiguous run)', () => {
    expect(englishSummary(ledger, 'sara', W(10)).text).toBe(
      "Sara did Dark Phonics 'p' works 1 to 3. She is starting to match whole sentences to their pictures. Next week we will try to complete the series."
    );
  });

  it('Noor week 6 (non-contiguous works)', () => {
    expect(englishSummary(ledger, 'noor', W(6)).text).toBe(
      "Noor did Dark Phonics 'i' work 2 and work 4. They are starting to build the sentence by choosing the changing word. Next week we will try to complete the series."
    );
  });

  it('Tom week 4 (Writing Shelf)', () => {
    expect(englishSummary(ledger, 'tom', W(4)).text).toBe(
      'Tom worked on Writing Shelf tray 1, Sound boxes. He is starting to form the letters with more control. Next week we will continue with tray 1.'
    );
  });

  it('every summary of the term is at most 40 words', () => {
    for (const child of ledger.children) {
      for (const week of WEEK_STARTS) {
        const s = englishSummary(ledger, child.id, week);
        expect(s.words).toBeLessThanOrEqual(WORD_CAP);
        expect(s.words).toBe(s.text.trim().split(/\s+/).filter(Boolean).length);
      }
    }
  });

  it('no summary ever names a non-Dark-Phonics / non-Writing-Shelf work', () => {
    const banned = ['Blue Series', 'Beginning Sounds', 'Magic e', 'Lesson'];
    for (const child of ledger.children) {
      for (const week of WEEK_STARTS) {
        const { text } = englishSummary(ledger, child.id, week);
        for (const word of banned) expect(text).not.toContain(word);
      }
    }
  });

  it("Tom's blends row on the same day is invisible to the parent", () => {
    const ticks = weekTicks(ledger.events, 'tom', W(4));
    expect(ticks.map((t) => t.work_key).sort()).toEqual(['lang:blue-series-blends', 'ws:1']);
    expect(englishSummary(ledger, 'tom', W(4)).text).not.toMatch(/blend/i);
  });
});

describe('rule 7/8 — the ribbon and "next"', () => {
  const currentAll = rebuildCurrent(ledger.events.filter((e) => e.created_at < `${W(4)}T00:00:00Z`));

  it('Mei after week 3: s and a mastered, t untouched, f still coming', () => {
    const r = ribbon(childCurrent(currentAll, 'mei'), works);
    expect(r.s).toBe('mastered');
    expect(r.a).toBe('mastered');
    expect(r.t).toBe('not-started');
    expect(r.f).toBe('coming');
  });

  it('Li after week 3 is in progress on s', () => {
    expect(ribbon(childCurrent(currentAll, 'li'), works).s).toBe('in-progress');
  });

  it('Sara is mastered through t after the backfill, and current on p', () => {
    const end = rebuildCurrent(ledger.events);
    const r = ribbon(childCurrent(end, 'sara'), works);
    expect([r.s, r.a, r.t, r.p]).toEqual(['mastered', 'mastered', 'mastered', 'in-progress']);
    expect(currentLetter(childCurrent(end, 'sara'), works)).toBe('p');
  });
});

describe('rule 10 / read-time flags', () => {
  it('scenario "Li stalls": stuck after three weeks on the same work', () => {
    const week7 = flags(ledger, sunday(7));
    const stuck = week7.filter((f) => f.code === 'stuck');
    expect(stuck.map((f) => f.childId)).toEqual(['li']);
    expect(stuck[0].workKey).toBe('dp:s:4');
  });

  it('scenario "Amir absent": no observation for 14 days', () => {
    const week9 = flags(ledger, sunday(9));
    const silent = week9.filter((f) => f.code === 'no-observation').map((f) => f.childId);
    expect(silent).toContain('amir');
    expect(silent).toContain('ava');
    expect(silent).not.toContain('sara');
  });

  // 2026-09-07: rule 7's Dark Phonics amendment retired Noor's INSIDE-A-BOOK
  // gap. A book is done in order, so an observed 'i' work 4 means works 1-3
  // happened; "work 2 and work 4, nothing between" is a recording gap, not a
  // teaching one, and flagging it sent teachers back to work already done.
  // The journal is untouched — the implication is derived on every read.
  it('scenario "Noor": an inside-a-book gap is implied away, not flagged', () => {
    const gaps = flags(ledger, sunday(12)).filter((f) => f.code === 'gap' && f.childId === 'noor');
    expect(gaps).toEqual([]);
    // Nothing was written: the journal still says work 3 was never started…
    expect(currentStatus(ledger.events, 'noor', 'dp:i:3')).toBe('not_started');
    // …and the read says mastered, because work 4 was observed.
    const noor = childCurrent(rebuildCurrent(ledger.events), 'noor');
    expect(withImpliedDarkPhonics(noor, works).get('dp:i:3')).toBe('mastered');
    expect(impliedDarkPhonics(noor, works).get('dp:i:3')).toMatchObject({
      by_work_key: 'dp:i:4',
      by_n: 4,
    });
  });

  it('a steady child has no gaps', () => {
    const gaps = flags(ledger, sunday(12)).filter((f) => f.code === 'gap' && f.childId === 'chris');
    expect(gaps).toEqual([]);
  });
});

describe('rule 8 — the Weekly Plan Language cell', () => {
  it('shows the furthest work of the week', () => {
    expect(planLanguageCell(ledger, 'chris', W(5))).toBe('s Dark Phonics work 5');
    expect(planLanguageCell(ledger, 'sara', W(10))).toBe('p Dark Phonics work 3');
    expect(planLanguageCell(ledger, 'tom', W(4))).toBe('Writing Shelf tray 1 · Sound boxes');
  });

  it('falls back to the next undone work when the week is empty', () => {
    expect(planLanguageCell(ledger, 'amir', W(9))).toBe('s Dark Phonics work 4');
  });

  it('never offers a legacy Language work', () => {
    for (const child of ledger.children) {
      for (const week of WEEK_STARTS) {
        const cell = planLanguageCell(ledger, child.id, week);
        if (cell) {
          expect(cell).not.toContain('Blue Series');
          expect(cell).not.toContain('Beginning Sounds');
        }
      }
    }
  });
});

describe('rules 5/6 — scenario "Teacher typing"', () => {
  it('resolves the three typed forms of t work 3', () => {
    for (const typed of ['T-Work-3', 't w3', 't dark phonics work 3']) {
      const r = resolveWorkName(typed, works);
      expect(r.kind).toBe('resolved');
      if (r.kind === 'resolved') expect(r.work.work_key).toBe('dp:t:3');
    }
  });

  it('"Blue Series blends" never reaches the Language ribbon', () => {
    const r = resolveWorkName('Blue Series blends', works);
    // It IS a real curriculum row, so the resolver is honest about it…
    expect(r.kind).toBe('resolved');
    if (r.kind === 'resolved') expect(r.work.group).toBe('other');
    // …but the Dark Phonics tracker only accepts dp:/ws: keys, so it queues.
    expect(routeTyped('Blue Series blends')).toEqual({ queue: true, reason: 'not-a-language-shelf-work' });
  });

  it('an unrecognisable name queues rather than writing', () => {
    expect(routeTyped('Blue Series blends level three')).toMatchObject({ queue: true });
    expect(routeTyped('the sat')).toMatchObject({ queue: true });
  });
});

function routeTyped(typed: string): { queue: true; reason: string } | { queue: false; workKey: string } {
  const r = resolveWorkName(typed, works);
  if (r.kind !== 'resolved') return { queue: true, reason: r.reason };
  const group = r.work.group ?? 'other';
  if (group !== 'dark-phonics' && group !== 'writing-shelf') {
    return { queue: true, reason: 'not-a-language-shelf-work' };
  }
  return { queue: false, workKey: r.work.work_key };
}

describe('scenario "AI capture 0.92 → door, 0.70 → queue"', () => {
  const AI_MIN = 0.85;

  function routeAi(name: string, confidence: number) {
    const r = resolveWorkName(name, works);
    if (r.kind !== 'resolved') return { queue: true as const, reason: r.reason };
    if (confidence < AI_MIN) return { queue: true as const, reason: 'low-confidence' };
    const source: Source = 'ai';
    return {
      queue: false as const,
      event: ev('kid', r.work.work_key, 1, 0, { source, actor: 'ai:photo-insight' }),
    };
  }

  it('0.92 goes through the door as source "ai"', () => {
    const out = routeAi('t work 3', 0.92);
    expect(out.queue).toBe(false);
    if (!out.queue) {
      expect(out.event.source).toBe('ai');
      expect(out.event.work_key).toBe('dp:t:3');
      expect(applyEvent(emptyState(), out.event).accepted).toBe(true);
    }
  });

  it('0.70 goes to the queue and writes nothing', () => {
    expect(routeAi('t work 3', 0.7)).toEqual({ queue: true, reason: 'low-confidence' });
  });
});

describe('rule 10 — invariants', () => {
  it('reports "all consistent" for the clean term with a matching cache', () => {
    const violations = checkInvariants(ledger, {
      asOf: day(12, 1),
      currentTable: rebuildCurrent(ledger.events),
    }).filter((v) => v.code !== 'no-observation-10d');
    expect(violations).toEqual([]);
  });

  it('catches a row with no key', () => {
    const dirty = {
      ...ledger,
      events: [
        ...ledger.events,
        { ...ev('mei', 'dp:s:1', 1, 0), work_key: null, work_name: 'Blue Series blends' },
      ],
    };
    const codes = checkInvariants(dirty, { asOf: day(12, 1) }).map((v) => v.code);
    expect(codes).toContain('no-key');
  });

  it('catches a cached status the journal cannot account for', () => {
    const cache = rebuildCurrent(ledger.events);
    cache.get('ava')!.set('dp:s:5', 'mastered');
    const found = checkInvariants(ledger, { asOf: day(12, 1), currentTable: cache }).find(
      (v) => v.code === 'status-without-event'
    );
    expect(found?.workKey).toBe('dp:s:5');
  });

  it('catches a mastered letter with a work missing from the curriculum', () => {
    const thin = { ...ledger, works: ledger.works.filter((w) => w.work_key !== 'dp:s:5') };
    const found = checkInvariants(thin, { asOf: day(12, 1) }).find(
      (v) => v.code === 'mastered-letter-missing-work'
    );
    expect(found?.workKey).toBe('dp:s:5');
  });

  it('catches a focus work that is not in the curriculum', () => {
    const found = checkInvariants(ledger, {
      asOf: day(12, 1),
      focus: [{ childId: 'mei', workName: 'Magic e sheets' }],
    }).find((v) => v.code === 'focus-not-in-curriculum');
    expect(found?.childId).toBe('mei');
  });

  it('catches a duplicate work name', () => {
    const dupe = {
      ...ledger,
      works: [
        ...ledger.works,
        { work_key: 'lang:blends-2', name: 'Blue Series Blends', area: 'Language', sequence: 9003 },
      ],
    };
    expect(checkInvariants(dupe, { asOf: day(12, 1) }).map((v) => v.code)).toContain(
      'duplicate-work-name'
    );
  });

  it('catches ten days of silence', () => {
    const codes = checkInvariants(ledger, { asOf: day(12, 1) }).filter(
      (v) => v.code === 'no-observation-10d'
    );
    expect(codes.map((c) => c.childId)).toContain('amir');
  });

  it('scenario "Old pointer at lesson 54": the legacy pointer is flagged, never surfaced', () => {
    const found = checkInvariants(ledger, {
      asOf: day(12, 1),
      legacyPointers: { mei: 54 },
    }).find((v) => v.code === 'legacy-pointer-conflict');
    expect(found?.childId).toBe('mei');
    expect(found?.message).toContain('54');
    // …and nothing derived from the ledger mentions the 1–128 sequence.
    for (const week of WEEK_STARTS) {
      expect(englishSummary(ledger, 'mei', week).text).not.toMatch(/magic e|lesson/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// RULE 7's DARK PHONICS AMENDMENT — implied earlier works
//
// "Dark Phonics works are strictly sequential within a book: an observed work
// implies the earlier works of that book are mastered — derived, never written."
//
// The whole story on one child, in order: a photo of 't' work 4 arrives; works
// 1-3 read as mastered without a row being written; work 5 is mastered and the
// ribbon goes gold; then the work-4 observation is corrected away and every
// implication it was carrying disappears with it, by itself.
// ─────────────────────────────────────────────────────────────────────────

describe('rule 7 — an observed work implies the earlier works of its book', () => {
  const worksOnly = buildWorks();
  const iris = { id: 'iris', name: 'Iris', pronoun: 'she' as const };
  const term = (events: ProgressEvent[]): Ledger => ({
    events,
    works: worksOnly,
    children: [iris],
    classWeekLetter: 't',
    weekStarts: WEEK_STARTS,
  });

  // A single photo of 't' work 4. Nothing else was ever ticked for Iris.
  const photoOfWork4 = ev('iris', 'dp:t:4', 5, 1, { status: 'presented', source: 'photo', evidence_id: 'iris-t4' });
  const seenAt4 = term([photoOfWork4]);
  const currentAt4 = childCurrent(rebuildCurrent(seenAt4.events), 'iris');

  it('a photo of t work 4 makes t works 1-3 mastered', () => {
    const derived = withImpliedDarkPhonics(currentAt4, worksOnly);
    expect(derived.get('dp:t:1')).toBe('mastered');
    expect(derived.get('dp:t:2')).toBe('mastered');
    expect(derived.get('dp:t:3')).toBe('mastered');
    // The observed work keeps the rung the journal gave it.
    expect(derived.get('dp:t:4')).toBe('presented');
    expect(derived.get('dp:t:5') ?? 'not_started').toBe('not_started');
  });

  it('every implication names the observation it came from', () => {
    const implied = impliedDarkPhonics(currentAt4, worksOnly);
    expect([...implied.keys()].sort()).toEqual(['dp:t:1', 'dp:t:2', 'dp:t:3']);
    for (const cell of implied.values()) {
      expect(cell.by_work_key).toBe('dp:t:4');
      expect(cell.by_n).toBe(4);
      expect(cell.letter).toBe('t');
    }
  });

  it('nothing is written — the journal still holds exactly one row', () => {
    expect(seenAt4.events).toHaveLength(1);
    expect(currentStatus(seenAt4.events, 'iris', 'dp:t:1')).toBe('not_started');
    expect(currentAt4.has('dp:t:1')).toBe(false);
  });

  it('the ribbon says t is in progress, and says nothing about any other book', () => {
    const r = ribbon(currentAt4, worksOnly);
    expect(r.t).toBe('in-progress');
    expect(r.s).toBe('not-started');
    expect(r.a).toBe('not-started');
  });

  it('never crosses a letter: s and a are untouched', () => {
    const derived = withImpliedDarkPhonics(currentAt4, worksOnly);
    for (const letter of ['s', 'a', 'p', 'i']) {
      for (let n = 1; n <= 5; n++) {
        expect(derived.get(`dp:${letter}:${n}`) ?? 'not_started').toBe('not_started');
      }
    }
  });

  it('never touches the Writing Shelf: a tray implies nothing below it', () => {
    const trayFive = term([ev('iris', 'ws:5', 5, 1, { status: 'presented' })]);
    const derived = withImpliedDarkPhonics(
      childCurrent(rebuildCurrent(trayFive.events), 'iris'),
      worksOnly
    );
    for (const n of [1, 2, 3, 4]) expect(derived.get(`ws:${n}`) ?? 'not_started').toBe('not_started');
    expect(impliedDarkPhonics(childCurrent(rebuildCurrent(trayFive.events), 'iris'), worksOnly).size).toBe(0);
  });

  it('no gap flag fires for a dp work below an observed one', () => {
    expect(flags(seenAt4, sunday(5)).filter((f) => f.code === 'gap')).toEqual([]);
  });

  // …then work 5 is mastered, and the book is finished.
  const finished = term([photoOfWork4, ev('iris', 'dp:t:5', 6, 1)]);
  const currentAt5 = childCurrent(rebuildCurrent(finished.events), 'iris');

  it('t work 5 mastered turns the whole letter gold', () => {
    expect(ribbon(currentAt5, worksOnly).t).toBe('mastered');
    expect(isLetterMastered(currentAt5, worksOnly, 't')).toBe(true);
    // Work 4 was only ever 'presented'; work 5's observation implies it now.
    expect(impliedDarkPhonics(currentAt5, worksOnly).get('dp:t:4')).toMatchObject({ by_n: 5 });
    // Still two rows in the journal. Gold is derived, not stored.
    expect(finished.events).toHaveLength(2);
  });

  // …and then the photo turns out to have been of another child.
  const corrected = term([
    photoOfWork4,
    ev('iris', 'dp:t:4', 7, 1, {
      status: 'not_started',
      source: 'correction',
      reason: 'That photo was of another child — Iris has not been presented work 4.',
    }),
  ]);

  it('correcting the work-4 observation away removes every implication with it', () => {
    const after = childCurrent(rebuildCurrent(corrected.events), 'iris');
    expect(after.get('dp:t:4') ?? 'not_started').toBe('not_started');
    expect(impliedDarkPhonics(after, worksOnly).size).toBe(0);
    const derived = withImpliedDarkPhonics(after, worksOnly);
    for (let n = 1; n <= 5; n++) {
      expect(derived.get(`dp:t:${n}`) ?? 'not_started').toBe('not_started');
    }
    expect(ribbon(after, worksOnly).t).toBe('not-started');
  });

  it('a correction that only steps the ladder down keeps the implications it still earns', () => {
    const down = term([
      ev('iris', 'dp:t:4', 5, 1),
      ev('iris', 'dp:t:4', 7, 1, {
        status: 'presented',
        source: 'correction',
        reason: 'Marked mastered too early.',
      }),
    ]);
    const after = childCurrent(rebuildCurrent(down.events), 'iris');
    expect(after.get('dp:t:4')).toBe('presented');
    // Still observed at work 4, so works 1-3 are still implied.
    expect([...impliedDarkPhonics(after, worksOnly).keys()].sort()).toEqual([
      'dp:t:1', 'dp:t:2', 'dp:t:3',
    ]);
  });

  // The guidance cases use the FIRST book, 's', so that nothing below it can be
  // mistaken for the point being made: the only works under an observed 's'
  // work 3 are 's' works 1-2, and they are implied, not gaps.
  const atWork3 = term([ev('iris', 'dp:s:3', 5, 1)]);

  it('guidance: the next work after an observed work 3 is work 4, never work 1', () => {
    const language = nextWorks(atWork3, 'iris', { asOf: day(5, 3) }).find(
      (g) => g.area === 'language' && g.track === 'main'
    );
    expect(language?.next?.work_key).toBe('dp:s:4');
    expect(language?.reason).toBe('present-next');
    // Rule 7's gap machinery must stay quiet: works 1-2 are not holes.
    expect(language?.gaps.map((g) => g.work_key)).toEqual([]);
  });

  it('guidance: a still-open work 3 is continued, and still never sends him back to work 1', () => {
    const open = term([ev('iris', 'dp:s:3', 5, 1, { status: 'practicing' })]);
    const language = nextWorks(open, 'iris', { asOf: day(5, 3) }).find(
      (g) => g.area === 'language' && g.track === 'main'
    );
    expect(language?.next?.work_key).toBe('dp:s:3');
    expect(language?.reason).toBe('continue-practising');
  });

  it('the plan cell offers work 4, not work 1', () => {
    expect(planLanguageCell(atWork3, 'iris', W(6))).toBe('s Dark Phonics work 4');
  });

  it('the weekly summary of an implied week names only what was observed', () => {
    const text = englishSummary(seenAt4, 'iris', W(5)).text;
    expect(text).toContain("Iris did Dark Phonics 't' work 4.");
    expect(text).not.toMatch(/work 1|works 1/);
  });
});
