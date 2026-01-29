// /api/montree/admin/teachers/route.ts
// CRUD for teachers + code regeneration
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function generateLoginCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// List teachers for school
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id') || request.headers.get('x-school-id');
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    // Get teachers with their classroom assignments
    const { data: teachers, error } = await supabase
      .from('montree_teachers')
      .select(`
        id, name, email, is_active, created_at,
        montree_teacher_classrooms (
          classroom_id,
          montree_classrooms ( id, name, icon )
        )
      `)
      .eq('school_id', schoolId)
      .order('name');

    if (error) throw error;

    // Transform to flatten classrooms
    const transformedTeachers = (teachers || []).map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      is_active: t.is_active,
      created_at: t.created_at,
      classrooms: (t.montree_teacher_classrooms || []).map((tc: any) => tc.montree_classrooms).filter(Boolean)
    }));

    return NextResponse.json({ teachers: transformedTeachers });
  } catch (error) {
    console.error('List teachers error:', error);
    return NextResponse.json({ error: 'Failed to list teachers' }, { status: 500 });
  }
}

// Create new teacher
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, email, classroom_id } = await request.json();
    
    const loginCode = generateLoginCode();
    const passwordHash = hashCode(loginCode);

    const { data: teacher, error } = await supabase
      .from('montree_teachers')
      .insert({
        school_id: schoolId,
        classroom_id,
        name,
        email: email || null,
        password_hash: passwordHash,
        role: 'teacher',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    // Return with plaintext code (only shown once!)
    return NextResponse.json({ 
      success: true, 
      teacher: { ...teacher, login_code: loginCode }
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}

// Update teacher
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, name, email, classroom_id, is_active, regenerate_code } = await request.json();

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (classroom_id !== undefined) updateData.classroom_id = classroom_id;
    if (is_active !== undefined) updateData.is_active = is_active;

    let newCode: string | null = null;
    if (regenerate_code) {
      newCode = generateLoginCode();
      updateData.password_hash = hashCode(newCode);
    }

    const { data: teacher, error } = await supabase
      .from('montree_teachers')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      teacher,
      new_login_code: newCode // Only returned if regenerated
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 });
  }
}

// Delete (soft delete) teacher
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('montree_teachers')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
  }
}
