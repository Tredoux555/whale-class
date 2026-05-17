import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { resolveAuthorizedParent } from '@/lib/montree/verify-parent-request';


export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // 🚨 Session 113 V2 Parent audit F-1.1 — re-verify parent↔child link.
    const session = await resolveAuthorizedParent(supabase);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Full-account multi-child families: return all authorized children.
    // Invite-based sessions: single-element authorizedChildIds.
    const { data: children, error: childErr } = await supabase
      .from('montree_children')
      .select('id, name, nickname')
      .in('id', session.authorizedChildIds);

    if (childErr) {
      console.error('Get children error:', childErr.message);
      return NextResponse.json({ error: 'Failed to load children' }, { status: 500 });
    }

    const response = NextResponse.json({ children: children || [] });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error: unknown) {
    console.error('Get children error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
