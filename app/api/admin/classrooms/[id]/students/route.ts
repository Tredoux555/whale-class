import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: classroomId } = await params;
  const supabase = createSupabaseAdmin();

  try {
    const body = await request.json();
    const { name, date_of_birth, photo_url, progress_levels } = body;

    if (!name || !date_of_birth) {
      return NextResponse.json({ error: 'Name and date of birth required' }, { status: 400 });
    }

    // Get classroom to find school_id and determine age_group
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('school_id, age_group')
      .eq('id', classroomId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Calculate age group from DOB
    const dob = new Date(date_of_birth);
    const ageInYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    let age_group = '3-4';
    if (ageInYears < 3) age_group = '2-3';
    else if (ageInYears < 4) age_group = '3-4';
    else if (ageInYears < 5) age_group = '4-5';
    else if (ageInYears < 6) age_group = '5-6';
    else age_group = '6-9';

    // Create child record
    const { data: child, error: childError } = await supabase
      .from('children')
      .insert({
        name,
        date_of_birth,
        photo_url: photo_url || null,
        age_group,
        school_id: classroom.school_id,
        practical_life_level: progress_levels?.practical_life || 0,
        sensorial_level: progress_levels?.sensorial || 0,
        math_level: progress_levels?.math || 0,
        language_level: progress_levels?.language || 0,
        cultural_level: progress_levels?.cultural || 0,
      })
      .select()
      .single();

    if (childError) throw childError;

    // Link to classroom
    const { error: linkError } = await supabase
      .from('classroom_children')
      .insert({
        classroom_id: classroomId,
        child_id: child.id,
        status: 'active'
      });

    if (linkError) throw linkError;

    return NextResponse.json({ child });
  } catch (error: any) {
    console.error('Error adding student:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
