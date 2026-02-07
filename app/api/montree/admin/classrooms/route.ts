// /api/montree/admin/classrooms/route.ts
// CRUD for classrooms
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// Create new classroom
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, icon, color } = await request.json();

    const { data: classroom, error } = await supabase
      .from('montree_classrooms')
      .insert({
        school_id: schoolId,
        name,
        icon: icon || '🏫',
        color: color || '#10B981',
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, classroom });
  } catch (error) {
    console.error('Create classroom error:', error);
    return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
  }
}

// Update classroom
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id, name, icon, color, is_active } = await request.json();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data: classroom, error } = await supabase
      .from('montree_classrooms')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, classroom });
  } catch (error) {
    console.error('Update classroom error:', error);
    return NextResponse.json({ error: 'Failed to update classroom' }, { status: 500 });
  }
}

// Delete (soft delete) classroom
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const schoolId = request.headers.get('x-school-id');
    if (!schoolId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Classroom ID required' }, { status: 400 });
    }

    // Soft delete - set is_active to false
    const { error } = await supabase
      .from('montree_classrooms')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('school_id', schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete classroom error:', error);
    return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 });
  }
}
