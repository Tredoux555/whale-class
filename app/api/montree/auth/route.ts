// /api/montree/auth/route.ts
// Simple teacher authentication for Montree
// POST: { name: string, password: string } -> { success, teacher, classroom, school }

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();
    
    if (!name || !password) {
      return NextResponse.json(
        { success: false, error: 'Name and password required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Find teacher by name and password
    // For demo: plain text comparison
    // For production: use bcrypt
    const { data: teacher, error } = await supabase
      .from('montree_teachers')
      .select(`
        id,
        name,
        role,
        school_id,
        classroom_id,
        montree_schools!inner (
          id,
          name,
          slug
        ),
        montree_classrooms (
          id,
          name,
          age_group
        )
      `)
      .eq('name', name)
      .eq('password_hash', password)
      .eq('is_active', true)
      .single();
    
    if (error || !teacher) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Update last login
    await supabase
      .from('montree_teachers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', teacher.id);
    
    // Return teacher session data
    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        role: teacher.role,
      },
      school: teacher.montree_schools,
      classroom: teacher.montree_classrooms,
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
