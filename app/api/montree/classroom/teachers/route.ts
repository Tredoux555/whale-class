import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

// GET /api/montree/classroom/teachers?classroom_id=UUID
// Returns all teachers for the given classroom
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const classroomId = request.nextUrl.searchParams.get('classroom_id');
    if (!classroomId) {
      return NextResponse.json({ error: 'classroom_id is required' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify the classroom belongs to the authenticated user's school
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroomId)
      .maybeSingle();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    if (classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all teachers for this classroom
    const { data: teachers, error: teachersError } = await supabase
      .from('montree_teachers')
      .select('id, name, email, role, login_code, is_active, created_at')
      .eq('classroom_id', classroomId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (teachersError) {
      console.error('Failed to fetch teachers:', teachersError.message);
      return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
    }

    return NextResponse.json(
      { teachers: teachers || [] },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } }
    );
  } catch (error) {
    console.error('Classroom teachers GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/montree/classroom/teachers
// Add a new teacher to the classroom
export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { classroom_id, name } = body as { classroom_id?: string; name?: string };

    if (!classroom_id || typeof classroom_id !== 'string') {
      return NextResponse.json({ error: 'classroom_id is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (name.trim().length > 100) {
      return NextResponse.json({ error: 'Name too long (max 100 characters)' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verify classroom belongs to the school
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id, school_id')
      .eq('id', classroom_id)
      .maybeSingle();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    if (classroom.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Generate a unique 6-char login code
    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0/I/1 to avoid confusion
    let loginCode = '';
    for (let i = 0; i < 6; i++) {
      loginCode += charset[Math.floor(Math.random() * charset.length)];
    }

    // Hash the login code for password_hash (same SHA256 pattern as other teacher creation routes)
    const { legacySha256 } = await import('@/lib/montree/server-auth');

    const { data: teacher, error: insertError } = await supabase
      .from('montree_teachers')
      .insert({
        school_id: classroom.school_id,
        classroom_id: classroom_id,
        name: name.trim(),
        login_code: loginCode,
        password_hash: legacySha256(loginCode),
        role: 'teacher',
        is_active: true,
      })
      .select('id, name, login_code, role, created_at')
      .single();

    if (insertError) {
      // Login code collision — extremely rare, retry once
      if (insertError.code === '23505' && insertError.message?.includes('login_code')) {
        let retryCode = '';
        for (let i = 0; i < 6; i++) {
          retryCode += charset[Math.floor(Math.random() * charset.length)];
        }
        const { data: retryTeacher, error: retryError } = await supabase
          .from('montree_teachers')
          .insert({
            school_id: classroom.school_id,
            classroom_id: classroom_id,
            name: name.trim(),
            login_code: retryCode,
            password_hash: legacySha256(retryCode),
            role: 'teacher',
            is_active: true,
          })
          .select('id, name, login_code, role, created_at')
          .single();

        if (retryError) {
          console.error('Failed to create teacher (retry):', retryError.message);
          return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
        }

        return NextResponse.json({ teacher: retryTeacher }, { status: 201 });
      }

      console.error('Failed to create teacher:', insertError.message);
      return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
    }

    return NextResponse.json({ teacher }, { status: 201 });
  } catch (error) {
    console.error('Classroom teachers POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
