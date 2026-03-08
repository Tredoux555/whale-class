// app/api/montree/focus-works/batch/route.ts
// Batch endpoint: fetch ALL children + their focus works for a classroom
// Used by classroom-overview print page

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getChineseNameMap } from '@/lib/montree/curriculum-loader';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const classroomId = searchParams.get('classroom_id');

    if (!classroomId) {
      return NextResponse.json(
        { success: false, error: 'classroom_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify the classroom belongs to the authenticated user's school
    // auth.classroomId is optional in JWT (principals may not have one)
    // so verify via DB: classroom must belong to the same school
    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('school_id')
      .eq('id', classroomId)
      .single();

    if (!classroom || classroom.school_id !== auth.schoolId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // 1. Fetch all children in this classroom (sorted by name)
    const { data: children, error: childErr } = await supabase
      .from('montree_children')
      .select('id, name, photo_url')
      .eq('classroom_id', classroomId)
      .order('name', { ascending: true });

    if (childErr) {
      console.error('Batch focus-works: children query error:', childErr.message);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (!children || children.length === 0) {
      return NextResponse.json({
        success: true,
        children: [],
      });
    }

    const childIds = children.map(c => c.id);

    // 2. Fetch ALL focus works for all children in a single query
    const { data: allFocusWorks, error: fwErr } = await supabase
      .from('montree_child_focus_works')
      .select('child_id, area, work_name, set_at')
      .in('child_id', childIds);

    if (fwErr) {
      console.error('Batch focus-works: focus works query error:', fwErr.message);
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }

    // 3. Enrich with Chinese names
    const cnMap = getChineseNameMap();

    // 4. Group focus works by child_id
    const focusByChild: Record<string, Record<string, { name: string; chineseName: string | null }>> = {};
    for (const fw of allFocusWorks || []) {
      if (!focusByChild[fw.child_id]) focusByChild[fw.child_id] = {};
      focusByChild[fw.child_id][fw.area] = {
        name: fw.work_name,
        chineseName: fw.work_name ? cnMap.get(fw.work_name.toLowerCase().trim()) || null : null,
      };
    }

    // 5. Build response — each child with their focus works by area
    const result = children.map(child => ({
      id: child.id,
      name: child.name,
      photo_url: child.photo_url,
      focus_works: focusByChild[child.id] || {},
    }));

    return NextResponse.json({
      success: true,
      children: result,
    });

  } catch (error) {
    console.error('Batch focus-works error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
