// app/api/montree/parent/login/route.ts
// Session 116: Parent login
// Session 125: Fixed to use bcrypt

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/montree/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    
    const supabase = getSupabase();
    
    // 1. Find parent by email
    const { data: parent, error: parentError } = await supabase
      .from('montree_parents')
      .select(`
        id, name, email, password_hash, is_active, school_id,
        montree_schools!inner ( id, name )
      `)
      .eq('email', email.toLowerCase())
      .single();
    
    if (parentError || !parent) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    if (!parent.is_active) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 401 });
    }

    // 2. Verify password with bcrypt
    const validPassword = await bcrypt.compare(password, parent.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }
    
    // 3. Get parent's children
    const { data: links } = await supabase
      .from('montree_parent_children')
      .select(`
        child_id,
        montree_children!inner ( id, name,
          montree_classrooms!inner ( id, name )
        )
      `)
      .eq('parent_id', parent.id);
    
    const children = (links || []).map((link: any) => ({
      id: link.montree_children.id,
      name: link.montree_children.name,
      classroom_name: link.montree_children.montree_classrooms.name
    }));
    
    // 4. Update last login
    await supabase
      .from('montree_parents')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', parent.id);
    
    const school = parent.montree_schools as any;

    // 5. Return session
    return NextResponse.json({
      success: true,
      session: {
        parent: {
          id: parent.id,
          name: parent.name,
          email: parent.email
        },
        school: {
          id: school.id,
          name: school.name
        },
        children,
        loginAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Parent login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
