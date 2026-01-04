import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = parseInt(searchParams.get('weekNumber') || '0');
    const year = parseInt(searchParams.get('year') || '') || new Date().getFullYear();

    if (!weekNumber || weekNumber < 1 || weekNumber > 52) {
      return NextResponse.json({ error: 'Invalid week number' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { data: documents, error } = await supabase
      .from('lesson_documents')
      .select('*')
      .eq('week_number', weekNumber)
      .eq('year', year)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      weekNumber,
      year
    });

  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
