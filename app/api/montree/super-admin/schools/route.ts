// /api/montree/super-admin/schools/route.ts
// Session 105: Super Admin API - List all schools with stats
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    // Fetch all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('montree_schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (schoolsError) {
      console.error('Schools fetch error:', schoolsError);
      return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 });
    }

    // Fetch classroom counts per school
    const { data: classroomCounts } = await supabase
      .from('montree_classrooms')
      .select('school_id');

    // Fetch teacher counts per school
    const { data: teacherCounts } = await supabase
      .from('montree_teachers')
      .select('school_id');

    // Fetch student counts per school
    const { data: studentCounts } = await supabase
      .from('montree_children')
      .select('school_id');

    // Aggregate counts
    const schoolStats = (schools || []).map(school => {
      const classrooms = (classroomCounts || []).filter(c => c.school_id === school.id).length;
      const teachers = (teacherCounts || []).filter(t => t.school_id === school.id).length;
      const students = (studentCounts || []).filter(s => s.school_id === school.id).length;

      return {
        ...school,
        classroom_count: classrooms,
        teacher_count: teachers,
        student_count: students,
      };
    });

    return NextResponse.json({ schools: schoolStats });

  } catch (error) {
    console.error('Super admin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update school status (subscription tier)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { schoolId, subscription_tier, subscription_status, password } = body;

    // Verify super admin password
    if (password !== '870602') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    const updateData: any = {};
    if (subscription_tier) updateData.subscription_tier = subscription_tier;
    if (subscription_status) updateData.subscription_status = subscription_status;

    const { data, error } = await supabase
      .from('montree_schools')
      .update(updateData)
      .eq('id', schoolId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update school:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ School ${schoolId} updated:`, updateData);
    return NextResponse.json({ school: data });

  } catch (error) {
    console.error('Update school error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a school and all its data
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const password = searchParams.get('password');

    // Verify super admin password
    if (password !== '870602') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId required' }, { status: 400 });
    }

    console.log(`🗑️ Deleting school ${schoolId} and all related data...`);

    // Delete in order to respect foreign keys
    // 1. Delete student aliases
    await supabase.from('montree_student_aliases').delete().eq('school_id', schoolId);

    // 2. Delete children
    await supabase.from('montree_children').delete().eq('school_id', schoolId);

    // 3. Delete teachers
    await supabase.from('montree_teachers').delete().eq('school_id', schoolId);

    // 4. Delete curriculum imports
    await supabase.from('montree_curriculum_imports').delete().eq('school_id', schoolId);
    await supabase.from('montree_work_imports').delete().eq('school_id', schoolId);
    await supabase.from('montree_custom_curriculum').delete().eq('school_id', schoolId);

    // 5. Delete classrooms
    await supabase.from('montree_classrooms').delete().eq('school_id', schoolId);

    // 6. Delete school admins
    await supabase.from('montree_school_admins').delete().eq('school_id', schoolId);

    // 7. Finally delete the school
    const { error: schoolError } = await supabase
      .from('montree_schools')
      .delete()
      .eq('id', schoolId);

    if (schoolError) {
      console.error('Failed to delete school:', schoolError);
      return NextResponse.json({ error: schoolError.message }, { status: 500 });
    }

    console.log(`✅ School ${schoolId} deleted successfully`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete school error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
