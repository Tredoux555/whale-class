import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/schools/[id]/classrooms - Create a classroom
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;
    const body = await request.json();
    const { name, age_group } = body;

    if (!name || !age_group) {
      return NextResponse.json(
        { error: 'Name and age_group are required' },
        { status: 400 }
      );
    }

    // Verify school exists
    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('id', schoolId)
      .single();

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    const { data: classroom, error } = await supabase
      .from('classrooms')
      .insert({
        school_id: schoolId,
        name,
        age_group,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ classroom });
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json(
      { error: 'Failed to create classroom' },
      { status: 500 }
    );
  }
}
