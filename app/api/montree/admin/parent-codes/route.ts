// /api/montree/admin/parent-codes/route.ts
// Principal view — list every child in the school with their active parent
// invite code (if any). Used by /montree/admin/parent-codes/page.tsx so the
// principal can see every parent code, share/print them, and know who's
// connected vs not.
//
// Authority: principal or super-admin only. Teachers use the classroom-scoped
// /api/montree/dashboard/parent-codes route.
//
// The list of "active" codes is sorted by created_at DESC then deduped to one
// per child — the most recently issued live code wins. Codes that have been
// used at least once still appear (so the principal can re-share if needed).

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    // Principals see school-wide. Teachers should use the dashboard route.
    if (auth.role !== 'principal') {
      return NextResponse.json(
        { error: 'Principal access required for this view.' },
        { status: 403 }
      );
    }

    const supabase = getSupabase();

    // 1. Fetch every active child in the school.
    const { data: children, error: childErr } = await supabase
      .from('montree_children')
      .select('id, name, classroom_id')
      .eq('school_id', auth.schoolId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (childErr) {
      console.error('[parent-codes] children query failed:', childErr);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    if (!children || children.length === 0) {
      return NextResponse.json({ success: true, codes: [] });
    }

    const childIds = children.map((c) => c.id);

    // 2. Fetch latest active invite per child.
    const { data: invites, error: inviteErr } = await supabase
      .from('montree_parent_invites')
      .select('id, child_id, invite_code, used_at, used_by, expires_at, is_active, created_at')
      .in('child_id', childIds)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (inviteErr) {
      console.error('[parent-codes] invites query failed:', inviteErr);
      return NextResponse.json({ error: 'Failed to load invites' }, { status: 500 });
    }

    // 3. Keep newest active invite per child.
    const latestPerChild = new Map<string, typeof invites[number]>();
    for (const inv of invites || []) {
      if (!latestPerChild.has(inv.child_id)) {
        latestPerChild.set(inv.child_id, inv);
      }
    }

    // 4. Compose response — one row per child, code may be null if never generated.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://montree.xyz';
    // Session 140: QR codes were hot-linked from api.qrserver.com, which both
    // returned 503 AND isn't in the CSP img-src allowlist — so every "Print
    // Cards" QR was broken. Generate them locally as data: URLs (CSP already
    // permits img-src 'data:') using the bundled `qrcode` lib. No external dep.
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
          code,
          parent_url: parentUrl,
          qr_url,
          expires_at: inv?.expires_at || null,
          used: !!inv?.used_at,
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
    console.error('[parent-codes] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load parent codes' }, { status: 500 });
  }
}
