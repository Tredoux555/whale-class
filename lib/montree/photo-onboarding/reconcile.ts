// lib/montree/photo-onboarding/reconcile.ts
//
// Turn "what the model read off the list" + "who is actually on the roster
// right now" into a diff the teacher can review row by row.
//
//   extracted name matches an active child  → 'update'
//   extracted name matches nobody           → 'create'
//   active child matched by nobody          → 'archive' (kind 'departed')
//
// Nothing here writes. This is a pure function so it can be unit-tested
// without a database — see tests/photo-onboarding-reconcile.test.ts.

import { matchStudentName } from '@/lib/montree/voice/student-matcher';
import { MATCH_CONFIDENCE_FLOOR } from './types';
import type {
  ExtractedStudent,
  ReconcileResult,
  RosterChild,
  RosterEntryAction,
  RosterImportEntryInsert,
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
  // higher-confidence row keeps the match, the loser becomes a 'create' the
  // teacher can skip.
  const claimedBy = new Map<string, { index: number; confidence: number }>();

  usable.forEach((student, index) => {
    const name = student.name.trim();
    const match = matchStudentName(name, roster, aliases);

    const isMatch =
      !!match.childId &&
      (match.matchType === 'exact' ||
        match.matchType === 'alias' ||
        match.confidence >= MATCH_CONFIDENCE_FLOOR);

    const dob = normalizeDob(student.date_of_birth);
    const entry: Entry = {
      kind: 'extracted',
      name_raw: name,
      date_of_birth: dob,
      age:
        typeof student.age === 'number' && Number.isFinite(student.age)
          ? Math.round(student.age)
          : ageFromDob(dob),
      gender: normalizeGender(student.gender),
      notes: typeof student.notes === 'string' && student.notes.trim() ? student.notes.trim() : null,
      matched_child_id: isMatch ? match.childId : null,
      match_confidence: isMatch ? Math.round(match.confidence * 100) / 100 : null,
      match_type: isMatch ? match.matchType : 'none',
      suggested_action: (isMatch ? 'update' : 'create') as RosterEntryAction,
    };

    entries.push(entry);

    if (isMatch && match.childId) {
      const holder = claimedBy.get(match.childId);
      if (!holder) {
        claimedBy.set(match.childId, { index, confidence: match.confidence });
      } else if (match.confidence > holder.confidence) {
        // This row wins the child; demote the previous holder to a create.
        demoteToCreate(entries[holder.index]);
        claimedBy.set(match.childId, { index, confidence: match.confidence });
      } else {
        // Previous holder keeps the child; this row becomes a create.
        demoteToCreate(entry);
      }
    }
  });

  // Anyone on the roster nobody claimed has left the class.
  const matchedChildIds = new Set(claimedBy.keys());
  for (const child of roster) {
    if (matchedChildIds.has(child.id)) continue;
    entries.push({
      kind: 'departed',
      name_raw: child.name,
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
    },
  };
}

function demoteToCreate(entry: Entry): void {
  entry.matched_child_id = null;
  entry.match_confidence = null;
  entry.match_type = 'none';
  entry.suggested_action = 'create';
}
