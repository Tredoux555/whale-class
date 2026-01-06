import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { classroomId: string; childId: string } }
) {
  const supabase = createSupabaseAdmin();
  
  try {
    const { childId } = params;

    // Get child
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('id, name, date_of_birth, photo_url')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    // Calculate age
    const birth = new Date(child.date_of_birth);
    const now = new Date();
    const age = (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    // Get progress with work names
    const { data: progressData } = await supabase
      .from('child_work_progress')
      .select('id, work_id, status, mastered_date')
      .eq('child_id', childId)
      .gt('status', 0);

    const progress = [];
    for (const p of progressData || []) {
      const { data: work } = await supabase
        .from('curriculum_roadmap')
        .select('name, area')
        .eq('id', p.work_id)
        .single();
      if (work) {
        progress.push({
          id: p.id,
          work_name: work.name,
          area: work.area,
          status: p.status,
          mastered_date: p.mastered_date,
        });
      }
    }

    // Get photos (from child_work_media or child_photos)
    const { data: photos } = await supabase
      .from('child_work_media')
      .select('id, media_url, notes, work_name, taken_at')
      .eq('child_id', childId)
      .eq('media_type', 'photo')
      .order('taken_at', { ascending: false })
      .limit(20);

    const formattedPhotos = (photos || []).map((p) => ({
      id: p.id,
      photo_url: p.media_url,
      caption: p.notes,
      work_name: p.work_name,
      taken_at: p.taken_at,
    }));

    // Get reports
    const { data: reports } = await supabase
      .from('parent_reports')
      .select('id, title, content, period_start, period_end, status, created_at')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      child: { ...child, age },
      progress,
      photos: formattedPhotos,
      reports: reports || [],
    });
  } catch (error) {
    console.error('Failed to fetch child data:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
