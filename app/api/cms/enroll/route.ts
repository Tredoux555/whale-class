// app/api/cms/enroll/route.ts
// ============================================================================
// THE ENROLMENT WRITE. Phase 1's wizard kept its state in useState and lost it
// on refresh; this is where a family's answers become rows.
// ============================================================================
//
//   GET   → the family's open draft (or null), so the wizard can resume.
//   POST  → save a step.
//             { step: 'child',       values: {...} }  the child, the guardian
//                                                     link and the draft.
//             { step: 'about_child', values: {...} }  cms_child_profiles.
//             { step: 'medical',     values: {...} }  cms_medical_records +
//                                                     cms_allergies.
//             { step: 'dietary',     values: {...} }  cms_dietary_requirements.
//             { step: 'previous_school', values }     cms_previous_schools.
//             { step: 'contacts',    values: {...} }  cms_guardians +
//                                                     cms_pickup_authorizations.
//             { step: 'consents',    values: {...} }  cms_consents.
//
// Submitting is a DIFFERENT route (`./submit`) on purpose: it takes no body,
// changes no answers, and is the only irreversible thing a parent can do here.
// Folding it in as an eighth `step` would put a one-way door behind the same
// handler as "save my half-finished dietary row".
//
// Route handler rather than a server action, matching every other write in this
// repo (app/api/montree/**, app/api/potato/**) — one auth posture, one error
// shape, one place to look.
//
// 🚨 THE SESSION IS THE ONLY SOURCE OF TENANCY. The body never names a school,
// a guardian or a child. It cannot: those come from the cookie. This is the
// same rule the Jul-3 cross-tenant incident produced — a client-supplied id is
// a request, not a fact.
//
// 🚨 EVERY STEP IS VALIDATED HERE, not only in the browser. The client
// validates for the message; this is the check that counts. Both call the same
// functions in lib/cms/validation.ts, so they can never disagree about what a
// valid answer is.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import {
  loadOpenDraft,
  saveAboutChildStep,
  saveChildStep,
  saveConsentsStep,
  saveContactsStep,
  saveDietaryStep,
  saveMedicalStep,
  savePreviousSchoolStep,
  type SaveChildStepResult,
} from '@/lib/cms/db/queries';
import { ENROLLMENT_STEPS } from '@/lib/cms/engine/types';
import {
  normaliseAboutChildStep,
  normaliseChildStep,
  normaliseConsentsStep,
  normaliseContactsStep,
  normaliseDietaryStep,
  normaliseMedicalStep,
  normalisePreviousSchoolStep,
  validateAboutChildStep,
  validateChildStep,
  validateConsentsStep,
  validateContactsStep,
  validateDietaryStep,
  validateMedicalStep,
  validatePreviousSchoolStep,
  type AboutChildStepValues,
  type ChildStepValues,
  type ConsentsStepValues,
  type ContactsStepValues,
  type DietaryStepValues,
  type MedicalStepValues,
  type PreviousSchoolStepValues,
  type ValidationResult,
} from '@/lib/cms/validation';

export const dynamic = 'force-dynamic';

// ── readers ─────────────────────────────────────────────────────────────────
// Each one shapes an untrusted body into the step's value type. They are
// deliberately total: a missing key becomes an empty value, never `undefined`,
// so the validators below reason about strings and arrays rather than about
// whether the client sent the field at all.

type Raw = Record<string, unknown>;
const asRaw = (v: unknown): Raw => (v && typeof v === 'object' ? (v as Raw) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const bool = (v: unknown): boolean => v === true;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strList = (v: unknown): string[] => arr(v).map(str);

function readChildValues(raw: unknown): ChildStepValues {
  const v = asRaw(raw);
  return {
    legalName: str(v.legalName),
    preferredName: str(v.preferredName),
    dateOfBirth: str(v.dateOfBirth),
    homeLanguage: str(v.homeLanguage),
    requestedStartDate: str(v.requestedStartDate),
    classGroupId: str(v.classGroupId),
    settlingNotes: str(v.settlingNotes),
  };
}

function readAboutChildValues(raw: unknown): AboutChildStepValues {
  const v = asRaw(raw);
  const temperamentRaw = asRaw(v.temperament);
  const temperament: Record<string, number> = {};
  for (const [axis, value] of Object.entries(temperamentRaw)) {
    if (typeof value === 'number') temperament[axis] = value;
  }
  return {
    likes: strList(v.likes),
    dislikes: strList(v.dislikes),
    interests: strList(v.interests),
    temperament,
    parentNotes: str(v.parentNotes),
    // Absent means the family never saw the tick (an old client); the tick is
    // on by default in the UI, so absent follows the UI's default rather than
    // silently opting a family OUT of something they never declined.
    guruSync: v.guruSync === undefined ? true : bool(v.guruSync),
  };
}

function readMedicalValues(raw: unknown): MedicalStepValues {
  const v = asRaw(raw);
  return {
    conditions: strList(v.conditions),
    doctorName: str(v.doctorName),
    doctorPhone: str(v.doctorPhone),
    emergencyNote: str(v.emergencyNote),
    allergies: arr(v.allergies).map((row) => {
      const r = asRaw(row);
      return {
        allergen: str(r.allergen),
        severity: str(r.severity),
        reaction: str(r.reaction),
        responsePlan: str(r.responsePlan),
        carriesEpipen: bool(r.carriesEpipen),
      };
    }),
  };
}

function readDietaryValues(raw: unknown): DietaryStepValues {
  const v = asRaw(raw);
  return {
    requirements: arr(v.requirements).map((row) => {
      const r = asRaw(row);
      return {
        label: str(r.label),
        reason: str(r.reason),
        excludedFoods: strList(r.excludedFoods),
        notes: str(r.notes),
      };
    }),
  };
}

function readPreviousSchoolValues(raw: unknown): PreviousSchoolStepValues {
  const v = asRaw(raw);
  return {
    noPreviousSchool: bool(v.noPreviousSchool),
    schools: arr(v.schools).map((row) => {
      const r = asRaw(row);
      return {
        name: str(r.name),
        countryCode: str(r.countryCode),
        city: str(r.city),
        attendedFrom: str(r.attendedFrom),
        attendedTo: str(r.attendedTo),
        notes: str(r.notes),
      };
    }),
  };
}

function readContactsValues(raw: unknown): ContactsStepValues {
  const v = asRaw(raw);
  return {
    contacts: arr(v.contacts).map((row) => {
      const r = asRaw(row);
      return {
        fullName: str(r.fullName),
        relationship: str(r.relationship),
        phone: str(r.phone),
        email: str(r.email),
        canCollect: bool(r.canCollect),
        note: str(r.note),
      };
    }),
  };
}

function readConsentsValues(raw: unknown): ConsentsStepValues {
  const v = asRaw(raw);
  const consentsRaw = asRaw(v.consents);
  const consents: Record<string, boolean> = {};
  // Only an explicit `true` grants. Anything else — false, missing, a string,
  // a number — is a refusal. This is the single most important line in the file.
  for (const [kind, value] of Object.entries(consentsRaw)) consents[kind] = value === true;
  return { consents, signedName: str(v.signedName) };
}

export async function GET() {
  if (!isCmsLive()) {
    // Demo mode has no drafts. The wizard falls back to local state and still
    // walks end to end, which is the point of demo mode.
    return NextResponse.json({ mode: 'demo', draft: null });
  }
  const session = await getCmsSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (session.role !== 'parent') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    return NextResponse.json({ mode: 'live', draft: await loadOpenDraft(session) });
  } catch (error) {
    safeErrorLog('api/cms/enroll:GET', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isCmsLive()) {
    return NextResponse.json({ error: 'demo_mode' }, { status: 503 });
  }

  const session = await getCmsSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (session.role !== 'parent') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const step = String(body?.step ?? '');
    if (!(ENROLLMENT_STEPS as readonly string[]).includes(step)) {
      return NextResponse.json({ error: 'unknown_step' }, { status: 400 });
    }

    // Validate, then write. Every branch returns the SAME shapes — a 400 with
    // `fields` the UI can point at, or a SaveChildStepResult.
    let check: ValidationResult;
    let result: SaveChildStepResult;
    const raw = asRaw(body?.values);

    switch (step) {
      case 'child': {
        const values = readChildValues(raw);
        check = validateChildStep(values);
        if (!check.ok) break;
        result = await saveChildStep(session, normaliseChildStep(values));
        return finish(result, 'invalid_class_group');
      }
      case 'about_child': {
        const values = readAboutChildValues(raw);
        check = validateAboutChildStep(values);
        if (!check.ok) break;
        result = await saveAboutChildStep(session, normaliseAboutChildStep(values), raw);
        return finish(result);
      }
      case 'medical': {
        const values = readMedicalValues(raw);
        check = validateMedicalStep(values);
        if (!check.ok) break;
        result = await saveMedicalStep(session, normaliseMedicalStep(values), raw);
        return finish(result);
      }
      case 'dietary': {
        const values = readDietaryValues(raw);
        check = validateDietaryStep(values);
        if (!check.ok) break;
        result = await saveDietaryStep(session, normaliseDietaryStep(values), raw);
        return finish(result);
      }
      case 'previous_school': {
        const values = readPreviousSchoolValues(raw);
        check = validatePreviousSchoolStep(values);
        if (!check.ok) break;
        result = await savePreviousSchoolStep(session, normalisePreviousSchoolStep(values), raw);
        return finish(result);
      }
      case 'contacts': {
        const values = readContactsValues(raw);
        check = validateContactsStep(values);
        if (!check.ok) break;
        result = await saveContactsStep(session, normaliseContactsStep(values), raw);
        return finish(result);
      }
      case 'consents': {
        const values = readConsentsValues(raw);
        check = validateConsentsStep(values);
        if (!check.ok) break;
        result = await saveConsentsStep(session, normaliseConsentsStep(values), raw);
        return finish(result);
      }
      default:
        return NextResponse.json({ error: 'unknown_step' }, { status: 400 });
    }

    return NextResponse.json({ error: 'invalid', fields: check.errors }, { status: 400 });
  } catch (error) {
    safeErrorLog('api/cms/enroll:POST', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

/** One response shape for every step's write. `badRequest` names the one error
 *  code that is the caller's fault rather than ours (a room that is not this
 *  school's) so it does not come back as a 500. */
function finish(result: SaveChildStepResult, badRequest?: string) {
  if (result.ok) {
    return NextResponse.json({
      ok: true,
      enrollmentId: result.enrollmentId,
      childId: result.childId,
    });
  }
  const status =
    result.error === badRequest
      ? 400
      : result.error === 'no_draft' || result.error === 'no_guardian' || result.error === 'no_school'
        ? 409
        : 500;
  return NextResponse.json({ error: result.error ?? 'write_failed' }, { status });
}
