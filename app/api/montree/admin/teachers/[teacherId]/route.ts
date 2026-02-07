// /api/montree/admin/teachers/[teacherId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// Update teacher (activate/deactivate)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { teacherId: string } }
) {
  try {
    const { teacherId } = params;
    const body = await request.json();
    const supabase = getSupabase();
    
    // SECURITY: Require authentication
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // SECURITY: Verify teacher belongs to authenticated school
    const { data: teacher } = await supabase
      .from('montree_teachers')
      .select('school_id')
      .eq('id', teacherId)
      .single();
    
    if (!teacher || teacher.school_id !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }
    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.email !== undefined) {
      updateData.email = body.email;
    }

    const { data, error } = await supabase
      .from('montree_teachers')
      .update(updateData)
      .eq('id', teacherId)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, teacher: data });
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
  }
}
