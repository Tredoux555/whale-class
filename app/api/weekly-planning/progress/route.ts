import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

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
      console.error('Progress update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Failed to update progress:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
