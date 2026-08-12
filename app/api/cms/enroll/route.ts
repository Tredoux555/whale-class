// app/api/cms/enroll/route.ts
// ============================================================================
// THE ENROLMENT WRITE. Phase 1's wizard kept its state in useState and lost it
// on refresh; this is where a family's answers become rows.
// ============================================================================
//
//   GET   → the family's open draft (or null), so the wizard can resume.
//   POST  → save a step.
//             { step: 'child',  values: {...} }  creates/updates the child,
//                                                the guardian link and the
//                                                draft enrolment.
//             { step: <other>,  values: {...} }  parks the scaffold step's
//                                                answers in draft_data.
//
// Route handler rather than a server action, matching every other write in this
// repo (app/api/montree/**, app/api/potato/**) — one auth posture, one error
// shape, one place to look.
//
// 🚨 THE SESSION IS THE ONLY SOURCE OF TENANCY. The body never names a school,
// a guardian or a child. It cannot: those come from the cookie. This is the
// same rule the Jul-3 cross-tenant incident produced — a client-supplied id is
// a request, not a fact.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadOpenDraft, saveChildStep, saveDraftStep } from '@/lib/cms/db/queries';
import { ENROLLMENT_STEPS } from '@/lib/cms/engine/types';
import { normaliseChildStep, validateChildStep, type ChildStepValues } from '@/lib/cms/validation';

export const dynamic = 'force-dynamic';

function readChildValues(raw: unknown): ChildStepValues {
  const v = (raw ?? {}) as Record<string, unknown>;
  const str = (k: string) => String(v[k] ?? '');
  return {
    legalName: str('legalName'),
    preferredName: str('preferredName'),
    dateOfBirth: str('dateOfBirth'),
    homeLanguage: str('homeLanguage'),
    requestedStartDate: str('requestedStartDate'),
    classGroupId: str('classGroupId'),
    settlingNotes: str('settlingNotes'),
  };
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

    if (step === 'child') {
      const values = readChildValues(body?.values);
      // The client validates too, for the error messages. THIS is the check
      // that counts — a client that skips validation must not be able to write
      // a child with no date of birth.
      const check = validateChildStep(values);
      if (!check.ok) {
        return NextResponse.json({ error: 'invalid', fields: check.errors }, { status: 400 });
      }
      const result = await saveChildStep(session, normaliseChildStep(values));
      if (!result.ok) {
        const status = result.error === 'invalid_class_group' ? 400 : 500;
        return NextResponse.json({ error: result.error ?? 'write_failed' }, { status });
      }
      return NextResponse.json({
        ok: true,
        enrollmentId: result.enrollmentId,
        childId: result.childId,
      });
    }

    // Steps 2–6 are scaffolds: whatever they captured is parked verbatim so the
    // family can leave and come back. They are NOT marked complete — a step
    // that has not been built cannot be finished.
    const payload =
      body?.values && typeof body.values === 'object'
        ? (body.values as Record<string, unknown>)
        : {};
    const result = await saveDraftStep(session, step, payload, false);
    if (!result.ok) {
      const status = result.error === 'no_draft' ? 409 : 500;
      return NextResponse.json({ error: result.error ?? 'write_failed' }, { status });
    }
    return NextResponse.json({ ok: true, enrollmentId: result.enrollmentId });
  } catch (error) {
    safeErrorLog('api/cms/enroll:POST', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
