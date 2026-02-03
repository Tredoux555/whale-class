// /api/montree/curriculum/update/route.ts
// Update a classroom's curriculum work

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
    const body = await request.json();
    const { work_id, ...updates } = body;

    if (!work_id) {
      return NextResponse.json({ error: 'work_id required' }, { status: 400 });
    }

    // Build update object - only include provided fields
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.name_chinese !== undefined) updateData.name_chinese = updates.name_chinese;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.parent_description !== undefined) updateData.parent_description = updates.parent_description;
    if (updates.why_it_matters !== undefined) updateData.why_it_matters = updates.why_it_matters;
    if (updates.age_range !== undefined) updateData.age_range = updates.age_range;
    if (updates.direct_aims !== undefined) updateData.direct_aims = updates.direct_aims;
    if (updates.indirect_aims !== undefined) updateData.indirect_aims = updates.indirect_aims;
    if (updates.materials !== undefined) updateData.materials = updates.materials;
    if (updates.prerequisites !== undefined) updateData.prerequisites = updates.prerequisites;
    if (updates.teacher_notes !== undefined) updateData.teacher_notes = updates.teacher_notes;
    if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
    if (updates.sequence !== undefined) updateData.sequence = updates.sequence;

    const { data, error } = await supabase
      .from('montree_classroom_curriculum_works')
      .update(updateData)
      .eq('id', work_id)
      .select()
      .single();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: 'Failed to update work' }, { status: 500 });
    }

    return NextResponse.json({ success: true, work: data });

  } catch (error) {
    console.error('Curriculum update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
