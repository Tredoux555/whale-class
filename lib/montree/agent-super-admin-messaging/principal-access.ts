// lib/montree/agent-super-admin-messaging/principal-access.ts
//
// Migration 292 — entry-point access guard for the FOUNDING SCHOOL ↔
// super-admin messaging surface. Sibling to access.ts (agent side); kept
// separate so the agent resolver is untouched.
//
// PRINCIPAL SIDE — `resolveMessagingPrincipal`:
//   - Verifies JWT role === 'principal' (verifySchoolRequest returns
//     role:'principal' for a principal cookie/token).
//   - Verifies the principal's school has founding_member=true — non-founding
//     principals get a friendly 403 (the "Message Tredoux" channel is a
//     Founding-member perk).
//   - Returns { principalId, schoolId, name }.
//
// CROSS-POLLINATION CONTRACT (mirrors access.ts):
//   - Principal endpoints filter to threads where the principal is a
//     participant AND thread_type='principal_super_admin'.
//   - The super-admin side sees ALL principal_super_admin threads globally.
//   - school_id on these threads is ALWAYS the principal's school (populated).

import { NextRequest, NextResponse } from 'next/server';
import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';
import { verifySchoolRequest } from '../verify-request';

export interface MessagingPrincipal {
  principalId: string;
  schoolId: string;
  name: string;
}

interface SchoolRow {
  id: string;
  name: string | null;
  founding_member: boolean | null;
}

interface PrincipalRow {
  id: string;
  name: string | null;
  email: string | null;
}

/**
 * Resolve and authorize the principal for founding ↔ super-admin messaging.
 * Returns the principal identity bundle on success, or a NextResponse the
 * caller must return.
 *
 * Returns 401 when not authed, 403 when not a principal / not a founding
 * school, 404 when the school no longer exists.
 */
export async function resolveMessagingPrincipal(
  request: NextRequest,
  supabase: SupabaseClient
): Promise<MessagingPrincipal | NextResponse> {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== 'principal') {
    return NextResponse.json(
      { error: 'Forbidden — principal role required' },
      { status: 403 }
    );
  }

  // Verify the school exists AND is a Founding member (migration 286 column).
  const { data: schoolRaw } = await supabase
    .from('montree_schools')
    .select('id, name, founding_member')
    .eq('id', auth.schoolId)
    .maybeSingle();

  if (!schoolRaw) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }
  const school = schoolRaw as SchoolRow;
  if (!school.founding_member) {
    return NextResponse.json(
      { error: 'The direct line to Tredoux is a Founding member benefit.' },
      { status: 403 }
    );
  }

  // Resolve the principal's display name from the school-admin row.
  const { data: adminRaw } = await supabase
    .from('montree_school_admins')
    .select('id, name, email')
    .eq('id', auth.userId)
    .eq('school_id', auth.schoolId)
    .maybeSingle();
  const admin = adminRaw as PrincipalRow | null;

  return {
    principalId: auth.userId,
    schoolId: auth.schoolId,
    name: admin?.name || admin?.email || school.name || 'Principal',
  };
}
