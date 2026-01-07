import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');

  if (!childId) {
    return NextResponse.json({ error: 'child_id required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('home_children')
      .select('journal_entries')
      .eq('id', childId)
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      entries: data?.journal_entries || [] 
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching journal:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  try {
    const body = await request.json();
    const { child_id, entries } = body;

    if (!child_id) {
      return NextResponse.json({ error: 'child_id required' }, { status: 400 });
    }

    // Keep only last 100 entries to prevent bloat
    const trimmedEntries = (entries || []).slice(0, 100);

    const { error } = await supabase
      .from('home_children')
      .update({ 
        journal_entries: trimmedEntries,
        updated_at: new Date().toISOString()
      })
      .eq('id', child_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving journal:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
