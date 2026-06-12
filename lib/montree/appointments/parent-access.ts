// lib/montree/appointments/parent-access.ts
//
// Parent-side access guard for appointment booking endpoints. Mirror of
// resolveMessagingParent (Session 98) but checks the `appointments`
// feature flag instead of `parent_messaging`.
//
// IMPORTANT: appointments and messaging are INDEPENDENT flags. A school
// can have appointments ON + messaging OFF — confirmations simply won't
// auto-post to a thread (shareAppointmentToThread silently returns
// feature_disabled and the parent sees confirmations on the appointment
// detail page, not in their inbox).

import { NextResponse } from 'next/server';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { verifyParentSession } from '@/lib/montree/verify-parent-request';
import { isFeatureEnabled } from '@/lib/montree/features/server';

export interface AppointmentsParent {
  parentId: string;
  parentName: string;
  schoolId: string;
  childIds: string[];
}

/**
 * Resolve a parent for appointment booking. 404 when the school hasn't
 * enabled the feature (the surface should not appear to exist for
 * unflagged schools).
 */
export async function resolveAppointmentsParent(
  supabase: SupabaseClient
): Promise<AppointmentsParent | NextResponse> {
  const session = await verifyParentSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Invite-only sessions can't book — booking creates a record tied to
  // a parent identity, which invite-only doesn't have.
  if (!session.parentId) {
    return NextResponse.json(
      { error: 'Booking requires a full parent account.' },
      { status: 403 }
    );
  }

  const { data: parent } = await supabase
    .from('montree_parents')
    .select('id, name, email, school_id, is_active')
    .eq('id', session.parentId)
    .maybeSingle();

  if (!parent || !parent.is_active) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 401 });
  }

  const flagOn = await isFeatureEnabled(supabase, parent.school_id, 'appointments');
  if (!flagOn) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Resolve the parent's authorised child list. Mirrors Session 113 V2
  // parent F-1.1 — server is the source of truth for which children
  // this parent is linked to.
  const { data: links } = await supabase
    .from('montree_parent_children')
    .select('child_id')
    .eq('parent_id', parent.id);
  const childIds = (links || []).map((l: { child_id: string }) => l.child_id);

  return {
    parentId: parent.id,
    parentName: parent.name || parent.email,
    schoolId: parent.school_id,
    childIds,
  };
}
