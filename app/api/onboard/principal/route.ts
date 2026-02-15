// app/api/onboard/principal/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const {
      schoolName, country, timezone,
      classroomName, ageGroup,
      principalName, principalEmail, principalPassword
    } = await request.json();
    
    if (!schoolName || !classroomName || !principalName || !principalEmail || !principalPassword) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }
    
    const slug = schoolName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Check if exists
    const { data: existing } = await supabase.from('schools').select('id').eq('slug', slug).single();
    if (existing) {
      return NextResponse.json({ success: false, error: 'School name already exists' }, { status: 400 });
    }
    
    const { data: existingUser } = await supabase.from('users').select('id').eq('email', principalEmail.toLowerCase()).single();
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
    }
    
    // Create school
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: schoolName, slug, is_active: true,
        settings: { country: country || 'South Africa', timezone: timezone || 'Africa/Johannesburg' }
      })
      .select().single();
    if (schoolError) throw schoolError;
    
    // Create classroom (triggers curriculum clone)
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .insert({ school_id: school.id, name: classroomName, age_group: ageGroup || '3-6' })
      .select().single();
    if (classroomError) throw classroomError;
    
    // Create user
    const passwordHash = await bcrypt.hash(principalPassword, 10);
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        name: principalName, email: principalEmail.toLowerCase(),
        password_hash: passwordHash, role: 'school_admin',
        school_id: school.id, is_active: true
      })
      .select('id, name, email, role').single();
    if (userError) throw userError;
    
    // Get curriculum count
    const { count } = await supabase
      .from('classroom_curriculum')
      .select('id', { count: 'exact', head: true })
      .eq('classroom_id', classroom.id);
    
    return NextResponse.json({
      success: true,
      message: 'School created!',
      school: { id: school.id, name: school.name, slug: school.slug },
      classroom: { id: classroom.id, name: classroom.name, curriculumWorks: count || 0 },
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


