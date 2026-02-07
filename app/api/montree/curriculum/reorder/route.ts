// /api/montree/curriculum/reorder/route.ts
// Bulk reorder works within an area

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

interface ReorderItem {
  id: string;
  sequence: number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { classroom_id, area_id, items } = body as {
      classroom_id: string;
      area_id: string;
      items: ReorderItem[];
    };

    if (!classroom_id || !area_id || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'classroom_id, area_id, and items array required' },
        { status: 400 }
      );
    }

    // Validate classroom exists
    const { data: classroom, error: classroomError } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', classroom_id)
      .single();

    if (classroomError || !classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Update each work's sequence
    const updates = items.map(item =>
      supabase
        .from('montree_classroom_curriculum_works')
        .update({
          sequence: item.sequence,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
        .eq('classroom_id', classroom_id)
        .eq('area_id', area_id)
    );

    // Execute all updates
    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Reorder errors:', errors.map(e => e.error));
      return NextResponse.json(
        { error: 'Some updates failed', details: errors.length },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: items.length,
      message: `Reordered ${items.length} works in ${area_id}`
    });

  } catch (error) {
    console.error('Curriculum reorder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
