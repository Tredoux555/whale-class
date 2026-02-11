import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { getSchoolIdFromRequest } from '@/lib/montree/verify-request';

export async function GET(request: NextRequest) {
  try {
    // Authentication: check cookie/Bearer token first, fall back to headers
    const auth = await getSchoolIdFromRequest(request);
    const schoolId = auth?.schoolId || request.headers.get('x-school-id');
    const classroomId = request.headers.get('x-classroom-id');

    if (!schoolId && !classroomId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getSupabase();
    let query = supabase
      .from('weekly_plans')
      .select('*');

    // Filter by school or classroom
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    if (classroomId) {
      query = query.eq('classroom_id', classroomId);
    }

    const { data: plans, error } = await query
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ plans: plans || [] });
  } catch (error) {
    console.error('Failed to fetch plans:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
