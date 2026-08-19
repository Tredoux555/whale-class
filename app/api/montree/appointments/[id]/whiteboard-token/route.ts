/**
 * POST /api/montree/appointments/[id]/whiteboard-token
 *
 * Mints an Agora Interactive Whiteboard (Fastboard) room + token for a
 * Dark Phonics Live class. Sibling of, and deliberately shaped like,
 * `app/api/montree/appointments/[id]/agora-token/route.ts`:
 *   - caller is staff OR parent, disambiguated by `?as=teacher|staff|parent`
 *   - gated on the `dark_phonics_live` feature flag (404 when off, so the
 *     surface is indistinguishable from "not built" for un-flagged schools)
 *   - appointment must be `provider === 'agora'` and `status === 'confirmed'`
 *
 * Returns: { roomUuid, token, appIdentifier, region, expiresAt, role }
 */

import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAppointmentsParent } from '@/lib/montree/appointments/parent-access';
import { isFeatureEnabled } from '@/lib/montree/features/server';
import {
  getOrCreateWhiteboardRoom,
  mintWhiteboardToken,
  whiteboardRoleFor,
  WhiteboardError,
} from '@/lib/montree/agora/whiteboard';

export const dynamic = 'force-dynamic';

const FEATURE_KEY = 'dark_phonics_live';

type ActorKind = 'staff' | 'parent';

interface ResolvedActor {
  kind: ActorKind;
  /** Stable identity used for logging / whiteboard role mapping. */
  identityId: string;
  schoolId: string;
}

/**
 * Mirrors the `?as=` disambiguation in `agora-token/route.ts` (read directly,
 * not guessed). Both resolvers there return a discriminated union — either
 * the resolved identity, or an already-built NextResponse (401/403/404) that
 * the caller returns as-is. `verifySchoolRequest(request)` reads the
 * `montree-auth` cookie; `resolveAppointmentsParent(supabase)` reads the
 * `montree_parent_session` cookie internally via `verifyParentSession()` (no
 * request param — it's edge/server-context based, not request-based).
 */
async function resolveActor(
  supabase: SupabaseClient,
  request: NextRequest,
  appointment: { id: string; school_id: string | null; parent_id: string | null }
): Promise<ResolvedActor | NextResponse> {
  const hint = request.nextUrl.searchParams.get('as');
  const wantsParent = hint === 'parent';
  const wantsStaff = hint === 'teacher' || hint === 'staff';

  if (!wantsParent) {
    const staffResult = await verifySchoolRequest(request);
    if (!(staffResult instanceof NextResponse)) {
      const staff = staffResult;
      if (appointment.school_id && staff.schoolId !== appointment.school_id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      return { kind: 'staff', identityId: staff.userId, schoolId: staff.schoolId };
    }
    if (wantsStaff) return staffResult; // explicit staff hint, no parent fallback
    // no hint / ambiguous → fall through to parent auth below
  }

  const parentResult = await resolveAppointmentsParent(supabase);
  if (parentResult instanceof NextResponse) return parentResult;
  const parent = parentResult;
  if (appointment.parent_id && appointment.parent_id !== parent.parentId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return { kind: 'parent', identityId: parent.parentId, schoolId: parent.schoolId };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: appointmentId } = await context.params;

  try {
    const supabase = getSupabase();

    const { data: appointment, error: apptError } = await supabase
      .from('montree_appointments')
      .select('id, school_id, parent_id, provider, status, ical_token')
      .eq('id', appointmentId)
      .maybeSingle();

    if (apptError) {
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }
    if (!appointment) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const actor = await resolveActor(supabase, request, appointment);
    if (actor instanceof NextResponse) return actor;

    // Feature gate — 404 (not 403) so the surface reads as nonexistent when off.
    const enabled = await isFeatureEnabled(
      supabase,
      appointment.school_id ?? actor.schoolId,
      FEATURE_KEY
    );
    if (!enabled) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (appointment.provider !== 'agora') {
      return NextResponse.json(
        { error: 'unsupported_provider', provider: appointment.provider },
        { status: 400 }
      );
    }
    if (appointment.status !== 'confirmed') {
      return NextResponse.json(
        { error: 'appointment_not_confirmed', status: appointment.status },
        { status: 409 }
      );
    }

    const { roomUuid } = await getOrCreateWhiteboardRoom(appointmentId, supabase);
    const role = whiteboardRoleFor(actor.kind);
    // mintWhiteboardToken is async as of the 2026-08-19 security fix — it now
    // calls the real Agora REST endpoint for a room+role-scoped token instead
    // of returning the org secret. Do not remove this await.
    const minted = await mintWhiteboardToken({ roomUuid, role });

    return NextResponse.json({
      roomUuid: minted.roomUuid,
      token: minted.token,
      appIdentifier: minted.appIdentifier,
      region: minted.region,
      expiresAt: minted.expiresAt,
      role,
    });
  } catch (err) {
    if (err instanceof WhiteboardError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status }
      );
    }
    console.error('[whiteboard-token] unexpected error', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
