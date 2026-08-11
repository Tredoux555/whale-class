// lib/montree/photo-onboarding/reconcile.ts
//
// Turn "what the model read off the list" + "who is actually on the roster
// right now" into a diff the teacher can review row by row.
//
// An extracted row is scored against the roster from several CANDIDATE
// strings — the whole written name, the other-script name the extractor split
// out, and the script/whitespace segments of both — because a bilingual school
// writes one child three different ways across three years:
//
//   candidate that scored best        confidence   outcome
//   ────────────────────────────────  ───────────  ───────────────────────────
//   whole name / whole alternate      ≥ 0.85       'update'   — auto-matched
//   a teacher-confirmed alias         ≥ 0.85       'update'   — auto-matched
//   a segment ("Amy" of "Amy 王小美")   ≥ 0.85       'create' + match_type
//                                                  'possible' — teacher decides
//   anything                          ≥ 0.80       'create' + 'possible'
//   anything                          < 0.80       'create'   — nobody matched
//   ────────────────────────────────  ───────────  ───────────────────────────
//   an active child no row auto-matched            'archive' (kind 'departed')
//
// 🚨 WHY A SEGMENT NEVER AUTO-MATCHES. A fragment is ambiguous by nature: two
// children called "Amy Chen" and "Amy Wang" both answer to the segment "Amy",
// and silently merging into whichever one the loop reached first is how you
// destroy a child's record. A whole name is the teacher's own spelling and a
// classroom alias is UNIQUE(classroom_id, alias) by construction, so neither
// can point at two children — those two may act on their own.
//
// 🚨 WHY A POSSIBLE MATCH STILL PRODUCES A DEPARTED ROW. The matched child is
// only *maybe* this row. If the teacher answers "new student", that child is
// genuinely gone and still needs their archive row; if she answers "same
// child", the review screen hides the departed row and flips this one to an
// update. Only an AUTO match takes a child off the departed list here.
//
// Nothing here writes. This is a pure function so it can be unit-tested
// without a database — see tests/photo-onboarding-reconcile.test.ts.

import { matchStudentName } from '@/lib/montree/voice/student-matcher';
import { MATCH_CONFIDENCE_FLOOR, POSSIBLE_MATCH_FLOOR } from './types';
import type {
  ExtractedStudent,
  ReconcileResult,
  RosterChild,
  RosterEntryAction,
  RosterImportEntryInsert,
  RosterMatchType,
} from './types';

type Entry = Omit<RosterImportEntryInsert, 'import_id'>;

/**
 * Thrown when the extraction found no students at all.
 *
 * 🚨 LOAD-BEARING GUARD. Without it, an unreadable photo (or a PDF the model
 * couldn't parse) produces zero extracted students, every child on the roster
 * looks "departed", and the review screen proposes ARCHIVING THE ENTIRE CLASS.
 * One distracted Apply and a school loses its roster. Fail the import instead.
 */
export class EmptyExtractionError extends Error {
  constructor() {
    super('No students were found on the uploaded document');
    this.name = 'EmptyExtractionError';
  }
}

/** Whole-year age from an ISO date of birth, or null. */
export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const born = new Date(`${dob}T00:00:00Z`);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) years--;
  if (years < 0 || years > 120) return null;
  return years;
}

function normalizeDob(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Round-trip guard: "2019-02-31" parses but is not a real date.
  if (d.toISOString().slice(0, 10) !== trimmed) return null;
  return trimmed;
}

function normalizeGender(value: string | null | undefined): string | null {
  return value === 'boy' || value === 'girl' ? value : null;
}

// ───────────────────── name segmentation ─────────────────────

/**
 * Characters a name can be built from, as explicit Unicode ranges: Latin and
 * its accented extensions, Greek/Cyrillic, Hebrew, Arabic, Japanese kana, CJK
 * ideographs (unified + extension A + compatibility) and Hangul. Everything
 * else — spaces, brackets, slashes, the interpunct, the full-width comma — is
 * a separator.
 *
 * Hand-rolled ranges rather than \p{L} / \p{Script=Han} on purpose: Unicode
 * property escapes need an ES2018 target and this project compiles to ES2017,
 * and a dependency for one regex is not a trade this file is willing to make.
 */
const NAME_CHAR =
  /[0-9A-Za-z\u00C0-\u024F\u0370-\u04FF\u0590-\u06FF\u3041-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

/**
 * The East-Asian half of NAME_CHAR — kana, ideographs, Hangul.
 *
 * Both kana ranges stop short of the full block on purpose. U+30FB is the
 * katakana middle dot 「・」, which schools use to JOIN the two halves of a
 * bilingual name ("王小美・Amy"). Counted as a letter it would glue the whole
 * entry into one candidate; left out, it separates them like any other mark.
 */
const EAST_ASIAN =
  /[\u3041-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;

/**
 * Split a written name into the pieces that could each be a name on their own.
 *
 * Splits on whitespace AND on every Latin/East-Asian script boundary, so
 * "Amy王小美" (no space — very common on a handwritten list) segments the same
 * way as "Amy 王小美". Punctuation that pairs the two — "Amy (王小美)",
 * "Amy/王小美" — is a separator like any other.
 *
 * Segments shorter than 2 characters are dropped: a bare initial ("J.") or a
 * lone surname character carries no identifying signal and would fuzzy-match
 * half the class.
 */
export function segmentName(value: string): string[] {
  const out: string[] = [];
  let buf = '';
  let bufIsEastAsian = false;

  const flush = () => {
    if (buf.length >= 2) out.push(buf);
    buf = '';
  };

  for (const ch of value) {
    if (!NAME_CHAR.test(ch)) {
      flush();
      continue;
    }
    const eastAsian = EAST_ASIAN.test(ch);
    if (buf && eastAsian !== bufIsEastAsian) flush();
    buf += ch;
    bufIsEastAsian = eastAsian;
  }
  flush();

  // A one-word name segments to itself; the caller de-duplicates it away.
  return out;
}

// ───────────────────── candidate scoring ─────────────────────

/**
 * Jaro-Winkler, character-for-character the scorer in student-matcher.ts.
 *
 * 🚨 A DELIBERATE COPY, not an oversight. student-matcher gates its own fuzzy
 * step at 0.85 and returns 'none' below it, so it can never tell us the
 * difference between "0.72 — worth asking about" and "0.11 — a stranger",
 * which is precisely what the possible band is made of. student-matcher is
 * shared with voice observations and is not ours to loosen, so the score we
 * need is computed here instead. Keep the two in step if either changes.
 */
function jaroWinkler(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 1.0;
  if (!a.length || !b.length) return 0;

  const maxDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - maxDist);
    const end = Math.min(i + maxDist + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

interface CandidateMatch {
  childId: string;
  confidence: number;
  matchType: RosterMatchType;
}

/**
 * The stored resolution of a confidence. match_confidence is a `real` we round
 * to two places on the way into the entry, so the floors are compared against
 * the SAME rounded number the row will carry.
 *
 * That is not tidiness, it is correctness at the boundary: two three-character
 * Chinese names differing in the middle character — 陈子涵 / 陈紫涵, the single
 * most likely misreading in this school — score 0.8 in real arithmetic and
 * 0.7999999999999999 in floating point, and would otherwise miss the possible
 * band by one part in 10^16.
 */
function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Score ONE candidate string against the roster.
 *
 * student-matcher answers first and its answer is authoritative — it owns the
 * exact / alias / ≥0.85-fuzzy semantics the rest of the app relies on, and
 * routing through it keeps auto-matching behaviour identical to before this
 * file learned about candidates. Only when it declines do we compute the weak
 * score that feeds the possible band.
 */
function scoreCandidate(
  candidate: string,
  roster: RosterChild[],
  aliases: Array<{ child_id: string; alias: string }>
): CandidateMatch | null {
  const strong = matchStudentName(candidate, roster, aliases);
  // The alias step in student-matcher answers from the alias table alone, so
  // it can hand back a child who has since been archived out of the classroom.
  // Acting on that would propose an update the commit route cannot apply.
  if (strong.childId && roster.some((c) => c.id === strong.childId)) {
    return {
      childId: strong.childId,
      confidence: strong.confidence,
      matchType: strong.matchType as RosterMatchType,
    };
  }

  let best: CandidateMatch | null = null;
  const consider = (childId: string, score: number) => {
    if (!best || score > best.confidence) {
      best = { childId, confidence: score, matchType: 'fuzzy' };
    }
  };

  for (const child of roster) {
    // Same two shapes student-matcher compares against: the given name the
    // teacher would say out loud, and the full record name.
    consider(child.id, jaroWinkler(candidate, child.name.split(' ')[0]));
    consider(child.id, jaroWinkler(candidate, child.name));
  }
  for (const alias of aliases) {
    if (!roster.some((c) => c.id === alias.child_id)) continue;
    consider(alias.child_id, jaroWinkler(candidate, alias.alias));
  }

  return best;
}

type Verdict =
  | { kind: 'auto'; match: CandidateMatch }
  | { kind: 'possible'; match: CandidateMatch }
  | { kind: 'none' };

/**
 * Every way this row could be read, scored, and reduced to one verdict.
 * See the outcome table at the top of the file.
 */
function verdictFor(
  student: ExtractedStudent,
  roster: RosterChild[],
  aliases: Array<{ child_id: string; alias: string }>
): Verdict {
  const name = student.name.trim();
  const alternate = typeof student.alternate_name === 'string' ? student.alternate_name.trim() : '';

  // 'full' = a complete name as somebody wrote it. 'segment' = a piece of one.
  const candidates: Array<{ text: string; whole: boolean }> = [];
  const seen = new Set<string>();
  const add = (text: string, whole: boolean) => {
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return;
    seen.add(key);
    candidates.push({ text, whole });
  };

  add(name, true);
  if (alternate) add(alternate, true);
  for (const seg of segmentName(name)) add(seg, false);
  if (alternate) for (const seg of segmentName(alternate)) add(seg, false);

  let auto: CandidateMatch | null = null;
  let possible: CandidateMatch | null = null;

  for (const candidate of candidates) {
    const match = scoreCandidate(candidate.text, roster, aliases);
    if (!match) continue;

    // A whole written name at the floor, or a teacher-confirmed alias from
    // anywhere in the string, is allowed to act on its own.
    //
    // The auto test uses the RAW confidence, deliberately unlike the possible
    // test below: rounding must never be what tips a row over the line into a
    // silent write to a child's record.
    const actionable =
      match.matchType === 'alias' ||
      (candidate.whole && match.confidence >= MATCH_CONFIDENCE_FLOOR);

    if (actionable) {
      if (!auto || match.confidence > auto.confidence) auto = match;
    } else if (roundConfidence(match.confidence) >= POSSIBLE_MATCH_FLOOR) {
      if (!possible || match.confidence > possible.confidence) possible = match;
    }
  }

  if (auto) return { kind: 'auto', match: auto };
  if (possible) return { kind: 'possible', match: { ...possible, matchType: 'possible' } };
  return { kind: 'none' };
}

// ───────────────────── reconciliation ─────────────────────

/** How strongly an extracted row is holding on to a roster child. */
type ClaimKind = 'auto' | 'possible';

interface Claim {
  index: number;
  kind: ClaimKind;
  confidence: number;
}

/** An auto match outranks any possible match; within a kind, confidence wins. */
function outranks(challenger: Claim, holder: Claim): boolean {
  if (challenger.kind !== holder.kind) return challenger.kind === 'auto';
  return challenger.confidence > holder.confidence;
}

/**
 * Reconcile an extraction against the classroom's current ACTIVE roster.
 *
 * @param extracted students read off the uploaded document
 * @param roster    active children currently in the classroom
 * @param aliases   classroom name aliases (voice-observation's table), used as
 *                  an extra matching signal exactly as paper-scan does
 */
export function reconcileRoster(
  extracted: ExtractedStudent[],
  roster: RosterChild[],
  aliases: Array<{ child_id: string; alias: string }> = []
): ReconcileResult {
  const usable = (extracted || []).filter(
    (s) => s && typeof s.name === 'string' && s.name.trim().length > 0
  );

  // See EmptyExtractionError — never let an empty read archive a whole class.
  if (usable.length === 0) throw new EmptyExtractionError();

  const entries: Entry[] = [];

  // childId → the extracted row that currently owns the match. A second
  // extracted row matching the SAME child (twins written slightly differently,
  // or a duplicated line) must not produce two updates to one record — the
  // stronger row keeps the match, the loser becomes a 'create' the teacher can
  // skip. Possible matches take part in the same contest, so one child is
  // never offered to two rows at once.
  const claimedBy = new Map<string, Claim>();

  usable.forEach((student, index) => {
    const name = student.name.trim();
    const alternate =
      typeof student.alternate_name === 'string' && student.alternate_name.trim()
        ? student.alternate_name.trim()
        : null;

    const verdict = verdictFor(student, roster, aliases);
    const matched = verdict.kind === 'none' ? null : verdict.match;

    const dob = normalizeDob(student.date_of_birth);
    const entry: Entry = {
      kind: 'extracted',
      name_raw: name,
      alternate_name: alternate,
      date_of_birth: dob,
      age:
        typeof student.age === 'number' && Number.isFinite(student.age)
          ? Math.round(student.age)
          : ageFromDob(dob),
      gender: normalizeGender(student.gender),
      notes: typeof student.notes === 'string' && student.notes.trim() ? student.notes.trim() : null,
      matched_child_id: matched ? matched.childId : null,
      match_confidence: matched ? roundConfidence(matched.confidence) : null,
      match_type: matched ? matched.matchType : 'none',
      // A possible match is still proposed as a create: until the teacher
      // says otherwise, the safe reading of "we are not sure" is "new child".
      suggested_action: (verdict.kind === 'auto' ? 'update' : 'create') as RosterEntryAction,
    };

    entries.push(entry);

    if (!matched || verdict.kind === 'none') return;

    const claim: Claim = { index, kind: verdict.kind, confidence: matched.confidence };
    const holder = claimedBy.get(matched.childId);
    if (!holder) {
      claimedBy.set(matched.childId, claim);
    } else if (outranks(claim, holder)) {
      // This row wins the child; demote the previous holder to a bare create.
      demoteToCreate(entries[holder.index]);
      claimedBy.set(matched.childId, claim);
    } else {
      // Previous holder keeps the child; this row becomes a bare create.
      demoteToCreate(entry);
    }
  });

  // Anyone on the roster nobody AUTO-matched may have left the class. A child
  // held only by a possible match still lands here on purpose — see the note
  // at the top of the file.
  for (const child of roster) {
    if (claimedBy.get(child.id)?.kind === 'auto') continue;
    entries.push({
      kind: 'departed',
      name_raw: child.name,
      alternate_name: null,
      date_of_birth: null,
      age: null,
      gender: null,
      notes: null,
      matched_child_id: child.id,
      match_confidence: null,
      match_type: null,
      suggested_action: 'archive',
    });
  }

  return {
    entries,
    counts: {
      create: entries.filter((e) => e.suggested_action === 'create').length,
      update: entries.filter((e) => e.suggested_action === 'update').length,
      archive: entries.filter((e) => e.suggested_action === 'archive').length,
      possible: entries.filter((e) => e.match_type === 'possible').length,
    },
  };
}

function demoteToCreate(entry: Entry): void {
  entry.matched_child_id = null;
  entry.match_confidence = null;
  entry.match_type = 'none';
  entry.suggested_action = 'create';
}
