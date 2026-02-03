import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    // Authentication: require x-school-id or x-classroom-id header
    const schoolId = request.headers.get('x-school-id');
    const classroomId = request.headers.get('x-classroom-id');

    if (!schoolId && !classroomId) {
      return NextResponse.json(
        { error: 'Unauthorized: x-school-id or x-classroom-id header required' },
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
