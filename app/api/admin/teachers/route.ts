import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: teachers, error } = await supabase
      .from('simple_teachers')
      .select('*')
      .order('name');

    if (error) throw error;

    return NextResponse.json({ teachers: teachers || [] });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if teacher already exists
    const { data: existing } = await supabase
      .from('simple_teachers')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Teacher with this name already exists' }, { status: 400 });
    }

    // Create the teacher
    const { data: teacher, error } = await supabase
      .from('simple_teachers')
      .insert({
        name,
        password: '123', // Default password
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ teacher, success: true });
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ error: 'Failed to create teacher' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID required' }, { status: 400 });
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('simple_teachers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 });
  }
}
