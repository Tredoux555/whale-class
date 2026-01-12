import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { childId, teacherId } = await request.json();

    if (!childId || !teacherId) {
      return NextResponse.json({ error: 'childId and teacherId are required' }, { status: 400 });
    }

    // Check if already assigned
    const { data: existing } = await supabase
      .from('teacher_children')
      .select('id')
      .eq('child_id', childId)
      .eq('teacher_id', teacherId)
      .single();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already assigned' });
    }

    // Create assignment
    const { error } = await supabase
      .from('teacher_children')
      .insert({
        child_id: childId,
        teacher_id: teacherId
      });

    if (error) {
      console.error('Error assigning student:', error);
      return NextResponse.json({ error: 'Failed to assign student' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assign student error:', error);
    return NextResponse.json({ error: 'Failed to assign student' }, { status: 500 });
  }
}
