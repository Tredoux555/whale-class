// lib/montree/tracking/weekly-doc.ts
//
// THE TWO DOCUMENTS A TEACHER HANDS IN, derived (rule 8) and templated
// (rule 9) — for ALL FIVE AREAS, not just Language.
//
// Until now only the Language column and the English Language summary came
// out of the engine; Practical Life, Sensorial, Mathematics and Culture came
// from a tiered picker (Weekly Wrap → photos → saved text) with Haiku writing
// the prose. That is exactly the shape rule 9 forbids: the model was the thing
// deciding WHAT was said, not merely how.
//
// This module is pure. Given a Ledger, a child and a Monday it answers, per
// area:
//
//   planCell  the ONE work name the Weekly Plan grid shows — guidance.nextWorks()
//             for the four areas, derive.planLanguageCell() for Language (rule 9
//             keeps Language on its own one cell / one rule path).
//   summary   a deterministic three-sentence set:
//               "<Name> worked on <work> this week.
//                <He/She> is <being introduced to | practising | confident with> it.
//                Next week <he/she> will <continue with X | move on to Y>."
//             capped at 40 words, counted in code by summary.capToWords().
//
// Both languages are built from the SAME facts by the same code path, so an
// English cell and a Chinese cell can never disagree about what happened. The
// Chinese template mirrors the English sentence-for-sentence and names the work
// with the curriculum row's `name_chinese` when it has one.
//
// AI may rephrase what comes out of here. It may never add a fact this file
// did not produce.

import { normaliseArea, nextWorkByArea, type AreaGuidance } from './guidance';
import { planLanguageCell, weekEnd, weekTicks, type Tick } from './derive';
import { tzOf } from './ledger';
import { capToWords, countWords, englishSummary, WORD_CAP } from './summary';
import type { AreaKey, Child, CurriculumWork, Ledger, Status } from './types';

/** The five areas of the Weekly Plan grid, in the order the samples print them. */
export const DOC_AREAS: readonly AreaKey[] = [
  'practical_life',
  'sensorial',
  'mathematics',
  'language',
  'cultural',
];

export type DocLang = 'en' | 'zh';

export interface AreaDoc {
  area: AreaKey;
  /** The Weekly Plan cell. Null = leave the cell empty (never invent a work). */
  planCell: string | null;
  /** The Weekly Summary sentences for this area, already capped. */
  summary: string;
  words: number;
  /** The work the sentences are about, when there was one this week. */
  workName: string | null;
  /** That work's status at the end of the week, when there was one. */
  status: Status | null;
  /** True when the child was not observed in this area this week. */
  noObservation: boolean;
}

export interface WeeklyDoc {
  childId: string;
  childName: string;
  weekStart: string;
  lang: DocLang;
  areas: Record<AreaKey, AreaDoc>;
}

export interface WeeklyDocOptions {
  lang?: DocLang;
  /** Word cap per area. Defaults to rule 9's 40. */
  cap?: number;
}

// ── Vocabulary ───────────────────────────────────────────────────────────

const AREA_LABEL_EN: Record<AreaKey, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Science and Culture',
};

/** The four labels the handed-in samples actually print in Chinese. */
const AREA_LABEL_ZH: Record<AreaKey, string> = {
  practical_life: '日常',
  sensorial: '感官',
  mathematics: '数学',
  language: '语言',
  cultural: '文化',
};

/** Rule 9's status phrases. One per rung of the ladder. */
const STATUS_PHRASE_EN: Record<Status, string> = {
  not_started: 'being introduced to',
  presented: 'being introduced to',
  practicing: 'practising',
  mastered: 'confident with',
};

const STATUS_PHRASE_ZH: Record<Status, string> = {
  not_started: '初步接触',
  presented: '初步接触',
  practicing: '练习',
  mastered: '熟练掌握',
};

/**
 * The cap, applied the way capToWords() applies it — drop whole sentences from
 * the end until the text fits — but with the joiner the language uses. Chinese
 * sentences already carry their own full stop (。) and are never space-joined,
 * so "Mei本周做了倒水的工作。 她正在…" cannot happen.
 */
function capWith(sentences: readonly string[], cap: number, joiner: string): string {
  if (joiner === ' ') return capToWords(sentences, cap);
  const kept: string[] = [];
  for (const s of sentences) {
    if (countWords([...kept, s].join(joiner)) > cap) break;
    kept.push(s);
  }
  return kept.length > 0 ? kept.join(joiner) : (sentences[0] ?? '');
}

function subjectEn(child: Child): string {
  return child.pronoun === 'he' ? 'He' : child.pronoun === 'she' ? 'She' : 'They';
}
function objectEn(child: Child): string {
  return child.pronoun === 'he' ? 'he' : child.pronoun === 'she' ? 'she' : 'they';
}
function toBeEn(child: Child): string {
  return child.pronoun === 'they' ? 'are' : 'is';
}
function pronounZh(child: Child): string {
  return child.pronoun === 'he' ? '他' : child.pronoun === 'she' ? '她' : '他们';
}

/** The work's name in the requested language. Falls back to the English name. */
export function workNameIn(work: CurriculumWork | undefined, lang: DocLang, fallback: string): string {
  if (!work) return fallback;
  if (lang === 'zh') {
    const zh = (work.name_chinese ?? '').trim();
    if (zh) return zh;
  }
  return work.name || fallback;
}

// ── The week's work, per area ────────────────────────────────────────────

/**
 * The ONE work an area's sentences are about: the highest-sequence work the
 * child was actually observed at this week. Corrections are not a week's work
 * (they fix the ledger), exactly as summary.englishSummary() treats them.
 */
function weekWorkFor(ledger: Ledger, childId: string, weekStart: string, area: AreaKey): Tick | null {
  const tz = tzOf(ledger);
  const byKey = new Map(ledger.works.map((w) => [w.work_key, w]));
  const ticks = weekTicks(ledger.events, childId, weekStart, tz).filter((t) => {
    if (t.event.source === 'correction') return false;
    const work = byKey.get(t.work_key);
    const raw = work?.area ?? t.event.area ?? '';
    return normaliseArea(raw) === area;
  });
  if (ticks.length === 0) return null;
  const seqOf = (key: string) => byKey.get(key)?.sequence ?? -1;
  // Prefer a tick that MOVED the ladder; then the furthest along in sequence;
  // then the LAST one seen, so a work presented on Monday and mastered on
  // Thursday is reported as mastered.
  return ticks.reduce((best, t) => {
    if (t.advanced !== best.advanced) return t.advanced ? t : best;
    const ds = seqOf(t.work_key) - seqOf(best.work_key);
    if (ds !== 0) return ds > 0 ? t : best;
    return t.event.created_at >= best.event.created_at ? t : best;
  });
}

/** The plan cell for one area. Language keeps its own rule; the rest ask guidance. */
function planCellFor(
  ledger: Ledger,
  childId: string,
  weekStart: string,
  area: AreaKey,
  guidance: Record<string, AreaGuidance>,
  lang: DocLang,
): string | null {
  const byKey = new Map(ledger.works.map((w) => [w.work_key, w]));
  if (area === 'language') {
    const cell = planLanguageCell(ledger, childId, weekStart);
    if (!cell) return null;
    const work = ledger.works.find((w) => w.name === cell);
    return workNameIn(work, lang, cell);
  }
  const next = guidance[area]?.next;
  if (!next) return null;
  return workNameIn(byKey.get(next.work_key), lang, next.name);
}

// ── The templates ────────────────────────────────────────────────────────

function sentencesEn(
  child: Child,
  area: AreaKey,
  workName: string | null,
  status: Status | null,
  planCell: string | null,
): string[] {
  const he = objectEn(child);
  if (!workName) {
    // No observation. Say only that, plus what is planned — never invent a work.
    const first = `${child.name} continued with ${AREA_LABEL_EN[area]} this week.`;
    return planCell ? [first, `Next week ${he} will start ${planCell}.`] : [first];
  }
  const first = `${child.name} worked on ${workName} this week.`;
  const second = `${subjectEn(child)} ${toBeEn(child)} ${STATUS_PHRASE_EN[status ?? 'presented']} it.`;
  const third =
    !planCell || planCell === workName
      ? `Next week ${he} will continue with ${workName}.`
      : `Next week ${he} will move on to ${planCell}.`;
  return [first, second, third];
}

function sentencesZh(
  child: Child,
  area: AreaKey,
  workName: string | null,
  status: Status | null,
  planCell: string | null,
): string[] {
  const ta = pronounZh(child);
  if (!workName) {
    const first = `${child.name}本周继续进行${AREA_LABEL_ZH[area]}区的工作。`;
    return planCell ? [first, `下周${ta}将开始${planCell}。`] : [first];
  }
  const first = `${child.name}本周做了${workName}的工作。`;
  const second = `${ta}正在${STATUS_PHRASE_ZH[status ?? 'presented']}这项工作。`;
  const third =
    !planCell || planCell === workName
      ? `下周${ta}将继续${workName}。`
      : `下周${ta}将开始${planCell}。`;
  return [first, second, third];
}

// ── The answer ───────────────────────────────────────────────────────────

/**
 * One child, one week, five areas — every plan cell and every summary sentence
 * the two documents need. Pure: same ledger in, same bytes out.
 */
export function weeklyDocForChild(
  ledger: Ledger,
  childId: string,
  weekStart: string,
  opts: WeeklyDocOptions = {},
): WeeklyDoc | null {
  const child = ledger.children.find((c) => c.id === childId);
  if (!child) return null;
  const lang: DocLang = opts.lang ?? 'en';
  const cap = opts.cap ?? WORD_CAP;

  // Guidance is asked ONCE for the whole child — nextWorks() replays the
  // journal, and asking it five times would replay it five times.
  // "As of" the end of the week, so a doc for an old week reads as it did then.
  const guidance = nextWorkByArea(ledger, childId, { asOf: weekEnd(weekStart) });
  const byKey = new Map(ledger.works.map((w) => [w.work_key, w]));

  const areas = {} as Record<AreaKey, AreaDoc>;
  for (const area of DOC_AREAS) {
    const tick = weekWorkFor(ledger, childId, weekStart, area);
    const work = tick ? byKey.get(tick.work_key) : undefined;
    const workName = tick ? workNameIn(work, lang, tick.work_name) : null;
    const status = tick ? tick.status : null;
    const planCell = planCellFor(ledger, childId, weekStart, area, guidance, lang);

    // Rule 9 keeps the ENGLISH Language sentence on summary.englishSummary():
    // one cell, one rule, and the wording parents already read is unchanged.
    let text: string;
    if (area === 'language' && lang === 'en') {
      const engine = englishSummary(ledger, childId, weekStart);
      text = engine.text || capWith(sentencesEn(child, area, workName, status, planCell), cap, ' ');
    } else if (lang === 'zh') {
      text = capWith(sentencesZh(child, area, workName, status, planCell), cap, '');
    } else {
      text = capWith(sentencesEn(child, area, workName, status, planCell), cap, ' ');
    }

    areas[area] = {
      area,
      planCell,
      summary: text,
      words: countWords(text),
      workName,
      status,
      noObservation: tick === null,
    };
  }

  return { childId, childName: child.name, weekStart, lang, areas };
}

/** Every child in the ledger, in roster order. */
export function weeklyDocForClass(
  ledger: Ledger,
  weekStart: string,
  opts: WeeklyDocOptions = {},
): WeeklyDoc[] {
  return ledger.children
    .map((c) => weeklyDocForChild(ledger, c.id, weekStart, opts))
    .filter((d): d is WeeklyDoc => d !== null);
}

/**
 * The Weekly Summary's per-child paragraph, as the handed-in sample prints it:
 * the English Language sentence first, then one "日常：… / 感官：… / 数学：…"
 * line per remaining area. `lang` picks the language of the AREA lines; the
 * Language sentence is always the English one the parents already read.
 */
export function summaryParagraph(doc: WeeklyDoc, areaDocs?: WeeklyDoc): string[] {
  const zh = areaDocs ?? doc;
  const lines: string[] = [];
  const language = doc.areas.language;
  if (language?.summary) lines.push(`${doc.childName}: ${language.summary}`);
  for (const area of DOC_AREAS) {
    if (area === 'language') continue;
    const a = zh.areas[area];
    if (!a?.summary) continue;
    const label = zh.lang === 'zh' ? AREA_LABEL_ZH[area] : AREA_LABEL_EN[area];
    lines.push(`${label}：${a.summary}`);
  }
  return lines;
}

export { AREA_LABEL_EN, AREA_LABEL_ZH };
