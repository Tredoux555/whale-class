// app/api/montree/push/register/route.ts
// App Store build (Jun 2026): device token registration for native push.
//
// POST   { token, platform: 'ios'|'android', appVersion? }
//   Accepts a teacher/principal session (montree-auth cookie) OR a parent
//   session (montree_parent_session cookie). Upserts the token; if the same
//   device re-registers under a different account, ownership moves with it.
// DELETE { token }
//   Removes the token (logout / permissions revoked). Only the current
//   owner's token rows can be removed.

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';

// montree_device_tokens (migration 251) isn't in the generated DB types yet —
// use the untyped client view for this table (same contract as push/sender.ts).
const db = (): SupabaseClient => getSupabase() as unknown as SupabaseClient;

interface Identity {
  ownerType: 'teacher' | 'principal' | 'parent';
  ownerId: string;
  schoolId: string | null;
}

async function resolveIdentity(request: NextRequest): Promise<Identity | null> {
  // 1. Teacher / principal / homeschool-parent session.
  //    Audit-fix (Jun 2026 review): homeschool_parent maps to owner_type
  //    'parent' — thread participants store them as participant_role
  //    'parent' with the same userId, so pushes address them as 'parent'.
  const auth = await verifySchoolRequest(request);
  if (!(auth instanceof NextResponse)) {
    if (auth.role === 'agent') return null; // agents have no mobile surface
    return {
      ownerType:
        auth.role === 'principal'
          ? 'principal'
          : auth.role === 'homeschool_parent'
            ? 'parent'
            : 'teacher',
      ownerId: auth.userId,
      schoolId: auth.schoolId || null,
    };
  }
  // 2. Parent portal session (full accounts only — invite-based sessions
  //    have no parent account row to address pushes to).
  //    Audit-fix: resolveAuthorizedParent (JWT + DB re-check) instead of
  //    verifyParentSession, so deactivated/unlinked parents can't keep
  //    (re)registering on a stale 30-day cookie.
  const parent = await resolveAuthorizedParent(db());
  if (parent?.parentId) {
    return { ownerType: 'parent', ownerId: parent.parentId, schoolId: null };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body: { token?: string; platform?: string; appVersion?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const token = typeof body.token === 'string' ? body.token.trim() : '';
    const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : null;
    if (!token || token.length > 4096 || !platform) {
      return NextResponse.json(
        { error: 'token and platform (ios|android) are required' },
        { status: 400 }
      );
    }

    const supabase = db();
    const now = new Date().toISOString();
    const { error } = await supabase.from('montree_device_tokens').upsert(
      {
        token,
        platform,
        owner_type: identity.ownerType,
        owner_id: identity.ownerId,
        school_id: identity.schoolId,
        app_version:
          typeof body.appVersion === 'string' ? body.appVersion.slice(0, 64) : null,
        updated_at: now,
        last_seen_at: now,
        failed_at: null, // re-registration revives a previously dead token
      },
      { onConflict: 'token' }
    );

    if (error) {
      // 42P01 = relation does not exist → migration 251 not applied yet.
      const hint =
        (error as { code?: string }).code === '42P01'
          ? ' (run migrations/251_push_device_tokens.sql)'
          : '';
      console.error(`[push/register] upsert failed${hint}:`, error.message);
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 });
    }

    // Audit-fix (Jun 2026 review): cap devices per owner so the table can't
    // be grown unboundedly from one account. Keep the 10 most recently seen.
    try {
      const { data: extra } = await supabase
        .from('montree_device_tokens')
        .select('id')
        .eq('owner_type', identity.ownerType)
        .eq('owner_id', identity.ownerId)
        .order('last_seen_at', { ascending: false })
        .range(10, 1000);
      const extraRows = (extra || []) as Array<{ id: string }>;
      if (extraRows.length) {
        await supabase
          .from('montree_device_tokens')
          .delete()
          .in('id', extraRows.map((r) => r.id));
      }
    } catch {
      /* cap is best-effort */
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[push/register] unexpected error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const identity = await resolveIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body: { token?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const token = typeof body.token === 'string' ? body.token.trim() : '';
    if (!token) {
      return NextResponse.json({ error: 'token is required' }, { status: 400 });
    }

    const supabase = db();
    const { error } = await supabase
      .from('montree_device_tokens')
      .delete()
      .eq('token', token)
      .eq('owner_type', identity.ownerType)
      .eq('owner_id', identity.ownerId);

    if (error) {
      console.error('[push/register] delete failed:', error.message);
      return NextResponse.json({ error: 'Failed to unregister device' }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[push/register] unexpected error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
