// /api/montree/admin/students/search/route.ts
// Search students across all classrooms in a school — returns name, classroom, id
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;
    const schoolId = auth.schoolId;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().toLowerCase() || '';

    // Get all active classrooms for this school
    const { data: classrooms } = await supabase
      .from('montree_classrooms')
      .select('id, name, icon')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    const classroomIds = (classrooms || []).map(c => c.id);
    if (classroomIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const classroomMap = new Map((classrooms || []).map(c => [c.id, c]));

    // Get all active students in those classrooms
    const { data: students, error } = await supabase
      .from('montree_children')
      .select('id, name, photo_url, age, classroom_id')
      .in('classroom_id', classroomIds)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    // Filter by search query (client could do this too, but server-side is cleaner for large schools)
    const filtered = query
      ? (students || []).filter(s => s.name?.toLowerCase().includes(query))
      : (students || []);

    // Enrich with classroom info — critical for disambiguating duplicate names
    const enriched = filtered.map(s => {
      const classroom = classroomMap.get(s.classroom_id);
      return {
        id: s.id,
        name: s.name,
        photo_url: s.photo_url,
        age: s.age,
        classroom_id: s.classroom_id,
        classroom_name: classroom?.name || 'Unknown',
        classroom_icon: classroom?.icon || '🏫',
      };
    });

    return NextResponse.json({ students: enriched });
  } catch (error) {
    console.error('Student search error:', error);
    return NextResponse.json({ error: 'Failed to search students' }, { status: 500 });
  }
}
