// app/api/cms/office/enrollments/[id]/accept/route.ts
// ============================================================================
// THE ACCEPT ACTION — the moment CMS hands a family to Montree.
// ============================================================================
//
// When the office says yes, four things must become true, in this order:
//
//   1. the enrolment is `accepted`,
//   2. the child exists in Montree, in the room the family was offered,
//   3. `cms_children.montree_child_id` points at it (which is also the seam the
//      Guru already reads — see step 4 of the phase-7 notes in CLAUDE.md),
//   4. a Montree parent invite code exists and is stored where the office can
//      read it back to the family.
//
// 🚨 STEPS 2–4 DO NOT HAPPEN IN THIS FILE, AND THAT IS THE ARCHITECTURE.
// CMS may not import from `lib/montree/**`, so this route asks for them over
// HTTP through `lib/cms/montree-junction.ts`, which calls
// `POST /api/montree/cms-bridge/activate` — a route in Montree's namespace that
// verifies this same school_admin session for itself. This file therefore
// contains no Montree table name, no invite mechanics and no knowledge that
// Montree is a database at all. It knows only that the junction answered, and
// what it said. (JUNCTION PATTERN, CLAUDE.md.)
//
// 🚨 IT IS IDEMPOTENT, AND THAT IS THE DESIGN, NOT A NICETY. This endpoint
// causes a row to be created in ANOTHER PRODUCT. A double-click, a retried
// fetch, or an office that pressed accept last week and pressed it again today
// must never produce two Montree children for one child. So:
//
//   · already `accepted` + already linked + code in hand → no-op, 200,
//     `state: 'already_accepted'`, and the code comes back so the page can
//     show it again. The junction is not even called.
//   · already `accepted` + linked + NO code → the RETRY PATH. The junction
//     mints only: it is handed the child id CMS already stored, so it cannot
//     insert a second child.
//   · already `accepted` + not linked (school linked since) → activate now.
//     Accepting twice is how an office turns comms on for a family whose
//     school was linked after the fact.
//   · any other status than `submitted`/`in_review`/`accepted` → 409. A
//     withdrawn or declined application is not accepted by pressing a button
//     twice.
//
// 🚨 THAT IDEMPOTENCY GUARDS A RETRY, NOT A RACE. Two requests that both read
// `submitted`/`in_review` before either has written anything (two admins, or
// one impatient double-click) would both pass every check above with the same
// `montreeChildId: null` and both call the junction fresh — two Montree
// children for one CMS child. `claimEnrollmentForAccept` closes that window
// with a single conditional UPDATE (`eq('status', ctx.status)`), atomic at the
// row level, BEFORE the junction is ever asked: only the request that still
// sees the status it read gets to flip it and proceed. The loser affects zero
// rows, re-reads the row instead of guessing, and reports `invite_pending` —
// the same amber "press it again" state a slow Montree already produces —
// rather than racing the winner to Montree.
//
// 🚨 PARTIAL FAILURE IS RECOVERABLE BY CONSTRUCTION, and the decision is
// recorded EITHER WAY. If the junction is unreachable, or Montree refuses, or
// the invite fails to mint, the acceptance still stands: the response is `ok`
// with a state that names the fault, the office row shows an amber badge, and
// the Accept button becomes Retry. Treating a Montree fault as a failed accept
// would un-accept a child because another product had a bad minute.
//
// 🚨 NOT LINKED IS A SUCCESS, NOT AN ERROR. A CMS school with no Montree link
// accepts perfectly well; it just cannot switch communication on. CMS must run
// on a montree-less database — that is the whole standalone story.
//
// TENANCY comes from the session (`loadAcceptContext` re-proves the enrolment,
// the child, the school and the requested room all belong to it). The BODY is
// ignored entirely: there is nothing a client could legitimately say here.
// ============================================================================

import { NextResponse } from 'next/server';
import { safeErrorLog } from '@/lib/api-error';
import { isCmsLive } from '@/lib/cms/auth/mode';
import { getCmsSession } from '@/lib/cms/auth/server';
import { claimEnrollmentForAccept, loadAcceptContext } from '@/lib/cms/db/queries';
import { requestMontreeActivation } from '@/lib/cms/montree-junction';

export const dynamic = 'force-dynamic';

/** Statuses an accept may legitimately start from. */
const ACCEPTABLE = new Set(['submitted', 'in_review', 'accepted']);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isCmsLive()) {
    // Demo mode has no database to accept into, and the office page renders its
    // buttons disabled with a banner. This is the belt to those braces.
    return NextResponse.json({ error: 'demo_mode' }, { status: 503 });
  }

  const session = await getCmsSession();
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  // 🚨 school_admin ONLY. Not teacher (an application is office business — the
  // phase-4 rule), not org_admin (the org layer is read-only aggregate), and
  // certainly not parent.
  if (session.role !== 'school_admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const ctx = await loadAcceptContext(session, id);
    // Null covers both "no such enrolment" and "not your school", deliberately
    // indistinguishable — a 404 that only fires for other people's rows is a
    // membership oracle.
    if (!ctx) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    if (!ACCEPTABLE.has(ctx.status)) {
      return NextResponse.json(
        { error: 'wrong_status', status: ctx.status },
        { status: 409 }
      );
    }

    let alreadyAccepted = ctx.status === 'accepted';

    // ── the no-op: everything already done. The junction is not called ───────
    if (alreadyAccepted && ctx.montreeChildId && ctx.inviteCode) {
      return NextResponse.json({
        ok: true,
        state: 'already_accepted',
        inviteCode: ctx.inviteCode,
        montreeChildId: ctx.montreeChildId,
      });
    }

    // 🚨 THE FIRST-ACCEPT MUTEX. Claim the status transition BEFORE asking
    // Montree for anything: two nearly-simultaneous accepts (two admins, or a
    // retried fetch) both pass the checks above having read the SAME
    // `montreeChildId: null`, and without this, both would call the junction
    // with no existing child to hand it — creating two Montree children for
    // one CMS child. `claimEnrollmentForAccept` is a single conditional
    // UPDATE, atomic at the row level: only the request that still sees the
    // status it read gets to flip it. The loser affects zero rows and finds
    // out before it ever reaches Montree.
    if (!alreadyAccepted) {
      const claimed = await claimEnrollmentForAccept(session, ctx.enrollmentId, ctx.status);
      if (!claimed) {
        // Someone else is mid-handshake for this exact enrolment right now.
        // Re-read rather than guess: by the time the office presses Accept
        // again, the winner has usually finished and this becomes the normal
        // no-op or retry path. Calling the junction ourselves here would be
        // exactly the race this guards against.
        const fresh = await loadAcceptContext(session, id);
        if (!fresh) return NextResponse.json({ error: 'not_found' }, { status: 404 });
        if (fresh.montreeChildId && fresh.inviteCode) {
          return NextResponse.json({
            ok: true,
            state: 'already_accepted',
            inviteCode: fresh.inviteCode,
            montreeChildId: fresh.montreeChildId,
          });
        }
        return NextResponse.json({
          ok: true,
          state: 'invite_pending',
          reason: 'concurrent_accept',
        });
      }
      alreadyAccepted = true;
    }

    // ── ask Montree ─────────────────────────────────────────────────────────
    // 🚨 THE CONFIGURED ORIGIN WINS, NOT THE REQUEST'S. `request.url` is built
    // from whatever `Host` header reached this server — fine for choosing a
    // page's own canonical link, but this fetch carries the caller's signed
    // session cookie to wherever `origin` points. Trusting an unvalidated Host
    // header here would let it redirect the cookie to an attacker-chosen
    // domain. `NEXT_PUBLIC_APP_URL` is the same deployment-pinned base URL
    // every other cross-request URL in this repo already uses (see
    // `montreeParentEntryUrl` below); the request-derived origin survives only
    // as the fallback for environments that never set it (localhost, an
    // ephemeral preview deploy).
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const junction = await requestMontreeActivation(
      origin,
      request.headers.get('cookie') ?? '',
      ctx.enrollmentId
    );

    if (junction.state === 'not_linked') {
      return NextResponse.json({
        ok: true,
        state: 'accepted_unlinked',
        // Which half is missing, so the page can say the true sentence rather
        // than a generic one.
        reason: junction.reason,
      });
    }

    if (junction.state === 'failed') {
      // 🚨 THE ACCEPTANCE STILL STANDS. The office said yes; a Montree fault is
      // not the family's problem. The page shows "communication activation
      // unavailable" with the reason, and Accept becomes Retry.
      return NextResponse.json({
        ok: true,
        state: 'accepted_activation_failed',
        reason: junction.reason,
      });
    }

    return NextResponse.json({
      ok: true,
      state: junction.state,
      inviteCode: junction.inviteCode,
      montreeChildId: junction.montreeChildId,
    });
  } catch (error) {
    safeErrorLog('api/cms/office/enrollments/accept:POST', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
