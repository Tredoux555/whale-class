// app/api/montree/cms-bridge/activate/route.ts
// ============================================================================
// THE JUNCTION. The one door between CMS and Montree, and it opens one way.
// ============================================================================
//
// CMS phase 7. A school_admin presses Accept in the CMS office; a child has to
// come into existence in MONTREE and a family has to be handed a Montree code.
// Two products, one repo, and a law that says which way the imports may point:
//
//     🚨 CMS NEVER IMPORTS FROM lib/montree/**.
//     ✅ MONTREE MAY IMPORT FROM CMS.
//
// This file is where that law is paid for. It sits in MONTREE's namespace, so
// it may import `lib/montree/cms-bridge/activate` (the Montree writes) AND
// `lib/cms/auth` + `lib/cms/db/queries` (the permitted direction). The CMS
// accept route calls it over HTTP through `lib/cms/montree-junction.ts` and
// never learns that `lib/montree` exists.
//
// 🚨 IT AUTHENTICATES THE CALLER ITSELF. THERE IS NO TRUSTED-CALLER MODE.
// The route reads the same signed CMS session cookie the office page was
// rendered with, requires role `school_admin`, and re-derives the enrolment,
// the child, the school link and the room link FROM THAT SESSION. The request
// body carries exactly one field — the enrolment id — and even that is proved
// against the session's school before anything is read from it. If this route
// ever accepted a montreeSchoolId, a montreeClassroomId or a child name from
// its caller, it would be an open endpoint for filing children into strangers'
// classrooms, whatever the caller happened to be.
//
// 🚨 IT OWNS THE ORDERING, AND THAT IS WHY THE CMS WRITES HAPPEN HERE.
// The link must be stored the moment the Montree child exists — BEFORE the
// invite is known to have worked — or a failed mint leaves an orphan child in
// Montree that the next attempt duplicates. Keeping the montree insert and the
// `cms_children.montree_child_id` write in one function is the only way that
// invariant is visible to the person maintaining it. What stays on the CMS side
// is the DECISION: who said yes, and moving the enrolment's status. Montree
// does not get to accept an application.
//
// The response is never an error for a Montree-side fault: `not_linked` and
// `invite_pending` are 200s with a state, because the acceptance behind them is
// real and must not be rolled back by this product's bad day.
// ============================================================================

import { NextResponse } from 'next/server';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import {
  loadAcceptContext,
  saveMontreeLink,
  savePrimaryGuardianInviteCode,
} from '@/lib/cms/db/queries';
import { activateMontreeComms } from '@/lib/montree/cms-bridge/activate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // No CMS database configured → nothing to activate. The office page is in
  // demo mode and its buttons are already disabled; this is the belt.
  if (!isCmsLive()) {
    return NextResponse.json({ error: 'demo_mode' }, { status: 503 });
  }

  const session = await getCmsSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  // school_admin ONLY — the same single role that owns the office surface. A
  // teacher may not create a Montree child by calling the bridge directly.
  if (session.role !== 'school_admin' || !session.schoolId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let enrollmentId = '';
  try {
    const body = (await request.json()) as { enrollmentId?: unknown };
    enrollmentId = typeof body.enrollmentId === 'string' ? body.enrollmentId : '';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!enrollmentId) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  try {
    // Re-derived, not received. Null covers both "no such enrolment" and "not
    // your school", indistinguishable on purpose.
    const ctx = await loadAcceptContext(session, enrollmentId);
    if (!ctx) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // ── nothing to activate into ─────────────────────────────────────────────
    if (!ctx.montreeSchoolId || !ctx.montreeClassroomId) {
      return NextResponse.json({
        ok: true,
        state: 'not_linked',
        montreeChildId: ctx.montreeChildId,
        inviteCode: ctx.inviteCode,
        reason: ctx.montreeSchoolId ? 'room_not_linked' : 'school_not_linked',
      });
    }

    // ── the Montree half ────────────────────────────────────────────────────
    // `existingMontreeChildId` IS the twin guard: with a link already stored,
    // activate mints and never inserts a second child.
    const result = await activateMontreeComms({
      montreeSchoolId: ctx.montreeSchoolId,
      montreeClassroomId: ctx.montreeClassroomId,
      existingMontreeChildId: ctx.montreeChildId,
      child: {
        legalName: ctx.legalName,
        preferredName: ctx.preferredName,
        dateOfBirth: ctx.dateOfBirth,
        startDate: ctx.requestedStartDate,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, state: 'failed', reason: result.error });
    }

    // ── the seam, saved before anything can go wrong again ───────────────────
    // `stampLinkedAt` only on the acceptance that actually created the child:
    // a retry that mints a missing code must not rewrite the activation date.
    const saved = await saveMontreeLink(
      ctx.childId,
      session.schoolId,
      result.montreeChildId,
      result.inviteCode,
      { stampLinkedAt: !ctx.montreeChildId }
    );

    // The family's own copy. Non-fatal: the child's copy is already stored and
    // the doorway falls back to it.
    if (result.inviteCode) {
      await savePrimaryGuardianInviteCode(ctx.childId, session.schoolId, result.inviteCode);
    }

    return NextResponse.json({
      ok: true,
      // An unsaved link is as dangerous as an unminted code — both mean "come
      // back and press it again", so both report as invite_pending.
      state: saved ? result.state : 'invite_pending',
      montreeChildId: result.montreeChildId,
      inviteCode: result.inviteCode,
    });
  } catch (error) {
    safeErrorLog('api/montree/cms-bridge/activate:POST', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
