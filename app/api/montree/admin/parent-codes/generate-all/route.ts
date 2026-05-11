// /api/montree/admin/parent-codes/generate-all/route.ts
// Principal action — for every child in the school that doesn't currently
// have an active invite code, generate one.
//
// Idempotent: re-running this never replaces existing active codes. It only
// fills gaps. The principal can ALWAYS reset an individual code via the
// per-child UI (which calls /api/montree/invites PUT) — this route stays
// safe-to-spam.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'principal') {
      return NextResponse.json(
        { error: 'Principal access required.' },
        { status: 403 }
      );
    }

    const supabase = getSupabase();

    // 1. All active children in this school.
    const { data: children, error: childErr } = await supabase
      .from('montree_children')
      .select('id')
      .eq('school_id', auth.schoolId)
      .eq('is_active', true);

    if (childErr) {
      console.error('[parent-codes generate-all] children query failed:', childErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json({ success: true, created: 0, total: 0 });
    }

    const childIds = children.map((c) => c.id);

    // 2. Which children already have an active code?
    const { data: existingInvites, error: invErr } = await supabase
      .from('montree_parent_invites')
      .select('child_id')
      .in('child_id', childIds)
      .eq('is_active', true);

    if (invErr) {
      console.error('[parent-codes generate-all] invites query failed:', invErr);
      return NextResponse.json({ error: 'Failed to read existing invites' }, { status: 500 });
    }

    const withCode = new Set((existingInvites || []).map((i) => i.child_id));
    const missing = childIds.filter((id) => !withCode.has(id));

    if (missing.length === 0) {
      return NextResponse.json({ success: true, created: 0, total: children.length });
    }

    // 3. Generate one code per missing child. Use the DB function so the
    //    alphabet (no I/O/0/1) stays consistent with the rest of the system.
    let createdCount = 0;
    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    for (const childId of missing) {
      try {
        const { data: codeResult, error: codeErr } = await supabase.rpc(
          'generate_parent_invite_code'
        );
        if (codeErr || !codeResult) {
          console.error('[parent-codes generate-all] code generation failed for', childId, codeErr);
          continue;
        }

        const { error: insertErr } = await supabase
          .from('montree_parent_invites')
          .insert({
            child_id: childId,
            invite_code: codeResult,
            expires_at: oneYearFromNow,
            is_active: true,
          });

        if (insertErr) {
          console.error('[parent-codes generate-all] insert failed for', childId, insertErr);
          continue;
        }
        createdCount += 1;
      } catch (err) {
        console.error('[parent-codes generate-all] loop error for', childId, err);
      }
    }

    return NextResponse.json({
      success: true,
      created: createdCount,
      total: children.length,
    });
  } catch (err) {
    console.error('[parent-codes generate-all] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 });
  }
}
