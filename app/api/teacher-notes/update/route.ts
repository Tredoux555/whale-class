import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const body = await request.json();
    
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing note ID' 
      }, { status: 400 });
    }

    // Only allow certain fields to be updated
    const allowedFields = ['note_text', 'priority', 'is_pinned', 'is_resolved'];
    const safeUpdates: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (field in updates) {
        safeUpdates[field] = updates[field];
      }
    }

    safeUpdates.updated_at = new Date().toISOString();

    const { data: note, error } = await supabase
      .from('teacher_notes')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating note:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      note
    });

  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update note' 
    }, { status: 500 });
  }
}
