import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if teacher already exists
    const { data: existing } = await supabase
      .from('simple_teachers')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Teacher already exists' }, { status: 400 });
    }

    // Create new teacher
    const { data: teacher, error } = await supabase
      .from('simple_teachers')
      .insert({
        name: name.trim(),
        password_hash: '123', // Simple default password
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating teacher:', error);
      return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      teacher: {
        id: teacher.id,
        name: teacher.name
      }
    });
  } catch (error) {
    console.error('Add teacher error:', error);
    return NextResponse.json({ error: 'Failed to add teacher' }, { status: 500 });
  }
}
