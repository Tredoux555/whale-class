// Birthdays tool — pasted-list parsing and birthday maths.
//
// Pure: no DOM, no jsPDF, no React. Everything here is deterministic given an
// explicit `today`, which is what makes the age arithmetic testable (and what
// stops "turns 5" quietly drifting depending on when the module is imported).
//
// Parsing itself is NOT reimplemented here. It reuses the SAME format-agnostic
// engine the class-list roster importer uses — lib/cms/engine/paste-parser —
// so a teacher pasting a class list into the Birthdays tool gets the same
// "figure out the name and the date, whatever the format" behaviour as
// pasting it into the roster: comma, tab, semicolon or pipe separated, a
// worded date ("5 March 2021"), a date with no separator at all
// ("Amara Okonkwo 2021-03-05"), even a straight spreadsheet-column paste.
// REUSE-FIRST LAW — one parsing engine, every caller.
//
// The roster engine treats a date of birth as OPTIONAL (a name alone is a
// perfectly good roster row); a birthday card or wall-chart entry without a
// date makes no sense, so this module adds that one extra requirement on top
// and maps the richer `ParsedRosterLine` into the flat numeric shape the PDF
// builders (`pdfTemplates.ts`) already expect. Nothing downstream of
// `BirthdayEntry` changed shape, so the card/tracker generators did not need
// to change at all.

import { parseRoster, type DateOrder } from '../../cms/engine/paste-parser';

export type { DateOrder } from '../../cms/engine/paste-parser';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export interface BirthdayEntry {
  /** 1-based line number in the pasted text (so errors can point at it) */
  line: number;
  name: string;
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
  /** normalised YYYY-MM-DD */
  iso: string;
  /**
   * The date was numeric with both parts ≤12 ("05/03/2021") — the parser had
   * to pick a convention (day-first by default) rather than read it for
   * certain. Never blocks the row; the preview flags it so a teacher can
   * double-check before printing.
   */
  ambiguousDate?: boolean;
  /** Same name + date of birth appeared on an earlier line of this paste. */
  duplicate?: boolean;
  /**
   * Storage path of the child's photo, when the entry came from the real
   * class roster ("Load my class") rather than a pasted list. Optional on
   * purpose: a pasted list has no photos, and every builder that predates the
   * photo board (cards, wall chart) ignores this field entirely.
   */
  photoUrl?: string;
}

/**
 * A child who is on the roster but has no readable birthday — either the
 * field is empty or it carries the house `1900-01-01` "not known" sentinel.
 *
 * These are deliberately NOT `BirthdayEntry`s: there is no date to sort, no
 * age to compute, and inventing one would print a wrong birthday on a wall.
 * They are carried alongside so the class photo board can still show the
 * child (flagged, listed last) instead of quietly dropping them.
 */
export interface BirthdayUnknown {
  name: string;
  photoUrl?: string;
}

export interface BirthdayParseIssue {
  line: number;
  text: string;
  reason: string;
}

export interface BirthdayParseResult {
  entries: BirthdayEntry[];
  issues: BirthdayParseIssue[];
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Parse a pasted class list into birthday entries.
 *
 * One child per line, in essentially any format a teacher might paste:
 * `Name, YYYY-MM-DD`, `Name<TAB>YYYY-MM-DD` (a spreadsheet column paste),
 * `Name  DD/MM/YYYY`, `5 March 2021, Amara Okonkwo` — whatever order and
 * separator, the same engine the class-list roster importer uses figures out
 * the name and the date. A line with a name but no readable date, or a date
 * but no name, comes back in `issues` with a plain-language reason rather
 * than being silently dropped — nothing here guesses a birthday.
 *
 * `dateOrder` controls how an ambiguous all-numeric date (both parts <=12,
 * e.g. "05/03/2021") is read: 'dmy' (default) reads it as 5 March,
 * 'mdy' reads it as 3 May. Either way the row is flagged `ambiguousDate`
 * rather than trusted silently.
 */

export function parseBirthdayList(
  raw: string,
  today: Date = new Date(),
  dateOrder: DateOrder = 'dmy'
): BirthdayParseResult {
  const { lines } = parseRoster(raw, { today, dateOrder });

  const entries: BirthdayEntry[] = [];
  const issues: BirthdayParseIssue[] = [];

  for (const line of lines) {
    const text = line.raw.trim();

    if (!line.name) {
      issues.push({ line: line.line, text, reason: 'no name on this line' });
      continue;
    }

    if (!line.dateOfBirth) {
      issues.push({
        line: line.line,
        text,
        reason: line.dateText
          ? `could not read the date “${line.dateText}” — try YYYY-MM-DD, e.g. 2020-03-03`
          : 'missing a birth date — add it as “Name, YYYY-MM-DD”',
      });
      continue;
    }

    if (line.issues.includes('future_date')) {
      issues.push({ line: line.line, text, reason: 'that birth date is in the future' });
      continue;
    }

    if (line.issues.includes('implausible_age')) {
      issues.push({
        line: line.line,
        text,
        reason: 'that birth date would make the child older than a primary school class — check the year',
      });
      continue;
    }

    const [yearStr, monthStr, dayStr] = line.dateOfBirth.split('-');
    entries.push({
      line: line.line,
      name: line.name,
      year: Number(yearStr),
      month: Number(monthStr),
      day: Number(dayStr),
      iso: line.dateOfBirth,
      ambiguousDate: line.issues.includes('ambiguous_date') || undefined,
      duplicate: line.issues.includes('duplicate_in_paste') || undefined,
    });
  }

  return { entries, issues };
}

// ------------------------------------------------------------ birthday maths

export interface BirthdayFacts {
  /** Calendar year the next birthday falls in — today counts as "next". */
  nextBirthdayYear: number;
  /** The age the child turns on that birthday. This is the "turning N". */
  turning: number;

  /** Completed years of age as of `today`. */
  ageNow: number;
  /** The birthday is today. */
  isToday: boolean;
  /** This calendar year's birthday has already gone by. */
  passedThisYear: boolean;
  /** "March 3rd" */
  monthDayOrdinal: string;
  /** "3 March" */
  dayMonth: string;
  /** "3 March 2020" */
  bornOn: string;
  /** "Mar 3" */
  shortDate: string;
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Work out the "turns N on <date>" line.
 *
 * The comparison is done on (month, day) tuples rather than Date objects on
 * purpose: constructing `new Date(2025, 1, 29)` for a 29 February child would
 * silently roll over to 1 March and shift the answer by a day. Comparing the
 * calendar tuple keeps a leap-day birthday reading as 29 February in every
 * year, and the age arithmetic stays plain subtraction of years.
 */
export function birthdayFacts(entry: BirthdayEntry, today: Date = new Date()): BirthdayFacts {
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;
  const td = today.getDate();

  const isToday = entry.month === tm && entry.day === td;
  const passedThisYear = entry.month < tm || (entry.month === tm && entry.day < td);

  // Today's birthday counts as the upcoming one, not as one already gone.
  const nextBirthdayYear = passedThisYear ? ty + 1 : ty;
  const turning = nextBirthdayYear - entry.year;
  const ageNow = turning - (isToday ? 0 : 1);

  const monthName = MONTH_NAMES[entry.month - 1];
  return {
    nextBirthdayYear,
    turning,
    ageNow,
    isToday,
    passedThisYear,

    monthDayOrdinal: `${monthName} ${ordinal(entry.day)}`,
    dayMonth: `${entry.day} ${monthName}`,
    bornOn: `${entry.day} ${monthName} ${entry.year}`,
    shortDate: `${MONTH_ABBR[entry.month - 1]} ${entry.day}`,
  };
}

/** "Joey turns 5 on March 3rd" — the headline line of a birthday card. */
export function turningLine(entry: BirthdayEntry, today: Date = new Date()): string {
  const f = birthdayFacts(entry, today);
  if (f.isToday) return `turns ${f.turning} today — ${f.monthDayOrdinal}!`;
  return `turns ${f.turning} on ${f.monthDayOrdinal}`;
}

/** Entries bucketed into 12 months (index 0 = January), each sorted day→name. */
export function groupByMonth(entries: BirthdayEntry[]): BirthdayEntry[][] {
  const months: BirthdayEntry[][] = Array.from({ length: 12 }, () => []);
  for (const e of entries) months[e.month - 1].push(e);
  for (const bucket of months) {
    bucket.sort((a, b) => (a.day - b.day) || a.name.localeCompare(b.name));
  }
  return months;
}

/** Calendar order across the year (Jan 1 → Dec 31), for the cards PDF. */
export function sortByCalendar(entries: BirthdayEntry[]): BirthdayEntry[] {
  return [...entries].sort(
    (a, b) => (a.month - b.month) || (a.day - b.day) || a.name.localeCompare(b.name),
  );
}
