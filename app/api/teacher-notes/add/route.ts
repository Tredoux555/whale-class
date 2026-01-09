import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekNumber, year, teacherName, note } = body;

    if (!weekNumber || !teacherName || !note) {
      return NextResponse.json({ 
        error: 'Week number, teacher name, and note are required' 
      }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    
    const { data: newNote, error } = await supabase
      .from('teacher_notes')
      .insert({
        week_number: weekNumber,
        year: year || new Date().getFullYear(),
        teacher_name: teacherName,
        note: note.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding note:', error);
      return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, note: newNote });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
