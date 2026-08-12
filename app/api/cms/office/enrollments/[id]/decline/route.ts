// app/api/cms/office/enrollments/[id]/decline/route.ts
// ============================================================================
// THE OTHER ANSWER. Submitted → declined, with a reason.
// ============================================================================
//
// Its own route, not a `?decision=` on accept, for the same reason submit is
// its own route: one handler that both creates a child in another product and
// closes an application is one `if` away from doing the wrong one to a real
// family.
//
// 🚨 A DECLINE TOUCHES NOTHING IN MONTREE. No child is created, no code is
// minted, and any link that somehow already exists is left exactly as it is —
// unlinking here would sever a family's Montree access as a side effect of an
// office typo. Reversing a wrongly-created child is a Montree-side act.
//
// 🚨 THE NOTE GOES IN `draft_data.office_decision`, NOT `settling_notes`.
// `settling_notes` is the FAMILY'S free text about their child ("she naps at
// one"); the wizard writes it, the teacher reads it, the class list prints it.
// Writing a rejection there would overwrite a parent's own words and then show
// them back as if the parent had written them. `draft_data` is already the
// enrolment's untyped side-car by migration 329's own definition, and the key
// is namespaced. Full reasoning at `DECISION_KEY` in lib/cms/db/queries.ts.
//
// The note is OPTIONAL but strongly wanted: "declined" with no reason is the
// thing an office cannot explain on the phone three weeks later.
// ============================================================================

import { NextResponse } from 'next/server';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { loadAcceptContext, loadDraftData, recordDecision } from '@/lib/cms/db/queries';

export const dynamic = 'force-dynamic';

/** Long enough for a real explanation, short enough not to be an essay field. */
const MAX_NOTE = 2000;

const DECLINABLE = new Set(['submitted', 'in_review']);

export async function POST(
  request: Request,
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
    const body = (await request.json().catch(() => ({}))) as { note?: unknown };
    const note =
      typeof body.note === 'string' && body.note.trim()
        ? body.note.trim().slice(0, MAX_NOTE)
        : null;

    const ctx = await loadAcceptContext(session, id);
    if (!ctx) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (ctx.status === 'declined') {
      // Idempotent, like accept: pressing decline twice is one decline.
      return NextResponse.json({ ok: true, state: 'already_declined' });
    }
    if (!DECLINABLE.has(ctx.status)) {
      // Notably: an ACCEPTED enrolment cannot be declined here. A child may
      // already exist in Montree with a code in a family's hands, and undoing
      // that is a deliberate act with consequences in another product — not a
      // button on a list.
      return NextResponse.json({ error: 'wrong_status', status: ctx.status }, { status: 409 });
    }

    const draftData = await loadDraftData(session, ctx.enrollmentId);
    const saved = await recordDecision(session, ctx.enrollmentId, 'declined', note, draftData);
    if (!saved) return NextResponse.json({ error: 'write_failed' }, { status: 500 });

    return NextResponse.json({ ok: true, state: 'declined' });
  } catch (error) {
    safeErrorLog('api/cms/office/enrollments/decline:POST', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
