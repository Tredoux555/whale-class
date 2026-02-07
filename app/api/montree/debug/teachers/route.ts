// /api/montree/debug/teachers/route.ts
// Debug endpoint to check teacher login codes
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  // If code provided, search for it
  if (code) {
    const { data: teacher, error } = await supabase
      .from('montree_teachers')
      .select(`
        id, name, login_code, is_active, created_at,
        montree_schools(name),
        montree_classrooms(name)
      `)
      .eq('login_code', code.toLowerCase())
      .single();

    return NextResponse.json({
      searchedCode: code.toLowerCase(),
      found: !!teacher,
      teacher: teacher || null,
      error: error?.message || null,
    });
  }

  // Otherwise list all teachers
  const { data: teachers, error } = await supabase
    .from('montree_teachers')
    .select(`
      id, name, login_code, is_active, created_at,
      montree_schools(name),
      montree_classrooms(name)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  return NextResponse.json({
    count: teachers?.length || 0,
    teachers: teachers || [],
    error: error?.message || null,
  });
}
