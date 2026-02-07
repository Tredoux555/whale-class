// app/api/montree/parent/signup/route.ts
// Session 116: Parent signup with invite code
// Session 118: Added welcome email
// Session 125: Fixed to hash passwords with bcrypt

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { sendWelcomeEmail } from '@/lib/montree/email';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { invite_code, name, email, password } = await req.json();
    
    if (!invite_code || !name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    
    const supabase = getSupabase();
    
    // 1. Find and validate invite code
    const { data: invite, error: inviteError } = await supabase
      .from('montree_parent_invites')
      .select(`
        id, child_id, used_by, expires_at, is_active,
        montree_children!inner ( id, name, classroom_id,
          montree_classrooms!inner ( id, name, school_id,
            montree_schools!inner ( id, name )
          )
        )
      `)
      .eq('invite_code', invite_code.toUpperCase())
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
    }
    
    if (invite.used_by) {
      return NextResponse.json({ error: 'Invite code already used' }, { status: 400 });
    }
    
    if (!invite.is_active) {
      return NextResponse.json({ error: 'Invite code is no longer active' }, { status: 400 });
    }
    
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Invite code has expired' }, { status: 400 });
    }
    
    const child = invite.montree_children as any;
    const classroom = child.montree_classrooms;
    const school = classroom.montree_schools;
    
    // 2. Check if parent email already exists for this school
    const { data: existingParent } = await supabase
      .from('montree_parents')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('school_id', school.id)
      .single();
    
    if (existingParent) {
      return NextResponse.json({ error: 'Email already registered. Please login instead.' }, { status: 400 });
    }

    // 3. Create parent account with hashed password
    const password_hash = await bcrypt.hash(password, 10);
    
    const { data: newParent, error: parentError } = await supabase
      .from('montree_parents')
      .insert({
        school_id: school.id,
        email: email.toLowerCase(),
        password_hash,
        name: name.trim()
      })
      .select('id, name, email')
      .single();
    
    if (parentError || !newParent) {
      console.error('Parent creation failed:', parentError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
    
    // 4. Link parent to child
    const { error: linkError } = await supabase
      .from('montree_parent_children')
      .insert({
        parent_id: newParent.id,
        child_id: invite.child_id,
        relationship: 'parent'
      });
    
    if (linkError) {
      console.error('Parent-child link failed:', linkError);
    }

    // 5. Mark invite as used
    await supabase
      .from('montree_parent_invites')
      .update({ used_by: newParent.id, used_at: new Date().toISOString(), is_active: false })
      .eq('id', invite.id);
    
    // 6. Send welcome email (non-blocking)
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/montree/parent/dashboard`;
    sendWelcomeEmail(newParent.email, newParent.name, child.name, dashboardUrl)
      .catch(err => console.error('Welcome email failed:', err));
    
    // 7. Return session data
    return NextResponse.json({
      success: true,
      session: {
        parent: {
          id: newParent.id,
          name: newParent.name,
          email: newParent.email
        },
        school: {
          id: school.id,
          name: school.name
        },
        children: [{
          id: child.id,
          name: child.name,
          classroom_name: classroom.name
        }],
        loginAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Parent signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
