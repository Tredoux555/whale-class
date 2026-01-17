// /api/montree/students/[id]/works/route.ts
// Get student's assigned works for the current week
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // Get student info
    const { data: student, error: studentError } = await supabase
      .from('children')
      .select('id, name')
      .eq('id', id)
      .single();

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get current week number
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
    const year = now.getFullYear();

    // Get student's weekly assignments
    const { data: assignments, error: assignError } = await supabase
      .from('weekly_assignments')
      .select(`
        id,
        work_id,
        work_name,
        work_name_chinese,
        area,
        progress_status,
        video_url
      `)
      .eq('child_id', id)
      .eq('week_number', weekNumber)
      .eq('year', year)
      .order('area');

    // Get media for this student
    const { data: media } = await supabase
      .from('child_media')
      .select('id, media_url, media_type, work_name')
      .eq('child_id', id)
      .order('created_at', { ascending: false })
      .limit(20);

    return NextResponse.json({
      student,
      works: assignments || [],
      media: media || [],
    });

  } catch (err) {
    console.error('Error fetching student works:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
