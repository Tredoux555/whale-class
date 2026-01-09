import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// One-time seed: Create Beijing International School + Whale classroom + link children
export async function POST() {
  const supabase = createSupabaseAdmin();

  try {
    // 1. Create or get Beijing International School
    let schoolId: string;
    const { data: existingSchool } = await supabase
      .from('schools')
      .select('id')
      .eq('slug', 'beijing-international')
      .single();

    if (existingSchool) {
      schoolId = existingSchool.id;
    } else {
      const { data: newSchool, error: schoolError } = await supabase
        .from('schools')
        .insert({ name: 'Beijing International School', slug: 'beijing-international', is_active: true })
        .select()
        .single();
      if (schoolError) throw schoolError;
      schoolId = newSchool.id;
    }

    // 2. Create or get Whale classroom
    let classroomId: string;
    const { data: existingClass } = await supabase
      .from('classrooms')
      .select('id')
      .eq('school_id', schoolId)
      .eq('name', '🐋 Whale')
      .single();

    if (existingClass) {
      classroomId = existingClass.id;
    } else {
      const { data: newClass, error: classError } = await supabase
        .from('classrooms')
        .insert({ school_id: schoolId, name: '🐋 Whale', age_group: '3-6', is_active: true })
        .select()
        .single();
      if (classError) throw classError;
      classroomId = newClass.id;
    }

    // 3. Get all existing children
    const { data: children } = await supabase.from('children').select('id');

    // 4. Link all children to Whale classroom (if not already linked)
    let linked = 0;
    for (const child of children || []) {
      const { data: existing } = await supabase
        .from('classroom_children')
        .select('id')
        .eq('classroom_id', classroomId)
        .eq('child_id', child.id)
        .single();

      if (!existing) {
        await supabase.from('classroom_children').insert({
          classroom_id: classroomId,
          child_id: child.id,
          status: 'active'
        });
        linked++;
      }
    }

    // 5. Update children with school_id
    await supabase.from('children').update({ school_id: schoolId }).is('school_id', null);

    return NextResponse.json({
      success: true,
      school_id: schoolId,
      classroom_id: classroomId,
      children_count: children?.length || 0,
      newly_linked: linked
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
