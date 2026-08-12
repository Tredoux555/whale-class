// lib/cms/engine/paste-parser.ts
// ============================================================================
// A TEACHER'S CLASS LIST, PASTED. Phase 4.
// ============================================================================
// The founder's sentence was "I'm itching to put my class list in and be able
// to get everything I need." This module is the first half of that: whatever is
// on his clipboard — a Word table, a WhatsApp message, a column out of a
// spreadsheet, last year's register — becomes rows a room can run on.
//
// DESIGN RULES, in the order they matter:
//
//   1. PURE. Same contract as the rest of lib/cms/engine: text in, records out,
//      no I/O, no clock (the caller passes `today`), no locale. That is what
//      lets the browser preview and the server import agree exactly — both call
//      this function on the same string and must reach the same rows.
//   2. NEVER REFUSE A LINE. A parser that rejects "Amara Okonkwo, 5/3/21"
//      teaches the teacher to stop pasting. Every line comes back as a row,
//      carrying ISSUES rather than being dropped, and the preview table is
//      where a human fixes them. The only thing thrown away is whitespace.
//   3. A DATE IS OPTIONAL. Half of a real class list has no birthdays on it.
//      A row with a name and no date is a perfectly good child.
//   4. AMBIGUITY IS REPORTED, NOT GUESSED SILENTLY. 05/03/2021 is the 5th of
//      March to most of the world and the 3rd of May to some of it. The parser
//      picks a convention, says so on the row, and lets the teacher correct it
//      in the preview before anything is written.
//
// `parseIsoDate` comes from lib/cms/validation.ts rather than being written
// again here — REUSE-FIRST LAW. That module is pure TypeScript with no imports
// of its own, so the engine's purity contract is not weakened by the dependency.
// ============================================================================

import { parseIsoDate } from '../validation';
import type { IsoDate } from './types';

/** What can be wrong with a line. None of these stop an import — they annotate it. */
export type ParseIssue =
  /** The line had a separator and a date but nothing that could be a name. */
  | 'no_name'
  /** Something date-shaped was there and could not be read. Kept as raw text. */
  | 'bad_date'
  /** Both numbers were ≤ 12 — day-first was assumed. See `dateOrder`. */
  | 'ambiguous_date'
  /** A real date, in the future. Almost always a typed year. */
  | 'future_date'
  /** A real date that would make the child older than a primary school. */
  | 'implausible_age'
  /** An earlier line in the SAME paste already had this name + date. */
  | 'duplicate_in_paste';

/** Which way round an all-numeric date is read when both parts could be a month. */
export type DateOrder = 'dmy' | 'mdy';

export interface ParsedRosterLine {
  /** 1-based line number in the pasted text, so the preview can point at it. */
  line: number;
  /** Exactly what the teacher pasted, before anything was done to it. */
  raw: string;
  /** The child's name, whitespace-collapsed. May be '' when the line had none. */
  name: string;
  /** ISO date, or null when the line carried no readable date. */
  dateOfBirth: IsoDate | null;
  /** The date fragment as pasted — shown next to a `bad_date` row. */
  dateText: string | null;
  issues: ParseIssue[];
}

export interface ParsedRoster {
  lines: ParsedRosterLine[];
  /** Lines that carried anything at all (blank lines are not counted). */
  total: number;
  /** Lines with a usable name. */
  named: number;
  withDateOfBirth: number;
  duplicates: number;
  /** Lines carrying at least one issue — what the "check these" banner counts. */
  needsAttention: number;
}

export interface ParseOptions {
  /** The day the paste is being read on. Drives future/implausible checks. */
  today?: Date;
  /** How to read 05/03/2021 when both parts could be a month. Default day-first. */
  dateOrder?: DateOrder;
  /** Hard ceiling, so a stray 10,000-line paste cannot hang a browser tab. */
  maxLines?: number;
}

/** Same window as lib/cms/validation.ts's child step — one product, one rule. */
const MAX_AGE_YEARS = 12;
const MAX_LINES_DEFAULT = 200;
const MAX_NAME_LENGTH = 120;

/**
 * Separators a pasted list actually uses. Includes the full-width comma and the
 * ideographic comma, because a list of Chinese names pasted out of a school's
 * own spreadsheet arrives with `，` and `、` and a parser that only knows `,`
 * silently reads the whole line as one very long name.
 */
const SEPARATOR = /[,\t;|，、；]/;

/**
 * List furniture: "1.", "1)", "-", "•", "*", "–". Stripped from the front of a
 * line before anything else. Deliberately requires a following space or a
 * following non-digit — "2021 Intake" must not lose its year.
 */
const LEADING_MARKER = /^\s*(?:\d{1,3}\s*[.)\]]\s+|[-–—•*·]\s+)/;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * The exotic whitespace a paste brings with it, made ordinary. NBSP (U+00A0,
 * what Word and Google Docs emit), the ideographic space (U+3000, what a CJK
 * spreadsheet emits) and the zero-width space all normalise here, so a name
 * that LOOKS identical to another one really is.
 *
 * 🚨 IT DOES NOT TOUCH TABS. A tab is a COLUMN BOUNDARY in a spreadsheet paste,
 * and collapsing it into a space before splitting turns
 * "Amara\tSunrise Room\t2021-06-04" into one very long name. Whitespace is
 * collapsed by `tidy()`, AFTER the line has been split into fields.
 */
function normalise(value: string): string {
  return value
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/** Normalise, collapse runs of whitespace, trim. Applied to a FIELD, never to
 *  a whole line — see the warning above. */
function tidy(value: string): string {
  return normalise(value).replace(/\s+/g, ' ').trim();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Two-digit years: 21 → 2021, 98 → 1998. A child is not from 2098. */
function expandYear(year: number, todayYear: number): number {
  if (year >= 1000) return year;
  const century = Math.floor(todayYear / 100) * 100;
  const candidate = century + year;
  return candidate > todayYear ? candidate - 100 : candidate;
}

interface DateHit {
  iso: IsoDate | null;
  ambiguous: boolean;
  /** The exact substring that was consumed, so it can be cut out of the name. */
  text: string;
}

/**
 * Numeric date: 2021-03-05, 2021/03/05, 05/03/2021, 5.3.21, 05-03-2021.
 * Year-first is unambiguous. Otherwise day-first unless the first number can
 * only be a month.
 */
function readNumericDate(fragment: string, order: DateOrder, todayYear: number): DateHit | null {
  const m = fragment.match(/(\d{1,4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,4})/);
  if (!m) return null;
  const [text, aRaw, bRaw, cRaw] = m;
  const a = Number(aRaw);
  const b = Number(bRaw);
  const c = Number(cRaw);

  let year: number;
  let month: number;
  let day: number;
  let ambiguous = false;

  if (aRaw.length === 4) {
    // ISO-shaped and therefore not open to interpretation.
    year = a;
    month = b;
    day = c;
  } else {
    year = expandYear(c, todayYear);
    if (a > 12 && b <= 12) {
      day = a;
      month = b;
    } else if (b > 12 && a <= 12) {
      month = a;
      day = b;
    } else {
      // Both could be a month. Follow the stated convention and say so.
      ambiguous = a !== b;
      day = order === 'dmy' ? a : b;
      month = order === 'dmy' ? b : a;
    }
  }

  const iso = parseIsoDate(`${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`);
  return { iso: iso ? `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}` : null, ambiguous, text };
}

/** Worded date: "5 March 2021", "March 5, 2021", "5 Mar 21". Never ambiguous. */
function readWordedDate(fragment: string, todayYear: number): DateHit | null {
  const names = Object.keys(MONTHS).join('|');
  const dayFirst = new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s+(${names})\\.?,?\\s+(\\d{2,4})`, 'i');
  const monthFirst = new RegExp(`(${names})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{2,4})`, 'i');

  let day: number;
  let month: number;
  let year: number;
  let text: string;

  const a = fragment.match(dayFirst);
  const b = fragment.match(monthFirst);
  if (a) {
    text = a[0];
    day = Number(a[1]);
    month = MONTHS[a[2].toLowerCase()];
    year = expandYear(Number(a[3]), todayYear);
  } else if (b) {
    text = b[0];
    month = MONTHS[b[1].toLowerCase()];
    day = Number(b[2]);
    year = expandYear(Number(b[3]), todayYear);
  } else {
    return null;
  }

  const candidate = `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
  return { iso: parseIsoDate(candidate) ? candidate : null, ambiguous: false, text };
}

function readDate(fragment: string, order: DateOrder, todayYear: number): DateHit | null {
  return readWordedDate(fragment, todayYear) ?? readNumericDate(fragment, order, todayYear);
}

/** Does this fragment even look like it was MEANT to be a date? */
function looksDateish(fragment: string): boolean {
  if (/\d{1,4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,4}/.test(fragment)) return true;
  const names = Object.keys(MONTHS).join('|');
  return new RegExp(`\\b(?:${names})\\b`, 'i').test(fragment) && /\d/.test(fragment);
}

function yearsBetween(then: Date, now: Date): number {
  let years = now.getUTCFullYear() - then.getUTCFullYear();
  const m = now.getUTCMonth() - then.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < then.getUTCDate())) years -= 1;
  return years;
}

/** The de-duplication key. Case-folded, whitespace-normalised, date included:
 *  two Mohammeds born on different days are two children, not a mistake. */
export function rosterKey(name: string, dateOfBirth: string | null): string {
  return `${tidy(name).toLocaleLowerCase()}|${dateOfBirth ?? ''}`;
}

/** One line → one row. Exported for unit checks; `parseRoster` is the entry point. */
export function parseRosterLine(
  raw: string,
  lineNumber: number,
  options: Required<Pick<ParseOptions, 'today' | 'dateOrder'>>
): ParsedRosterLine | null {
  // Normalise, then strip the list furniture, then SPLIT — and only then
  // collapse whitespace inside each field. Doing it in any other order eats the
  // tabs a spreadsheet paste uses as column boundaries.
  const stripped = normalise(raw).replace(LEADING_MARKER, '');
  if (!tidy(stripped)) return null;

  const issues: ParseIssue[] = [];
  const todayYear = options.today.getUTCFullYear();

  // Split on the first real separator. Everything after the first field is a
  // candidate for the date — a spreadsheet paste often carries extra columns
  // (room, phone) and the date is not reliably the second one.
  const parts = stripped.split(SEPARATOR).map((p) => tidy(p));
  let namePart = parts[0] ?? '';
  const rest = parts.slice(1).filter(Boolean);

  let hit: DateHit | null = null;
  let dateText: string | null = null;

  for (const fragment of rest) {
    const found = readDate(fragment, options.dateOrder, todayYear);
    if (found) {
      hit = found;
      dateText = fragment;
      break;
    }
    if (!dateText && looksDateish(fragment)) dateText = fragment;
  }

  // "Amara Five, March 5, 2021" — the comma inside an American worded date is
  // also the field separator, so the date arrives split across two fields and
  // neither half parses on its own. Re-join the remainder and try once more.
  if (!hit && rest.length > 1) {
    const joined = rest.join(', ');
    const found = readDate(joined, options.dateOrder, todayYear);
    if (found) {
      hit = found;
      dateText = found.text;
    }
  }

  // No separator, or no date after it: a date may still be sitting inside the
  // name field — "Amara Okonkwo 2021-03-05" is how a lot of lists are typed.
  if (!hit) {
    const inName = readDate(namePart, options.dateOrder, todayYear);
    if (inName) {
      hit = inName;
      dateText = inName.text;
      namePart = tidy(namePart.replace(inName.text, ' '));
    } else if (!dateText && looksDateish(namePart)) {
      dateText = namePart;
    }
  }

  if (hit && !hit.iso) issues.push('bad_date');
  if (!hit && dateText) issues.push('bad_date');
  if (hit?.ambiguous) issues.push('ambiguous_date');

  // Trailing punctuation a list leaves behind once the date is cut out.
  const name = tidy(namePart.replace(/^[-–—•*·,;|]+|[-–—•*·,;|]+$/g, '')).slice(0, MAX_NAME_LENGTH);
  if (!name) issues.push('no_name');

  let dateOfBirth: IsoDate | null = hit?.iso ?? null;
  if (dateOfBirth) {
    const dob = parseIsoDate(dateOfBirth);
    if (!dob) {
      dateOfBirth = null;
      issues.push('bad_date');
    } else if (dob.getTime() > options.today.getTime()) {
      issues.push('future_date');
    } else if (yearsBetween(dob, options.today) > MAX_AGE_YEARS) {
      issues.push('implausible_age');
    }
  }

  return { line: lineNumber, raw, name, dateOfBirth, dateText, issues };
}

/**
 * The whole paste. Blank lines vanish; everything else comes back as a row,
 * in the order it was pasted, with duplicates flagged rather than removed —
 * the teacher decides which of two identical lines is the mistake.
 */
export function parseRoster(text: string, options: ParseOptions = {}): ParsedRoster {
  const today = options.today ?? new Date();
  const dateOrder = options.dateOrder ?? 'dmy';
  const maxLines = options.maxLines ?? MAX_LINES_DEFAULT;

  const rawLines = String(text ?? '').split(/\r\n|\r|\n/);
  const lines: ParsedRosterLine[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (let i = 0; i < rawLines.length && lines.length < maxLines; i++) {
    const parsed = parseRosterLine(rawLines[i], i + 1, { today, dateOrder });
    if (!parsed) continue;
    if (parsed.name) {
      const key = rosterKey(parsed.name, parsed.dateOfBirth);
      if (seen.has(key)) {
        parsed.issues.push('duplicate_in_paste');
        duplicates++;
      } else {
        seen.add(key);
      }
    }
    lines.push(parsed);
  }

  return {
    lines,
    total: lines.length,
    named: lines.filter((l) => l.name).length,
    withDateOfBirth: lines.filter((l) => l.dateOfBirth).length,
    duplicates,
    needsAttention: lines.filter((l) => l.issues.length > 0).length,
  };
}
