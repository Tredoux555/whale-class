import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekNumber = searchParams.get('weekNumber');
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    if (!weekNumber) {
      return NextResponse.json({ success: false, error: 'weekNumber required' });
    }

    const { data, error } = await getSupabase()
      .from('lesson_documents')
      .select('*')
      .eq('week_number', parseInt(weekNumber))
      .eq('year', parseInt(year))
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, documents: data || [] });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch documents' });
  }
}
