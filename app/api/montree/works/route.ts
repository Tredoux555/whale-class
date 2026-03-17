import { NextRequest, NextResponse } from 'next/server';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getSupabase } from '@/lib/supabase-client';

// GET /api/montree/works — returns all curriculum works for the teacher's classroom
// Used by PhotoEditModal for manual work assignment
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const classroomId = auth.classroomId;

    if (!classroomId) {
      return NextResponse.json({ works: [], warning: 'No classroom found' });
    }

    // Fetch all active works from classroom curriculum with area info
    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .select(`
        id, work_key, name, name_chinese, description, area_id, sequence,
        area:montree_classroom_curriculum_areas!area_id (
          id, area_key, name, name_chinese, icon, color
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('sequence');

    if (error) {
      console.error('[works] DB error:', error);
      return NextResponse.json({ works: [], error: 'Failed to fetch works' });
    }

    const works = (data || []).map(w => {
      // Supabase join can return object or array — normalize
      const area = Array.isArray(w.area) ? w.area[0] : w.area;
      return {
        id: w.id,
        work_key: w.work_key,
        name: w.name,
        chinese_name: w.name_chinese,
        description: w.description,
        area: area?.area_key || 'unknown',
        area_name: area?.name || 'Unknown',
        area_color: area?.color || '#666',
        sequence: w.sequence,
      };
    });

    return NextResponse.json({ works, total: works.length }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' }
    });
  } catch (error) {
    console.error('[works] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
