// /api/home/progress/update/route.ts
// Session 155: Update work status for a child

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

const VALID_STATUSES = ['not_started', 'presented', 'practicing', 'mastered'];

export async function POST(request: NextRequest) {
  try {
    const { child_id, work_name, status } = await request.json();

    if (!child_id || !work_name) {
      return NextResponse.json({ error: 'child_id and work_name required' }, { status: 400 });
    }

    // Normalize status
    let normalizedStatus = status;
    if (normalizedStatus === 'completed') normalizedStatus = 'mastered';

    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const now = new Date().toISOString();

    // Build update object
    const updateData: Record<string, unknown> = {
      status: normalizedStatus,
      updated_at: now,
    };

    // Set timestamp for status transitions
    if (normalizedStatus === 'presented') {
      updateData.presented_at = now;
    }
    if (normalizedStatus === 'mastered') {
      updateData.mastered_at = now;
    }

    // Upsert progress record
    const { data: progress, error } = await supabase
      .from('home_progress')
      .update(updateData)
      .eq('child_id', child_id)
      .eq('work_name', work_name)
      .select()
      .single();

    if (error) {
      console.error('Failed to update progress:', error.message);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true, progress });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Progress update error:', err.message);
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
