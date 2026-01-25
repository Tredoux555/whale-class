// app/api/montree/admin/students/[id]/route.ts
// PATCH to update, DELETE to remove student

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// PATCH /api/montree/admin/students/[id] - Update student
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, date_of_birth, classroom_id } = body;

    const supabase = await createServerClient();

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name.trim();
    if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth || null;
    if (classroom_id !== undefined) updates.classroom_id = classroom_id;

    const { data: student, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update student error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ student });

  } catch (error) {
    console.error('Update student error:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

// DELETE /api/montree/admin/students/[id] - Remove student
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerClient();

    const { error } = await supabase
      .from('children')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete student error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete student error:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
