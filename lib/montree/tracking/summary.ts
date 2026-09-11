// lib/montree/tracking/summary.ts
//
// Rule 9: TEMPLATES BEFORE AI. The weekly summary is assembled from ticks, in
// code, with a hard 40-word cap counted here. AI may rephrase what this returns;
// it may never add a fact this file did not produce.
//
// 2026-09-11 — THE DIRECTOR'S RULE. This file used to narrate a single shelf:
// it read ONLY `dp:` and `ws:` work keys, picked ONE work, and then wrote two
// more sentences it had not observed ("is starting to build the sentence…",
// "Next week we will try to complete the series."). Two things followed:
//
//   * Every work whose key was not dp:/ws: was invisible. Whale Class taps its
//     Dark Phonics and CVC works on CLASSROOM-CUSTOM curriculum rows
//     (custom_cvc_encoding_…, custom_dark_phonics_work_3_…), so children who
//     had worked all week produced ZERO ticks here and fell through to the
//     "<Name> has not started the Dark Phonics 's' book yet." branch — a
//     statement that was simply false.
//   * The second and third sentences were judgements and plans nobody recorded.
//
// The rule now is the plain one: SAY WHAT THE CHILD DID. Every work observed
// this week, by its curriculum name, de-duplicated, one sentence, no negative
// sentence, no invented progress, no invented plan. A child with nothing
// observed is reported as having nothing observed — not as having failed to
// start something.

import { tzOf } from './ledger';
import { weekTicks, type Tick } from './derive';
import type { Child, Ledger } from './types';

export const WORD_CAP = 40;

/** How many works are named before the sentence switches to "and N more". */
export const MAX_NAMED_WORKS = 6;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Drop whole sentences from the end until the text fits the cap. */
export function capToWords(sentences: readonly string[], cap = WORD_CAP): string {
  const kept: string[] = [];
  for (const s of sentences) {
    const candidate = [...kept, s].join(' ');
    if (countWords(candidate) > cap) break;
    kept.push(s);
  }
  if (kept.length === 0 && sentences.length > 0) {
    // A single opening sentence longer than the cap: trim words, keep the stop.
    const words = sentences[0].trim().split(/\s+/).slice(0, cap);
    const last = words[words.length - 1];
    if (!/[.!?]$/.test(last)) words[words.length - 1] = `${last.replace(/[.,;:]$/, '')}.`;
    return words.join(' ');
  }
  return kept.join(' ');
}

function dpParts(key: string): { letter: string; n: number } | null {
  const m = /^dp:([a-z]{1,2}):([1-5])$/.exec(key);
  return m ? { letter: m[1], n: Number(m[2]) } : null;
}

function wsTray(key: string): number | null {
  const m = /^ws:([0-9]+)$/.exec(key);
  return m ? Number(m[1]) : null;
}

/**
 * The tray's MATERIAL, and never anything else — the clause this feeds is
 * "Writing Shelf tray 3 (Word chains)", built from the tray NUMBER plus this
 * string. Real curriculum rows carry the material in `description`
 * (migration 346) while `name` carries the tray heading, and since migration 352
 * the display name carries BOTH ('Writing Shelf tray 3 · Word chains').
 *
 * So the name is only ever read for its TAIL. Returning the whole name would
 * double the heading back at a parent, and a heading with no material behind it
 * returns '' instead, which drops the bracket.
 */
const TRAY_HEADING = /^\s*(?:writing\s+shelf\s+)?tray\s+\d+\s*$/i;

function trayNameOf(ledger: Ledger, key: string): string {
  const work = ledger.works.find((w) => w.work_key === key);
  const description = (work?.description ?? '').trim();
  if (description && !TRAY_HEADING.test(description)) return description;
  const name = (work?.name ?? '').trim();
  // '·' (352), '—'/'–'/'-' (the older hand-made rows: "Writing Shelf tray 3 — Metal insets").
  const parts = name.split(/\s+[—–·-]\s+/);
  const tail = parts.length > 1 ? parts[parts.length - 1].trim() : '';
  if (tail && !TRAY_HEADING.test(tail)) return tail;
  return '';
}

export interface Summary {
  text: string;
  words: number;
}

/** One work (or one collapsed family of works) the child was observed at. */
export interface ObservedWork {
  /** Stable identity used to de-duplicate: 'dp:s', 'ws:3', or the work key. */
  id: string;
  label: string;
  labelZh: string;
  /** How many observations rolled into this entry. */
  count: number;
  /** ISO timestamp of the most recent observation. */
  last: string;
}

/**
 * A tick is real activity unless it is a record correction — a correction fixes
 * the journal, it is not a week's work. EVERYTHING else counts, whatever the
 * work key looks like: dp:, ws:, la_, ma_, custom_… . A photo confirmed onto a
 * work already arrives here as a progress event with source 'photo' (the
 * photo-audit resolve route writes one), so a tagged photo is evidence of doing
 * the work even with no separate tracker tap.
 */
function narratable(t: Tick): boolean {
  return t.event.source !== 'correction';
}

/**
 * Every work the child was observed at in one week, de-duplicated and ordered
 * by frequency then recency. Pure and shuffle-stable: the same ledger in any
 * event order produces byte-identical output.
 */
export function observedWorks(ledger: Ledger, childId: string, weekStart: string): ObservedWork[] {
  const tz = tzOf(ledger);
  const ticks = weekTicks(ledger.events, childId, weekStart, tz).filter(narratable);
  const byKey = new Map(ledger.works.map((w) => [w.work_key, w]));

  const acc = new Map<string, { count: number; last: string; dpLetter?: string; dpMax?: number; key: string }>();
  for (const t of ticks) {
    const dp = dpParts(t.work_key);
    const id = dp ? `dp:${dp.letter}` : t.work_key;
    const prev = acc.get(id);
    if (!prev) {
      acc.set(id, {
        count: 1,
        last: t.event.created_at,
        dpLetter: dp?.letter,
        dpMax: dp?.n,
        key: t.work_key,
      });
      continue;
    }
    prev.count += 1;
    if (t.event.created_at > prev.last) prev.last = t.event.created_at;
    // The HIGHEST work number observed is the one a parent is told about.
    if (dp && (prev.dpMax === undefined || dp.n > prev.dpMax)) {
      prev.dpMax = dp.n;
      prev.key = t.work_key;
    }
    // A non-dp family keeps its first key; there is only ever one.
  }

  const out: ObservedWork[] = [];
  for (const [id, v] of acc) {
    const work = byKey.get(v.key);
    const fallback = ticks.find((t) => t.work_key === v.key)?.work_name ?? v.key;
    const curriculumName = (work?.name ?? '').trim() || fallback;
    const zhName = (work?.name_chinese ?? '').trim() || curriculumName;

    let label: string;
    let labelZh: string;
    if (v.dpLetter) {
      label = `Dark Phonics '${v.dpLetter}' (work ${v.dpMax})`;
      labelZh = label;
    } else {
      const tray = wsTray(v.key);
      if (tray !== null) {
        const material = trayNameOf(ledger, v.key);
        label = material ? `Writing Shelf tray ${tray} (${material})` : `Writing Shelf tray ${tray}`;
        labelZh = label;
      } else {
        label = curriculumName;
        labelZh = zhName;
      }
    }
    out.push({ id, label, labelZh, count: v.count, last: v.last });
  }

  // Frequency, then recency, then label — a total order, so a shuffled event
  // array cannot change the sentence.
  out.sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    if (a.last !== b.last) return a.last < b.last ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
  return out;
}

/** "A" · "A and B" · "A, B and C" */
export function joinList(items: readonly string[], and = 'and', comma = ', '): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(comma)} ${and} ${items[items.length - 1]}`;
}

interface Phrasing {
  sentence: (name: string, list: string) => string;
  none: (name: string) => string;
  more: (n: number) => string;
  and: string;
  comma: string;
  label: (w: ObservedWork) => string;
}

const EN: Phrasing = {
  sentence: (name, list) => `${name} did ${list}.`,
  none: (name) => `No observations were recorded for ${name} this week.`,
  more: (n) => `${n} more`,
  and: 'and',
  comma: ', ',
  label: (w) => w.label,
};

const ZH: Phrasing = {
  sentence: (name, list) => `${name}本周做了${list}。`,
  none: (name) => `本周没有记录到${name}的观察。`,
  more: (n) => `另外${n}项工作`,
  and: '和',
  comma: '、',
  label: (w) => w.labelZh,
};

function build(child: Child, works: readonly ObservedWork[], p: Phrasing, cap: number): Summary {
  if (works.length === 0) {
    const text = p.none(child.name);
    return { text, words: countWords(text) };
  }
  // Name as many works as fit the cap, never more than MAX_NAMED_WORKS, and say
  // honestly how many were left out.
  let shown = Math.min(works.length, MAX_NAMED_WORKS);
  let text = '';
  for (; shown >= 1; shown--) {
    const labels = works.slice(0, shown).map(p.label);
    const left = works.length - shown;
    if (left > 0) labels.push(p.more(left));
    const joined =
      p.and === 'and' ? joinList(labels, p.and, p.comma) : `${labels.slice(0, -1).join(p.comma)}${labels.length > 1 ? p.and : ''}${labels[labels.length - 1]}`;
    text = p.sentence(child.name, joined);
    if (countWords(text) <= cap) break;
  }
  if (countWords(text) > cap) text = capToWords([text], cap);
  return { text, words: countWords(text) };
}

/**
 * The English weekly summary: what this child actually did, and nothing else.
 *
 *   "Stella did CVC Encoding and Dark Phonics Work 3 - Sentence Building."
 *   "No observations were recorded for Amir this week."
 */
export function englishSummary(ledger: Ledger, childId: string, weekStart: string, cap = WORD_CAP): Summary {
  const child = ledger.children.find((c) => c.id === childId);
  if (!child) return { text: '', words: 0 };
  return build(child, observedWorks(ledger, childId, weekStart), EN, cap);
}

/** The same facts, in Chinese. One rule, two languages — they cannot disagree. */
export function chineseSummary(ledger: Ledger, childId: string, weekStart: string, cap = WORD_CAP): Summary {
  const child = ledger.children.find((c) => c.id === childId);
  if (!child) return { text: '', words: 0 };
  return build(child, observedWorks(ledger, childId, weekStart), ZH, cap);
}
