// /api/montree/dashboard/parent-codes/route.ts
// Teacher-scoped view — list children in the AUTH'D teacher's classroom with
// their active parent invite code (if any).
//
// Why a separate route from the admin one?
//   - Teacher JWTs may not have school-wide read intent encoded in product UX.
//   - Classroom scoping is the security boundary for teachers throughout the
//     app (see Session 84 cross-pollination contract).
//   - Principals call /api/montree/admin/parent-codes (school-wide).
//   - Teachers call this one (classroom-wide).

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Teachers and homeschool_parents only. Principal uses the admin route.
    if (auth.role !== 'teacher' && auth.role !== 'homeschool_parent') {
      return NextResponse.json(
        { error: 'Teacher access required for this view.' },
        { status: 403 }
      );
    }

    if (!auth.classroomId) {
      return NextResponse.json({ success: true, codes: [], classroom: null });
    }

    const supabase = getSupabase();

    // 1. Children in this teacher's classroom.
    const { data: children, error: childErr } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id')
      .eq('classroom_id', auth.classroomId)
      .eq('school_id', auth.schoolId) // belt + braces against JWT/data drift
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (childErr) {
      console.error('[dashboard parent-codes] children query failed:', childErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json({ success: true, codes: [] });
    }

    const childIds = children.map((c) => c.id);

    // 2. Latest active invite per child.
    const { data: invites, error: inviteErr } = await supabase
      .from('montree_parent_invites')
      .select('id, child_id, invite_code, used_at, used_by, expires_at, is_active, created_at')
      .in('child_id', childIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (inviteErr) {
      console.error('[dashboard parent-codes] invites query failed:', inviteErr);
      return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
    }

    const latestPerChild = new Map<string, typeof invites[number]>();
    for (const inv of invites || []) {
      if (!latestPerChild.has(inv.child_id)) {
        latestPerChild.set(inv.child_id, inv);
      }
    }

    // 3. Latest SENT weekly report per child (Jul 4 2026 — the per-child report
    // preview/publish flow lives on this Parents tab now). ONE batched query
    // mirroring the latest-per-child invite pattern above — never per-child
    // fetches. Non-fatal: a failure here must not take down the codes list.
    const lastReportPerChild = new Map<string, string>();
    // Build D2 (read receipt): the open timestamp of that SAME latest sent
    // report per child. Captured on the first-encountered (latest) row.
    const lastReportOpenedPerChild = new Map<string, string>();
    const { data: sentReports, error: reportErr } = await supabase
      .from('montree_weekly_reports')
      .select('child_id, sent_at, published_at, created_at, first_opened_at')
      .in('child_id', childIds)
      .eq('status', 'sent')
      .order('created_at', { ascending: false });
    if (reportErr) {
      console.error('[dashboard parent-codes] sent-reports query failed (non-fatal):', reportErr);
    } else {
      for (const rep of sentReports || []) {
        if (!lastReportPerChild.has(rep.child_id)) {
          lastReportPerChild.set(rep.child_id, rep.sent_at || rep.published_at || rep.created_at);
          if (rep.first_opened_at) {
            lastReportOpenedPerChild.set(rep.child_id, rep.first_opened_at);
          }
        }
      }
    }

    // 4. Linked parent per child (Jul 4 2026 — the Parents-tab "Chats" branch
    // deep-links each child to their parent conversation, which is keyed by
    // parent_id). ONE batched query; first linked parent wins. Non-fatal.
    const parentByChild = new Map<string, string>();
    const { data: parentLinks, error: linkErr } = await supabase
      .from('montree_parent_children')
      .select('parent_id, child_id')
      .in('child_id', childIds);
    if (linkErr) {
      console.error('[dashboard parent-codes] parent-children query failed (non-fatal):', linkErr);
    } else {
      for (const link of (parentLinks || []) as Array<{ parent_id: string | null; child_id: string | null }>) {
        if (link.child_id && link.parent_id && !parentByChild.has(link.child_id)) {
          parentByChild.set(link.child_id, link.parent_id);
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz';
    // Session 140: QR codes were hot-linked from api.qrserver.com (503s + not in
    // the CSP img-src allowlist). Generate locally as data: URLs with the
    // bundled `qrcode` lib — see admin/parent-codes route for the full note.
    const codes = await Promise.all(
      children.map(async (child) => {
        const inv = latestPerChild.get(child.id);
        const code = inv?.invite_code || null;
        const parentUrl = code ? `${baseUrl}/montree/parent?code=${code}` : null;
        let qr_url: string | null = null;
        if (parentUrl) {
          try {
            qr_url = await QRCode.toDataURL(parentUrl, { width: 240, margin: 1 });
          } catch {
            qr_url = null;
          }
        }
        return {
          child_id: child.id,
          child_name: child.name,
          classroom_id: child.classroom_id,
          invite_id: inv?.id || null,
          code,
          parent_url: parentUrl,
          qr_url,
          expires_at: inv?.expires_at || null,
          used: !!inv?.used_at,
          last_report_sent_at: lastReportPerChild.get(child.id) || null,
          last_report_opened_at: lastReportOpenedPerChild.get(child.id) || null,
          parent_id: parentByChild.get(child.id) || null,
        };
      })
    );

    return NextResponse.json(
      { success: true, codes },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err) {
    console.error('[dashboard parent-codes] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load parent codes' }, { status: 500 });
  }
}

// POST — generate a code for a single child. Idempotent: if the child already
// has an active code, return it (don't issue another).
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'teacher' && auth.role !== 'homeschool_parent') {
      return NextResponse.json({ error: 'Teacher access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const childId: string | undefined = body?.child_id;
    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Cross-pollination check — child must be in this teacher's classroom.
    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id, classroom_id, school_id, name')
      .eq('id', childId)
      .maybeSingle();
    if (childErr || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    if (child.school_id !== auth.schoolId || child.classroom_id !== auth.classroomId) {
      return NextResponse.json(
        { error: 'Child does not belong to your classroom.' },
        { status: 403 }
      );
    }

    // Existing active code?
    const { data: existing } = await supabase
      .from('montree_parent_invites')
      .select('id, invite_code, expires_at, used_at')
      .eq('child_id', childId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        success: true,
        invite: existing,
        already_active: true,
      });
    }

    // Generate fresh code via the canonical DB function.
    const { data: codeResult, error: codeErr } = await supabase.rpc(
      'generate_parent_invite_code'
    );
    if (codeErr || !codeResult) {
      console.error('[dashboard parent-codes POST] code generation failed', codeErr);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    const { data: invite, error: insertErr } = await supabase
      .from('montree_parent_invites')
      .insert({
        child_id: childId,
        invite_code: codeResult,
        created_by: auth.userId,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        // 🚨 DB default is max_uses=1, is_reusable=false (migration 096).
        // Parents need to log in repeatedly — must mirror /api/montree/invites.
        is_reusable: true,
        max_uses: null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[dashboard parent-codes POST] insert failed', insertErr);
      return NextResponse.json({ error: 'Failed to save code' }, { status: 500 });
    }

    return NextResponse.json({ success: true, invite, already_active: false });
  } catch (err) {
    console.error('[dashboard parent-codes POST] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to create code' }, { status: 500 });
  }
}

// PUT — reset (revoke + reissue) a code for a single child. Same authority
// + cross-pollination check.
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'teacher' && auth.role !== 'homeschool_parent') {
      return NextResponse.json({ error: 'Teacher access required.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const childId: string | undefined = body?.child_id;
    if (!childId) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id, classroom_id, school_id')
      .eq('id', childId)
      .maybeSingle();
    if (childErr || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    if (child.school_id !== auth.schoolId || child.classroom_id !== auth.classroomId) {
      return NextResponse.json(
        { error: 'Child does not belong to your classroom.' },
        { status: 403 }
      );
    }

    // Deactivate prior active codes for this child.
    await supabase
      .from('montree_parent_invites')
      .update({ is_active: false })
      .eq('child_id', childId)
      .eq('is_active', true);

    // New code.
    const { data: codeResult, error: codeErr } = await supabase.rpc(
      'generate_parent_invite_code'
    );
    if (codeErr || !codeResult) {
      console.error('[dashboard parent-codes PUT] code generation failed', codeErr);
      return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
    }

    const { data: invite, error: insertErr } = await supabase
      .from('montree_parent_invites')
      .insert({
        child_id: childId,
        invite_code: codeResult,
        created_by: auth.userId,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        // 🚨 DB default is max_uses=1, is_reusable=false (migration 096).
        // Parents need to log in repeatedly — must mirror /api/montree/invites.
        is_reusable: true,
        max_uses: null,
      })
      .select()
      .single();

    if (insertErr) {
      console.error('[dashboard parent-codes PUT] insert failed', insertErr);
      return NextResponse.json({ error: 'Failed to save code' }, { status: 500 });
    }

    return NextResponse.json({ success: true, invite });
  } catch (err) {
    console.error('[dashboard parent-codes PUT] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to reset code' }, { status: 500 });
  }
}
