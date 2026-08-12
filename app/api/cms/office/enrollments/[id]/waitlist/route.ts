// app/api/cms/office/enrollments/[id]/waitlist/route.ts
// ============================================================================
// "NOT NOW, BUT NOT NO." The third answer an office actually gives.
// ============================================================================
//
// Accept creates a child in another product; decline closes an application.
// This one does neither: it is a pure CMS status move to `waitlisted`, and it
// touches nothing Montree owns. A waitlisted family can still be accepted
// later, and that acceptance runs the full handshake as if this had never
// happened — which is exactly why waitlisting must NOT mint anything now.
//
// It records `decided_by_user_id` for the same reason accept and decline do: a
// place held for six weeks by nobody in particular is not an audit trail.
//
// No note field. A decline needs an explanation the office can read back on the
// phone; a waitlist is a queue position, and inventing a second free-text store
// for it would put two kinds of office writing in one JSON blob.
// ============================================================================

import { NextResponse } from 'next/server';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadAcceptContext, recordDecision } from '@/lib/cms/db/queries';

export const dynamic = 'force-dynamic';

/** Only an undecided application can be held. */
const WAITLISTABLE = new Set(['submitted', 'in_review']);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isCmsLive()) {
    return NextResponse.json({ error: 'demo_mode' }, { status: 503 });
  }

  const session = await getCmsSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  if (session.role !== 'school_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const ctx = await loadAcceptContext(session, id);
    if (!ctx) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Idempotent, like the other two: pressing it twice is one waitlisting.
    if (ctx.status === 'waitlisted') {
      return NextResponse.json({ ok: true, state: 'already_waitlisted' });
    }
    if (!WAITLISTABLE.has(ctx.status)) {
      // Notably: an ACCEPTED enrolment cannot be waitlisted back. The child may
      // already exist in Montree with a code in a family's hands, and a status
      // that says "waiting" over a live Montree account is a lie the office
      // would have to explain.
      return NextResponse.json({ error: 'wrong_status', status: ctx.status }, { status: 409 });
    }

    const saved = await recordDecision(session, ctx.enrollmentId, 'waitlisted', null, null);
    if (!saved) return NextResponse.json({ error: 'write_failed' }, { status: 500 });

    return NextResponse.json({ ok: true, state: 'waitlisted' });
  } catch (error) {
    safeErrorLog('api/cms/office/enrollments/waitlist:POST', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
