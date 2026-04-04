// app/api/montree/intelligence/paperwork/route.ts
// Paperwork week tracker — GET returns all children with their current week, POST advances a child's week

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const MAX_WEEK = 37;

// GET: Fetch all children with paperwork week data
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { data: children, error } = await supabase
      .from('montree_children')
      .select('id, name, photo_url, paperwork_current_week')
      .eq('classroom_id', auth.classroomId)
      .eq('active', true)
      .order('name');

    if (error) {
      console.error('[Paperwork] Fetch error:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch paperwork data' }, { status: 500 });
    }

    // Calculate target week from school year start (Aug 18, 2025 → week 1)
    // Each calendar week = 1 paperwork week
    const schoolYearStart = new Date(2025, 7, 18); // Aug 18, 2025 (month is 0-indexed)
    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const targetWeek = Math.min(MAX_WEEK, Math.max(1, Math.floor((now.getTime() - schoolYearStart.getTime()) / msPerWeek) + 1));

    const enriched = (children || []).map(child => {
      const week = child.paperwork_current_week || 1;
      const diff = targetWeek - week;
      const status = diff <= 0 ? 'on_track' : diff <= 2 ? 'slightly_behind' : 'behind';
      return {
        id: child.id,
        name: child.name,
        photo_url: child.photo_url,
        current_week: week,
        target_week: targetWeek,
        weeks_behind: Math.max(0, diff),
        status,
      };
    });

    const onTrack = enriched.filter(c => c.status === 'on_track').length;
    const total = enriched.length;

    return NextResponse.json({
      success: true,
      target_week: targetWeek,
      max_week: MAX_WEEK,
      on_track: onTrack,
      total,
      children: enriched,
    });
  } catch (error) {
    console.error('[Paperwork] GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Update a child's paperwork week
// Body: { child_id: string, action: 'advance' | 'set', week?: number }
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { child_id, action, week } = body;

    if (!child_id) {
      return NextResponse.json({ success: false, error: 'child_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify child belongs to this classroom
    const { data: child, error: childErr } = await supabase
      .from('montree_children')
      .select('id, paperwork_current_week, classroom_id')
      .eq('id', child_id)
      .maybeSingle();

    if (childErr || !child) {
      return NextResponse.json({ success: false, error: 'Child not found' }, { status: 404 });
    }

    if (child.classroom_id !== auth.classroomId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    let newWeek: number;
    if (action === 'set' && typeof week === 'number') {
      newWeek = Math.max(1, Math.min(MAX_WEEK, week));
    } else {
      // Default: advance by 1
      newWeek = Math.min(MAX_WEEK, (child.paperwork_current_week || 1) + 1);
    }

    const { error: updateErr } = await supabase
      .from('montree_children')
      .update({ paperwork_current_week: newWeek })
      .eq('id', child_id);

    if (updateErr) {
      console.error('[Paperwork] Update error:', updateErr);
      return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
    }

    return NextResponse.json({ success: true, child_id, new_week: newWeek });
  } catch (error) {
    console.error('[Paperwork] POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
