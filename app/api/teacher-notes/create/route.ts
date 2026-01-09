import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const body = await request.json();
    
    const { teacher_name, note_text, priority, week_number } = body;

    if (!teacher_name || !note_text) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const { data: note, error } = await supabase
      .from('teacher_notes')
      .insert({
        teacher_name,
        note_text,
        priority: priority || 'normal',
        week_number: week_number || null,
        year: new Date().getFullYear(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
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
    console.error('Create note error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create note' 
    }, { status: 500 });
  }
}
