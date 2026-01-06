import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/students/[studentId] - Get student detail with progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    // Get student
    const { data: student, error: studentError } = await supabase
      .from('children')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;

    // Get classroom and school info
    const { data: classroomLink } = await supabase
      .from('classroom_children')
      .select('classroom_id, classrooms!inner(id, name, school_id, schools!inner(id, name))')
      .eq('child_id', studentId)
      .eq('status', 'active')
      .single();

    // Calculate age
    const birthDate = new Date(student.date_of_birth);
    const today = new Date();
    const age = (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    const studentWithDetails = {
      ...student,
      age: Math.round(age * 10) / 10,
      classroom_id: classroomLink?.classrooms?.id || null,
      classroom_name: classroomLink?.classrooms?.name || 'No classroom',
      school_id: (classroomLink?.classrooms as any)?.schools?.id || null,
      school_name: (classroomLink?.classrooms as any)?.schools?.name || 'No school',
    };

    // Get progress by area
    const { data: progressData } = await supabase
      .from('child_work_progress')
      .select('status, curriculum_roadmap!inner(area)')
      .eq('child_id', studentId);

    const areaProgress: Record<string, { presented: number; practicing: number; mastered: number; total: number }> = {};
    const areas = ['practical_life', 'sensorial', 'math', 'language', 'cultural'];
    
    // Initialize areas
    areas.forEach(area => {
      areaProgress[area] = { presented: 0, practicing: 0, mastered: 0, total: 0 };
    });

    // Count progress
    (progressData || []).forEach((p: any) => {
      const area = p.curriculum_roadmap?.area;
      if (area && areaProgress[area]) {
        areaProgress[area].total++;
        if (p.status === 1) areaProgress[area].presented++;
        else if (p.status === 2) areaProgress[area].practicing++;
        else if (p.status === 3) areaProgress[area].mastered++;
      }
    });

    // Get total works per area for context
    for (const area of areas) {
      const { count } = await supabase
        .from('curriculum_roadmap')
        .select('id', { count: 'exact' })
        .eq('area', area);
      areaProgress[area].total = count || 0;
    }

    const progress = areas.map(area => ({
      area,
      ...areaProgress[area],
    }));

    // Get recent works (last 10 updates)
    const { data: recentWorksData } = await supabase
      .from('child_work_progress')
      .select('id, status, updated_at, curriculum_roadmap!inner(name, area)')
      .eq('child_id', studentId)
      .order('updated_at', { ascending: false })
      .limit(10);

    const recentWorks = (recentWorksData || []).map((w: any) => ({
      id: w.id,
      work_name: w.curriculum_roadmap?.name,
      area: w.curriculum_roadmap?.area,
      status: w.status,
      status_name: ['Not Started', 'Presented', 'Practicing', 'Mastered'][w.status],
      updated_at: w.updated_at,
    }));

    // Get photos
    const { data: photos } = await supabase
      .from('child_photos')
      .select('id, photo_url, caption, taken_at, curriculum_roadmap(name)')
      .eq('child_id', studentId)
      .order('taken_at', { ascending: false })
      .limit(20);

    const photosFormatted = (photos || []).map((p: any) => ({
      id: p.id,
      photo_url: p.photo_url,
      caption: p.caption,
      work_name: p.curriculum_roadmap?.name,
      taken_at: p.taken_at,
    }));

    return NextResponse.json({
      student: studentWithDetails,
      progress,
      recentWorks,
      photos: photosFormatted,
    });
  } catch (error) {
    console.error('Failed to fetch student:', error);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}
