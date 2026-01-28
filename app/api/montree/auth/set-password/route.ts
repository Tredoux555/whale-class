// /api/montree/auth/set-password/route.ts
// Set password for teacher (first-time setup)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await request.json();
    const { teacher_id, password, email } = body;
    
    if (!teacher_id || !password) {
      return NextResponse.json({ error: 'teacher_id and password required' }, { status: 400 });
    }
    
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    // Update teacher record
    const updateData: any = {
      password_hash,
      password_set_at: new Date().toISOString()
    };
    
    if (email) {
      updateData.email = email;
    }
    
    const { error } = await supabase
      .from('montree_teachers')
      .update(updateData)
      .eq('id', teacher_id);
    
    if (error) {
      console.error('Set password error:', error);
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Set password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
