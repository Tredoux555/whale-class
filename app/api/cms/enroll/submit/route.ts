// app/api/cms/enroll/submit/route.ts
// ============================================================================
// THE ONE-WAY DOOR. Draft → submitted.
// ============================================================================
//
// It takes NO BODY. There is nothing for a client to say here — every answer is
// already saved, and the only thing this changes is the enrolment's status.
// That is also why it is its own route rather than an eighth `step` on
// /api/cms/enroll: a handler that both saves a half-finished dietary row and
// irreversibly ends a family's write access is one `if` away from doing the
// wrong one.
//
// 🚨 WHAT SUBMITTING ACTUALLY DOES. Migration 329's update policy on
// cms_enrollments requires `status = 'draft'` in its USING clause, so the
// moment this commits the parent can READ the application forever and EDIT it
// never. The lock lives in the database — this route does not enforce it, it
// triggers it. `scripts/cms/rls-test.mjs` asserts both halves ("parent CANNOT
// edit an enrolment once it leaves draft" / "parent can still READ it").
//
// The completeness check lives in `submitEnrollment` (lib/cms/db/queries.ts),
// not here, because it must hold for any caller — the wizard walks the steps in
// order and will not reach the button early, but a direct POST must not be able
// to submit an application with no emergency contact on it.
// ============================================================================

import { NextResponse } from 'next/server';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { submitEnrollment } from '@/lib/cms/db/queries';

export const dynamic = 'force-dynamic';

export async function POST() {
  if (!isCmsLive()) {
    // Demo mode has no enrolment to submit, and the review screen's button is
    // disabled — this is the belt to that braces.
    return NextResponse.json({ error: 'demo_mode' }, { status: 503 });
  }

  const session = await getCmsSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (session.role !== 'parent') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const result = await submitEnrollment(session);
    if (result.ok) {
      return NextResponse.json({ ok: true, enrollmentId: result.enrollmentId });
    }
    if (result.error === 'incomplete') {
      // The UI translates the CODE; `missing` is for the wizard to point at.
      return NextResponse.json(
        { error: 'incomplete', missing: result.missing ?? [] },
        { status: 400 }
      );
    }
    const status = result.error === 'no_draft' || result.error === 'no_school' ? 409 : 500;
    return NextResponse.json({ error: result.error ?? 'write_failed' }, { status });
  } catch (error) {
    safeErrorLog('api/cms/enroll/submit:POST', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
