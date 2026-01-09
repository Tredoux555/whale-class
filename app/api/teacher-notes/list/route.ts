import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = parseInt(searchParams.get('weekNumber') || '0');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    if (!weekNumber) {
      return NextResponse.json({ error: 'Week number required' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    
    const { data: notes, error } = await supabase
      .from('teacher_notes')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('year', year)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
    }

    return NextResponse.json({ success: true, notes: notes || [] });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
