// app/api/cms/roster/route.ts
// ============================================================================
// THE TEACHER'S WRITE. Phase 4.
// ============================================================================
//
//   POST { action: 'import', classGroupId?, rows: [{ name, dateOfBirth }] }
//        → creates cms_children in the teacher's OWN room, skipping any child
//          already there. Re-pasting the same list is a no-op, by design.
//
//   POST { action: 'create', classGroupId?, values: {...} }
//        → one child, added by hand, with the whole quick-edit form.
//
//   POST { action: 'update', classGroupId?, childId, values: {...} }
//        → the quick-edit save. Allergies / dietary / contacts REPLACE.
//
// It follows `app/api/cms/enroll/route.ts` line for line where the rules are
// the same, and departs from it in exactly one place, deliberately:
//
// 🚨 THE AUTHORITY CHANGE. Phase 2 said "teachers never write a child's
// standing record", and phase 3 repeated it. Phase 4 narrows that rule rather
// than repeating it, because a real Montessori room on day one has a teacher, a
// printed list and twenty children, and NO family accounts at all. The rule
// this route enforces:
//
//     A teacher may CREATE a child in a room they teach, and may EDIT a child
//     in a room they teach ONLY WHILE NO FAMILY ACCOUNT OWNS THE RECORD.
//
// Once a family connects, the teacher is read-only again and the parent's words
// win. The check lives in `lib/cms/db/queries.ts` (`loadChildOwnership`) AND in
// the database (migration 331, `cms_staff_entered_child_ids()`): the app scopes,
// RLS defends. Neither is decoration.
//
// 🚨 TENANCY STILL COMES FROM THE SESSION. `classGroupId` in the body is a
// REQUEST — `resolveTeacherRoom` re-derives the rooms this membership actually
// teaches and refuses anything else. `childId` is re-checked against that room.
// The Jul-3 cross-tenant lesson: existence ≠ ownership.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import {
  createRosterChild,
  importRosterChildren,
  resolveTeacherRoom,
  updateRosterChild,
  type RosterWriteResult,
} from '@/lib/cms/db/queries';
import {
  normaliseRosterChild,
  normaliseRosterImport,
  validateRosterChild,
  validateRosterImport,
  type AllergyRowValues,
  type ContactRowValues,
  type DietaryRowValues,
  type RosterChildValues,
  type RosterImportRow,
} from '@/lib/cms/validation';

export const dynamic = 'force-dynamic';

// ── readers ─────────────────────────────────────────────────────────────────
// Total by construction, exactly like the enrolment route's: a missing key
// becomes an empty value, never `undefined`, so the validators below reason
// about strings and arrays and never about what the client remembered to send.

type Raw = Record<string, unknown>;
const asRaw = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const bool = (v: unknown): boolean => v === true;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown): string[] => arr(v).map(str);

function readImportRows(raw: unknown): RosterImportRow[] {
  return arr(raw).map((row) => {
    const r = asRaw(row);
    return { name: str(r.name), dateOfBirth: str(r.dateOfBirth) };
  });
}

function readAllergyRows(raw: unknown): AllergyRowValues[] {
  return arr(raw).map((row) => {
    const r = asRaw(row);
    return {
      allergen: str(r.allergen),
      severity: str(r.severity),
      reaction: str(r.reaction),
      responsePlan: str(r.responsePlan),
      carriesEpipen: bool(r.carriesEpipen),
    };
  });
}

function readDietaryRows(raw: unknown): DietaryRowValues[] {
  return arr(raw).map((row) => {
    const r = asRaw(row);
    return {
      label: str(r.label),
      reason: str(r.reason),
      excludedFoods: strList(r.excludedFoods),
      notes: str(r.notes),
    };
  });
}

function readContactRows(raw: unknown): ContactRowValues[] {
  return arr(raw).map((row) => {
    const r = asRaw(row);
    return {
      fullName: str(r.fullName),
      relationship: str(r.relationship),
      phone: str(r.phone),
      email: str(r.email),
      canCollect: bool(r.canCollect),
      note: str(r.note),
    };
  });
}

function readChildValues(raw: unknown): RosterChildValues {
  const v = asRaw(raw);
  return {
    preferredName: str(v.preferredName),
    legalName: str(v.legalName),
    dateOfBirth: str(v.dateOfBirth),
    homeLanguage: str(v.homeLanguage),
    staffNote: str(v.staffNote),
    allergies: readAllergyRows(v.allergies),
    dietary: readDietaryRows(v.dietary),
    contacts: readContactRows(v.contacts),
  };
}

export async function POST(request: NextRequest) {
  if (!isCmsLive()) {
    // Demo mode has no database to write to, and the roster page renders the
    // seed read-only with a banner saying so — this is the honest 503, not a
    // failure the UI has to guess at.
    return NextResponse.json({ error: 'demo_mode' }, { status: 503 });
  }

  const session = await getCmsSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  // A school_admin covering the floor writes here too — same gate as the rest
  // of /cms/teacher/** (lib/cms/auth/session.ts, CMS_AREA_ROLES.teacher).
  if (session.role !== 'teacher' && session.role !== 'school_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const action = String(body?.action ?? '');

    // The room comes from the session's own assignments. A body that names a
    // room this membership does not teach gets a 403, never a write.
    const room = await resolveTeacherRoom(session, str(body?.classGroupId));
    if (!room) return NextResponse.json({ error: 'no_room' }, { status: 403 });

    switch (action) {
      case 'import': {
        const rows = readImportRows(body?.rows);
        const check = validateRosterImport(rows);
        if (!check.ok) {
          return NextResponse.json({ error: 'invalid', fields: check.errors }, { status: 400 });
        }
        const result = await importRosterChildren(
          session,
          room,
          normaliseRosterImport(rows)
        );
        return finish(result);
      }

      case 'create': {
        const values = readChildValues(body?.values);
        const check = validateRosterChild(values);
        if (!check.ok) {
          return NextResponse.json({ error: 'invalid', fields: check.errors }, { status: 400 });
        }
        const result = await createRosterChild(session, room, normaliseRosterChild(values));
        return finish(result);
      }

      case 'update': {
        const childId = str(body?.childId);
        if (!childId) return NextResponse.json({ error: 'missing_child' }, { status: 400 });
        const values = readChildValues(body?.values);
        const check = validateRosterChild(values);
        if (!check.ok) {
          return NextResponse.json({ error: 'invalid', fields: check.errors }, { status: 400 });
        }
        const result = await updateRosterChild(
          session,
          room,
          childId,
          normaliseRosterChild(values)
        );
        return finish(result);
      }

      default:
        return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
    }
  } catch (error) {
    safeErrorLog('api/cms/roster:POST', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/** One response shape for every action. The two errors that are the CALLER's
 *  fault (a claimed record, a child in another room) come back as 4xx so the UI
 *  can say something true, rather than as a 500 that reads as "we broke". */
function finish(result: RosterWriteResult) {
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      childId: result.childId ?? null,
      created: result.created ?? 0,
      skipped: result.skipped ?? [],
    });
  }
  const status =
    result.error === 'family_owned' || result.error === 'forbidden'
      ? 403
      : result.error === 'not_found'
        ? 404
        : result.error === 'already_in_room' ||
            result.error === 'nothing_to_import' ||
            result.error === 'no_school'
          ? 400
          : 500;
  return NextResponse.json({ error: result.error ?? 'write_failed' }, { status });
}
