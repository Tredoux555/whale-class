/**
 * POST /api/montree/dark-phonics-live/book
 *
 * Credits-aware booking for a Dark Phonics Live 1-on-1 class.
 *
 * This is a NEW, parallel route rather than an edit to the existing parent
 * appointment booking route (`app/api/montree/parent/appointments/route.ts`)
 * — the build contract forbids touching files outside this slice. This route
 * mirrors that one's insert shape closely (confirmed by reading it directly)
 * so the two can be merged later without a schema mismatch.
 *
 * Flow: parent auth (via the shared appointments-parent resolver) → flag
 * gate → validate body → child-ownership check → insert appointment
 * (status 'pending') → SPEND CREDIT (atomic RPC) → confirm appointment
 * (status 'confirmed'). The appointment is created first because
 * `montree_class_credits_ledger.appointment_id` has a foreign key to it —
 * spending before the row exists violates that FK. If the spend fails (no
 * credit left), the unpaid appointment is deleted, so nothing bookable is
 * ever left behind for a class that wasn't paid for.
 *
 * STATUS REUSE — READ THIS: `montree_appointments.status` is CHECK-constrained
 * to `'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'`
 * (migration 216). Rather than adding a new 'pending_credit' value (which
 * would need an ALTER on a constraint owned by a different migration), this
 * route reuses 'pending' for "created, not yet paid for". Elsewhere in the
 * app 'pending' means "awaiting host confirmation" — a different meaning
 * layered onto the same value. In practice a DPL appointment spends only
 * milliseconds in 'pending' (it flips to 'confirmed' in the same request
 * right after the credit spend succeeds), so the collision is unlikely to
 * cause visible confusion, but it IS a real semantic overload — a human
 * should decide whether that's acceptable or worth a proper enum addition
 * before this ships to real parents.
 *
 * TEACHER ASSIGNMENT — solo-teacher launch: this route assigns the single
 * configured teacher (`DARK_PHONICS_LIVE_TEACHER_ID` env var) as the
 * appointment's host, matching the contract's "just me, solo" decision.
 * Every appointment needs at least one `montree_appointment_hosts` row
 * (confirmed by reading the real booking route) — there is no availability-
 * slot checking here yet (no double-booking guard), which is an explicit
 * scaffold gap, not an oversight; see NOTES-backend.md.
 *
 * Body: { childId: string, scheduledStart: string (ISO), durationMinutes?: number }
 * 201 → { appointment, creditsRemaining }
 * 402 → { error: 'insufficient_credits', creditsRemaining: 0 }
 */

import { randomBytes } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabase } from '@/lib/supabase-client';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import { getCreditBalance, spendCreditForBooking } from '@/lib/montree/credits/ledger';
import {
  resolveDplParent,
  withDplCors,
  dplOptionsHandler,
} from '@/lib/montree/dark-phonics-live/app-auth';

export const dynamic = 'force-dynamic';

/** Standalone-app preflight — the app's cross-origin POST triggers one. */
export const OPTIONS = dplOptionsHandler;

const FEATURE_KEY = 'dark_phonics_live';
/** Contract: 1-on-1, 25-minute classes. */
const DEFAULT_DURATION_MINUTES = 25;

interface BookBody {
  childId?: string;
  scheduledStart?: string;
  durationMinutes?: number;
}

export async function POST(request: NextRequest) {
  // withDplCors is a no-op unless the caller is an allow-listed app origin, so
  // every browser response is byte-identical to before.
  return withDplCors(await handlePOST(request), request);
}

async function handlePOST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // --- 1. parent auth -----------------------------------------------------
    // resolveDplParent() accepts EITHER an `Authorization: Bearer <jwt>` header
    // (standalone app) or the parent session cookie (website), and with no
    // bearer header it delegates straight to resolveAppointmentsParent().
    // Either way it returns either the resolved parent or an
    // already-built NextResponse (401/403/404) — read from
    // lib/montree/appointments/parent-access.ts directly, not guessed. NOTE:
    // it internally gates on the *'appointments'* feature flag (a different,
    // pre-existing flag), so a school with 'appointments' off will 404 here
    // before this route's own 'dark_phonics_live' check ever runs. That's a
    // real dependency worth knowing about, not a bug.
    const parentResult = await resolveDplParent(request, supabase);
    if (parentResult instanceof NextResponse) return parentResult;
    const parent = parentResult; // { parentId, parentName, schoolId, childIds }

    // --- 2. feature gate (404 when off) --------------------------------------
    const enabled = await isFeatureEnabled(supabase, parent.schoolId, FEATURE_KEY);
    if (!enabled) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // --- 3. body validation ---------------------------------------------------
    let body: BookBody;
    try {
      body = (await request.json()) as BookBody;
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
    }

    const childId = typeof body.childId === 'string' ? body.childId.trim() : '';
    if (!childId) {
      return NextResponse.json(
        { error: 'invalid_body', message: 'childId is required' },
        { status: 400 }
      );
    }

    const start = body.scheduledStart ? new Date(body.scheduledStart) : null;
    if (!start || Number.isNaN(start.getTime())) {
      return NextResponse.json(
        { error: 'invalid_body', message: 'scheduledStart must be an ISO datetime' },
        { status: 400 }
      );
    }
    if (start.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'invalid_body', message: 'scheduledStart must be in the future' },
        { status: 400 }
      );
    }

    const durationMinutes = Number.isInteger(body.durationMinutes)
      ? (body.durationMinutes as number)
      : DEFAULT_DURATION_MINUTES;
    if (durationMinutes < 5 || durationMinutes > 120) {
      return NextResponse.json(
        { error: 'invalid_body', message: 'durationMinutes must be 5..120' },
        { status: 400 }
      );
    }
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    // --- 4. child must belong to this parent -----------------------------------
    // parent.childIds comes straight from montree_parent_children (the real
    // junction table — montree_children has NO parent_id column, confirmed by
    // reading its CREATE TABLE). No extra query needed for the ownership check
    // itself; we still fetch classroom_id below since the appointment row wants it.
    if (!parent.childIds.includes(childId)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, classroom_id')
      .eq('id', childId)
      .maybeSingle();

    if (childError || !child) {
      return NextResponse.json({ error: 'child_not_found' }, { status: 404 });
    }

    // --- 5. teacher/host assignment (solo-teacher launch) -----------------------
    const teacherId = process.env.DARK_PHONICS_LIVE_TEACHER_ID;
    if (!teacherId) {
      console.error(
        '[dark-phonics-live/book] DARK_PHONICS_LIVE_TEACHER_ID is not configured'
      );
      return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }

    // --- 6. create the appointment, THEN spend the credit -----------------------
    // Write order matters: `montree_class_credits_ledger.appointment_id` has a
    // foreign key to `montree_appointments`, so the appointment row must exist
    // before `spendCreditForBooking` can reference it.
    //
    // ical_token: generated the same way the real booking route does it
    // (`randomBytes(18).toString('base64url')`) — the Agora channel name for
    // this class is derived from it at join time via the whiteboard/agora
    // token routes, so it must be set on every DPL appointment, not left null.
    //
    // provider: always 'agora' — Dark Phonics Live has no Jitsi fallback path
    // by design (the contract locks in Agora). This assumes migration 223
    // (which adds the `provider` column) is already applied; reasonable since
    // 'dark_phonics_live' is a new flag shipping after it, unlike the base
    // appointments route which still supports pre-223 databases.
    const icalToken = randomBytes(18).toString('base64url');

    const { data: appointment, error: insertError } = await supabase
      .from('montree_appointments')
      .insert({
        school_id: parent.schoolId,
        classroom_id: child.classroom_id,
        child_id: childId,
        parent_id: parent.parentId,
        event_kind: 'single_host',
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        duration_minutes: durationMinutes,
        status: 'pending', // see file-header note — reused, not a new enum value
        ical_token: icalToken,
        provider: 'agora',
      })
      .select()
      .single();

    if (insertError || !appointment) {
      console.error('[dark-phonics-live/book] appointment insert failed', insertError);
      return NextResponse.json({ error: 'booking_failed' }, { status: 500 });
    }

    const appointmentId = appointment.id as string;

    // Host junction row — every appointment needs at least one (confirmed by
    // reading the real booking route's hostRows construction). Single-host
    // kind, so exactly one row, is_primary + is_required both true.
    const { error: hostError } = await supabase.from('montree_appointment_hosts').insert({
      appointment_id: appointmentId,
      host_role: 'teacher',
      host_id: teacherId,
      is_primary: true,
      is_required: true,
      response: 'accepted',
      response_at: new Date().toISOString(),
    });
    if (hostError) {
      // Non-fatal to the booking itself, but the appointment now has no host
      // row, which likely breaks calendar/host-facing queries elsewhere.
      console.error(
        '[dark-phonics-live/book] host row insert failed — appointment exists without a host',
        { appointmentId, hostError }
      );
    }

    // --- 7. spend the credit -----------------------------------------------------
    const spend = await spendCreditForBooking(supabase, {
      childId,
      parentId: parent.parentId,
      appointmentId,
      createdBy: parent.parentId,
    });

    if (!spend.ok) {
      // No credit → the appointment we just created was never paid for.
      // Delete it outright (and its host row) rather than reversing a credit
      // that was never spent.
      await supabase.from('montree_appointment_hosts').delete().eq('appointment_id', appointmentId);
      const { error: deleteError } = await supabase
        .from('montree_appointments')
        .delete()
        .eq('id', appointmentId);

      if (deleteError) {
        console.error(
          '[dark-phonics-live/book] failed to clean up unpaid pending appointment — manual fix needed',
          { appointmentId, childId, deleteError }
        );
      }

      return NextResponse.json(
        { error: 'insufficient_credits', creditsRemaining: 0 },
        { status: 402 }
      );
    }

    // --- 8. credit spent — confirm the appointment --------------------------------
    const { data: confirmed, error: confirmError } = await supabase
      .from('montree_appointments')
      .update({ status: 'confirmed' })
      .eq('id', appointmentId)
      .select()
      .single();

    if (confirmError || !confirmed) {
      // The credit is already spent and the ledger is the source of truth for
      // that, so we do NOT reverse it here — the appointment exists and is
      // bookable, it just failed to flip out of 'pending'. Log loudly; a
      // status-repair sweep (or manual fix) should confirm it by id.
      console.error(
        '[dark-phonics-live/book] credit spent but status confirm failed — needs manual status fix',
        { appointmentId, childId, confirmError }
      );
    }

    const creditsRemaining = await getCreditBalance(supabase, childId);

    return NextResponse.json(
      { appointment: confirmed ?? appointment, creditsRemaining },
      { status: 201 }
    );
  } catch (err) {
    console.error('[dark-phonics-live/book] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
