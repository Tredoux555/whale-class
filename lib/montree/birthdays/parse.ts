// Birthdays tool — pasted-list parsing and birthday maths.
//
// Pure: no DOM, no jsPDF, no React. Everything here is deterministic given an
// explicit `today`, which is what makes the age arithmetic testable (and what
// stops "turns 5" quietly drifting depending on when the module is imported).
//
// Input format is one child per line: `Name, YYYY-MM-DD`. Parsing is
// deliberately forgiving about whitespace, separator character (`-`, `/`, `.`)
// and commas *inside* the name ("Willemse, Joey, 2020-03-03" splits on the
// LAST comma), but never silently drops a line it cannot understand — every
// bad line comes back in `issues` with a human-readable reason so the UI can
// tell the teacher exactly which line to fix.

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

const DATE_RE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Calendar-day comparison that ignores time-of-day and time zones. */
function compareYmd(a: [number, number, number], b: [number, number, number]): number {
  return (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2]);
}

/**
 * Parse the pasted `Name, YYYY-MM-DD` list.
 *
 * Blank lines are skipped. Every other line either produces an entry or an
 * issue — nothing is dropped without explanation.
 */
export function parseBirthdayList(raw: string, today: Date = new Date()): BirthdayParseResult {
  const entries: BirthdayEntry[] = [];
  const issues: BirthdayParseIssue[] = [];
  const todayYmd: [number, number, number] = [today.getFullYear(), today.getMonth() + 1, today.getDate()];

  raw.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const text = rawLine.trim();
    if (!text) return;

    const comma = text.lastIndexOf(',');
    if (comma === -1) {
      issues.push({ line, text, reason: 'no comma — write it as “Name, YYYY-MM-DD”' });
      return;
    }

    const name = text.slice(0, comma).trim().replace(/\s+/g, ' ');
    const dateText = text.slice(comma + 1).trim();

    if (!name) {
      issues.push({ line, text, reason: 'missing a name before the comma' });
      return;
    }
    if (!dateText) {
      issues.push({ line, text, reason: 'missing a birth date after the comma' });
      return;
    }

    const m = DATE_RE.exec(dateText);
    if (!m) {
      issues.push({ line, text, reason: `“${dateText}” isn’t a date — use YYYY-MM-DD, e.g. 2020-03-03` });
      return;
    }

    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);

    if (month < 1 || month > 12) {
      issues.push({ line, text, reason: `month ${month} doesn’t exist — months run 01–12` });
      return;
    }
    const dim = daysInMonth(year, month);
    if (day < 1 || day > dim) {
      issues.push({ line, text, reason: `${MONTH_NAMES[month - 1]} ${year} only has ${dim} days` });
      return;
    }
    if (year < 1900) {
      issues.push({ line, text, reason: `${year} looks wrong — use the four-digit birth year` });
      return;
    }
    if (compareYmd([year, month, day], todayYmd) > 0) {
      issues.push({ line, text, reason: 'that birth date is in the future' });
      return;
    }

    entries.push({ line, name, year, month, day, iso: `${year}-${pad2(month)}-${pad2(day)}` });
  });

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
