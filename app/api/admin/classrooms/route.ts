import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdmin();
  const { searchParams } = new URL(request.url);
  const schoolId = searchParams.get('school_id');

  try {
    let query = supabase
      .from('classrooms')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }

    const { data: classrooms, error } = await query;
    if (error) throw error;

    // Get student counts per classroom
    const enriched = await Promise.all(
      (classrooms || []).map(async (c) => {
        const { count } = await supabase
          .from('classroom_children')
          .select('*', { count: 'exact', head: true })
          .eq('classroom_id', c.id)
          .eq('status', 'active');
        return { ...c, student_count: count || 0 };
      })
    );

    return NextResponse.json({ classrooms: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdmin();
  try {
    const { school_id, name, age_group, teacher_id } = await request.json();
    if (!school_id || !name) {
      return NextResponse.json({ error: 'school_id and name required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('classrooms')
      .insert({ school_id, name, age_group: age_group || '3-6', teacher_id, is_active: true })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ classroom: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
