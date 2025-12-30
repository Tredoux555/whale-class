import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// GET - fetch assignments for a week
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const url = new URL(request.url);
    const week = parseInt(url.searchParams.get('week') || '0');
    const year = parseInt(url.searchParams.get('year') || '2025');

    const { data, error } = await supabase
      .from('weekly_assignments')
      .select(`
        id,
        child_id,
        work_id,
        work_name,
        area,
        status,
        notes,
        children(name)
      `)
      .eq('week_number', week)
      .eq('year', year)
      .order('created_at');

    if (error) throw error;

    const assignments = (data || []).map(a => ({
      id: a.id,
      child_id: a.child_id,
      child_name: (a.children as any)?.name || 'Unknown',
      work_id: a.work_id,
      work_name: a.work_name,
      area: a.area,
      status: a.status || 'not_started',
      notes: a.notes
    }));

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Failed to fetch assignments:', error);
    return NextResponse.json({ assignments: [] });
  }
}


// POST - create new assignment
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { week, year, child_id, work_id, work_name, area } = body;

    if (!child_id || !work_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('weekly_assignments')
      .insert({
        week_number: week,
        year: year,
        child_id: child_id,
        work_id: work_id || null,
        work_name: work_name,
        area: area || 'practical_life',
        status: 'not_started'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ assignment: data });
  } catch (error) {
    console.error('Failed to create assignment:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}
