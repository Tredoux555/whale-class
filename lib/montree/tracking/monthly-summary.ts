// lib/montree/tracking/monthly-summary.ts
//
// THE MONTHLY SUMMARY (2026-09-15) — per child, ONE short sentence about what
// the child focused on in ENGLISH (the Language area) that month and how far
// they moved, in a professional Montessori register:
//
//   "This month Eric focused on Dark Phonics 't' Work 2, moving from
//    introduction to confident independent practice."
//   "This month Stella consolidated Dark Phonics 's' Work 5, and was
//    introduced to Writing Shelf tray 2 (Word chains)."
//
// Source of truth is the TRACKING LEDGER (rule 3), not photos: the child's
// Language events in [1st, last day of month] read in the school's timezone,
// grouped by work (Dark Phonics by letter family, exactly as summary.ts
// observedWorks() groups a week), and each work's status at the START of the
// month compared with its status at the END. The comparison picks the verb
// (introduced / practising / confident / consolidated …). No model, no
// invented fact — the sentence can only name works the journal holds and
// transitions the journal replays.
//
// Rules this file keeps (tests/tracking/monthly-summary.test.ts):
//   * Pure and deterministic — same ledger in, same bytes out, any event order.
//   * Top 3 works by frequency (then recency, then label); fewer if the cap bites.
//   * <= 35 English words, counted here.
//   * ENGLISH ONLY (owner, 2026-09-16): the Monthly Summary tab is pure English.
//   * Never "no observations": a child with no Language work that month gets a
//     SPEAKING-domain phrase from phrase-bank.ts (the owner's quiet-period rule).

import { normaliseArea } from './guidance';
import { rangeTicks, type Tick } from './derive';
import { replayBefore, STATUS_RANK, tzOf } from './ledger';
import { fallbackSentence } from './phrase-bank';
import { capToWords, countWords, joinList, trayNameOf } from './summary';
import type { Child, Ledger, Status } from './types';

export const MONTHLY_WORD_CAP = 35;
export const MONTHLY_MAX_WORKS = 3;

/** How a work moved between the first and the last day of the month. */
export type MonthlyVerb =
  | 'introduced' //            nothing → presented
  | 'revisited' //             presented → presented (a repeat)
  | 'practising' //            nothing/presented → practising
  | 'continued' //             practising → practising
  | 'confident' //             nothing/presented → mastered
  | 'confident-from-practice' // practising → mastered
  | 'consolidated' //          mastered → mastered (repeat work on a mastered work)
  | 'progressed'; //           several works of one Dark Phonics book

export interface MonthlyWorkFact {
  /** 'dp:t' for a Dark Phonics family, otherwise the work key. */
  id: string;
  label: string;
  count: number;
  /** ISO timestamp of the latest observation this month. */
  last: string;
  from: Status;
  to: Status;
  verb: MonthlyVerb;
}

export interface MonthlySummary {
  text: string;
  words: number;
  /** The facts the sentence was built from (already cut to what fits). */
  works: MonthlyWorkFact[];
  /** True when the child had no Language work and the phrase bank spoke. */
  fallback: boolean;
}

// ── Dates ────────────────────────────────────────────────────────────────

/** [first, last] calendar day of the month whose key is `monthStart` (YYYY-MM-01). */
export function monthBounds(monthStart: string): { from: string; to: string } {
  const d = new Date(`${monthStart.slice(0, 7)}-01T00:00:00.000Z`);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return { from: d.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

function dayAfter(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ── Facts ────────────────────────────────────────────────────────────────

function dpParts(key: string): { letter: string; n: number } | null {
  const m = /^dp:([a-z]{1,2}):([1-5])$/.exec(key);
  return m ? { letter: m[1], n: Number(m[2]) } : null;
}

function wsTray(key: string): number | null {
  const m = /^ws:([0-9]+)$/.exec(key);
  return m ? Number(m[1]) : null;
}

function rank(s: Status | undefined): number {
  return STATUS_RANK[s ?? 'not_started'] ?? 0;
}

export function verbFor(from: Status, to: Status, family: boolean): MonthlyVerb {
  if (family) return 'progressed';
  const rf = rank(from);
  if (to === 'mastered') return rf >= 3 ? 'consolidated' : rf === 2 ? 'confident-from-practice' : 'confident';
  if (to === 'practicing') return rf >= 2 ? 'continued' : 'practising';
  return rf >= 1 ? 'revisited' : 'introduced';
}

/**
 * A Language work, by rule 1's keys first (dp:/ws: are always the English
 * shelf) and then by the curriculum row's area — which is how Whale Class's
 * custom_* Dark Phonics / CVC rows are recognised. Corrections fix the
 * ledger; they are not a month's work.
 */
function isLanguageTick(t: Tick, areaOf: (key: string) => string | null | undefined): boolean {
  if (t.event.source === 'correction') return false;
  if (t.work_key.startsWith('dp:') || t.work_key.startsWith('ws:')) return true;
  return normaliseArea(areaOf(t.work_key) ?? t.event.area ?? '') === 'language';
}

interface Acc {
  id: string;
  count: number;
  last: string;
  key: string;
  dpLetter?: string;
  dpNs: number[];
}

/**
 * Every Language work the child was observed at in the month, with its
 * start-of-month and end-of-month status, ranked. Pure.
 */
export function monthlyLanguageWorks(ledger: Ledger, childId: string, monthStart: string): MonthlyWorkFact[] {
  const tz = tzOf(ledger);
  const { from, to } = monthBounds(monthStart);
  const byKey = new Map(ledger.works.map((w) => [w.work_key, w]));
  const ticks = rangeTicks(ledger.events, childId, from, to, tz).filter((t) =>
    isLanguageTick(t, (k) => byKey.get(k)?.area),
  );
  if (ticks.length === 0) return [];

  const startState = replayBefore(ledger.events, from, tz).state.current.get(childId);
  const endState = replayBefore(ledger.events, dayAfter(to), tz).state.current.get(childId);
  const startOf = (k: string): Status => startState?.get(k) ?? 'not_started';
  const endOf = (k: string): Status => endState?.get(k) ?? 'not_started';

  const acc = new Map<string, Acc>();
  for (const t of ticks) {
    const dp = dpParts(t.work_key);
    const id = dp ? `dp:${dp.letter}` : t.work_key;
    let a = acc.get(id);
    if (!a) {
      a = { id, count: 0, last: '', key: t.work_key, dpLetter: dp?.letter, dpNs: [] };
      acc.set(id, a);
    }
    a.count += 1;
    if (t.event.created_at > a.last) a.last = t.event.created_at;
    if (dp && !a.dpNs.includes(dp.n)) a.dpNs.push(dp.n);
  }

  const out: MonthlyWorkFact[] = [];
  for (const a of acc.values()) {
    let label: string;
    let fromStatus: Status;
    let toStatus: Status;
    let family = false;
    if (a.dpLetter) {
      const ns = [...a.dpNs].sort((x, y) => x - y);
      const lo = ns[0];
      const hi = ns[ns.length - 1];
      family = ns.length > 1;
      const loKey = `dp:${a.dpLetter}:${lo}`;
      const hiKey = `dp:${a.dpLetter}:${hi}`;
      fromStatus = startOf(loKey);
      toStatus = endOf(hiKey);
      label = family ? `Dark Phonics '${a.dpLetter}' Works ${lo}–${hi}` : `Dark Phonics '${a.dpLetter}' Work ${lo}`;
    } else {
      fromStatus = startOf(a.key);
      toStatus = endOf(a.key);
      const tray = wsTray(a.key);
      const work = byKey.get(a.key);
      if (tray !== null) {
        const material = trayNameOf(ledger, a.key);
        label = material ? `Writing Shelf tray ${tray} (${material})` : `Writing Shelf tray ${tray}`;
      } else {
        const fallback = ticks.find((t) => t.work_key === a.key)?.work_name ?? a.key;
        label = (work?.name ?? '').trim() || fallback;
      }
    }
    out.push({
      id: a.id,
      label,
      count: a.count,
      last: a.last,
      from: fromStatus,
      to: toStatus,
      verb: verbFor(fromStatus, toStatus, family),
    });
  }

  out.sort((x, y) => {
    if (x.count !== y.count) return y.count - x.count;
    if (x.last !== y.last) return x.last < y.last ? 1 : -1;
    return x.label.localeCompare(y.label);
  });
  return out;
}

// ── Templates ────────────────────────────────────────────────────────────

/** One work: a full sentence that says where it started and where it ended. */
function singleEn(name: string, f: MonthlyWorkFact): string {
  const A = f.label;
  switch (f.verb) {
    case 'confident':
      return `This month ${name} focused on ${A}, moving from introduction to confident independent practice.`;
    case 'confident-from-practice':
      return `This month ${name} focused on ${A}, moving from guided practice to confident independent work.`;
    case 'consolidated':
      return `This month ${name} consolidated ${A} and now works with it confidently and independently.`;
    case 'practising':
      return `This month ${name} was introduced to ${A} and is practising it with growing accuracy.`;
    case 'continued':
      return `This month ${name} continued practising ${A} with growing accuracy.`;
    case 'revisited':
      return `This month ${name} returned to ${A}, building on its introduction.`;
    case 'progressed':
      return f.to === 'mastered'
        ? `This month ${name} worked steadily through ${A} and is confident with them.`
        : f.to === 'practicing'
          ? `This month ${name} worked steadily through ${A} and is practising the latest one.`
          : `This month ${name} worked steadily through ${A} and has just been introduced to the latest one.`;
    case 'introduced':
    default:
      return `This month ${name} was introduced to ${A} and has begun to explore it.`;
  }
}

/** Several works: one clause per verb, in ranked order. */
const CLAUSE_EN: Record<MonthlyVerb, (list: string) => string> = {
  consolidated: (l) => `consolidated ${l}`,
  confident: (l) => `became confident with ${l}`,
  'confident-from-practice': (l) => `became confident with ${l}`,
  progressed: (l) => `worked through ${l}`,
  practising: (l) => `began practising ${l}`,
  continued: (l) => `continued practising ${l}`,
  introduced: (l) => `was introduced to ${l}`,
  revisited: (l) => `revisited ${l}`,
};

function groups(facts: readonly MonthlyWorkFact[]): Array<{ clauseKey: string; verb: MonthlyVerb; items: MonthlyWorkFact[] }> {
  const out: Array<{ clauseKey: string; verb: MonthlyVerb; items: MonthlyWorkFact[] }> = [];
  for (const f of facts) {
    // 'confident' and 'confident-from-practice' read the same in a list.
    const clauseKey = f.verb === 'confident-from-practice' ? 'confident' : f.verb;
    const g = out.find((x) => x.clauseKey === clauseKey);
    if (g) g.items.push(f);
    else out.push({ clauseKey, verb: f.verb, items: [f] });
  }
  // The strongest movement leads the sentence ("consolidated X and began Y");
  // Array.sort is stable, so equal verbs keep their ranked order.
  return out.sort((a, b) => CLAUSE_ORDER.indexOf(a.clauseKey) - CLAUSE_ORDER.indexOf(b.clauseKey));
}

const CLAUSE_ORDER: readonly string[] = [
  'consolidated',
  'confident',
  'progressed',
  'continued',
  'practising',
  'revisited',
  'introduced',
];

function multiEn(name: string, facts: readonly MonthlyWorkFact[]): string {
  const clauses = groups(facts).map((g) => CLAUSE_EN[g.verb](joinList(g.items.map((f) => f.label))));
  const body =
    clauses.length === 1
      ? clauses[0]
      : clauses.length === 2
        ? `${clauses[0]} and ${clauses[1]}`
        : `${clauses.slice(0, -1).join(', ')}, and ${clauses[clauses.length - 1]}`;
  return `This month ${name} ${body}.`;
}

function sentence(name: string, facts: readonly MonthlyWorkFact[]): string {
  return facts.length === 1 ? singleEn(name, facts[0]) : multiEn(name, facts);
}

// ── The answer ───────────────────────────────────────────────────────────

/**
 * The child's Monthly Summary sentence (English only). The word cap decides
 * how many works are named. Returns an empty summary for an unknown child.
 */
export function monthlyLanguageSummary(
  ledger: Ledger,
  childId: string,
  monthStart: string,
  cap = MONTHLY_WORD_CAP,
): MonthlySummary {
  const child: Child | undefined = ledger.children.find((c) => c.id === childId);
  if (!child) return { text: '', words: 0, works: [], fallback: false };
  const name = String(child.name ?? '').trim();
  const all = monthlyLanguageWorks(ledger, childId, monthStart);

  if (all.length === 0) {
    const raw = fallbackSentence({ ...child, name }, monthStart, 'en', ['speaking']);
    const text = countWords(raw) > cap ? capToWords([raw], cap) : raw;
    return { text, words: countWords(text), works: [], fallback: true };
  }

  let kept = all.slice(0, MONTHLY_MAX_WORKS);
  let text = sentence(name, kept);
  while (countWords(text) > cap && kept.length > 1) {
    kept = kept.slice(0, -1);
    text = sentence(name, kept);
  }
  if (countWords(text) > cap) text = capToWords([text], cap);
  return { text, words: countWords(text), works: kept, fallback: false };
}
