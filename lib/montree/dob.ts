// lib/montree/dob.ts
//
// One place for the two questions every birthday surface asks: "is this a real
// birth date?" and "how old is that child today?".
//
// The rules encoded here already existed three times over — cleanDob()/cleanAge()
// in the photo-onboarding commit route, normalizeDob()/ageFromDob() in
// photo-onboarding/reconcile.ts, and the inline DOB→age derivation in the bulk
// children route. This module is the version both the single-child update API
// and the students screen share, so the age shown on screen and the age written
// to the row are computed by the same arithmetic and can never drift.
//
// 🚨 THE SENTINEL. A child entered with no known birthday can carry
// '1900-01-01' — a syntactically real date that must NEVER be read as one (it
// would print a 126th birthday, or a 126-year-old preschooler). Every function
// here treats it as "not known", never as a date.

/** The house "birthday not known" sentinel. Never render or derive from it. */
export const UNKNOWN_DOB = '1900-01-01';

/**
 * Earliest birth year a teacher may TYPE. Deliberately not applied when
 * reading stored rows (isRealDob) — an older record is still a real date and
 * should keep displaying; this bound only stops a typo like 0202-05-19 from
 * being saved as a birthday.
 */
export const MIN_DOB_YEAR = 1990;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** UTC calendar day of a Date, as YYYY-MM-DD. */
function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * True when `value` is a stored birthday that can be shown or turned into an
 * age: strict YYYY-MM-DD, a date that survives a round-trip (so "2019-02-31"
 * is rejected), and not the sentinel.
 */
export function isRealDob(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false;
  const iso = value.trim().slice(0, 10);
  if (!ISO_DATE.test(iso) || iso === UNKNOWN_DOB) return false;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && isoDay(d) === iso;
}

/** A stored birthday as YYYY-MM-DD, or null when it is missing/sentinel/junk. */
export function realDobOrNull(value: string | null | undefined): string | null {
  return isRealDob(value) ? value.trim().slice(0, 10) : null;
}

export type DobParse =
  | { ok: true; dob: string | null }
  | { ok: false; error: string };

/**
 * Validate a birthday coming off the wire.
 *
 * `null` and `''` both mean "clear it" and come back as `{ ok: true, dob: null }`,
 * as does the sentinel — a caller that echoes '1900-01-01' back at us is saying
 * "no birthday on file", and storing NULL says that without the booby trap.
 * Anything else that isn't a real, in-range calendar date is an error the caller
 * should reject with 400 rather than quietly drop: a birthday the teacher typed
 * and the server ignored is worse than one it refused.
 */
export function parseDobInput(value: unknown, now: Date = new Date()): DobParse {
  if (value === null) return { ok: true, dob: null };
  if (typeof value !== 'string') {
    return { ok: false, error: 'date_of_birth must be a YYYY-MM-DD string or null' };
  }

  const iso = value.trim();
  if (iso === '') return { ok: true, dob: null };
  if (!ISO_DATE.test(iso)) {
    return { ok: false, error: 'date_of_birth must be formatted YYYY-MM-DD' };
  }

  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || isoDay(d) !== iso) {
    return { ok: false, error: 'date_of_birth is not a real calendar date' };
  }

  if (iso === UNKNOWN_DOB) return { ok: true, dob: null };

  if (Number(iso.slice(0, 4)) < MIN_DOB_YEAR) {
    return { ok: false, error: `date_of_birth must be ${MIN_DOB_YEAR} or later` };
  }

  // One day of slack on "not in the future": the browser sends the teacher's
  // LOCAL calendar day, and east of UTC that is legitimately tomorrow here.
  const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (iso > isoDay(limit)) {
    return { ok: false, error: 'date_of_birth cannot be in the future' };
  }

  return { ok: true, dob: iso };
}

/**
 * Whole years between a birthday and today, or null when the date is unusable
 * (missing, sentinel, malformed, or an absurd result).
 *
 * Same arithmetic as ageFromDob() in photo-onboarding/reconcile.ts and the bulk
 * children route: floor to completed years, so a child turning 4 next week is 3.
 */
export function ageFromDob(dob: string | null | undefined, now: Date = new Date()): number | null {
  const iso = realDobOrNull(dob);
  if (!iso) return null;

  const born = new Date(`${iso}T00:00:00Z`);
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) years--;
  if (years < 0 || years > 120) return null;
  return years;
}
