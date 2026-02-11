import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { assignmentId, status } = await request.json();

    if (!assignmentId || !status) {
      return NextResponse.json({ error: 'assignmentId and status required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('weekly_assignments')
      .update({ progress_status: status, status: status })
      .eq('id', assignmentId);

    if (error) {
      console.error('Progress update error:', error.message, error.code);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to update progress:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
