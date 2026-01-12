import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch attendance records
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const childId = searchParams.get('child_id');
  const date = searchParams.get('date');

  let query = supabase
    .from('attendance')
    .select('*')
    .order('attendance_date', { ascending: false });

  if (childId) query = query.eq('child_id', childId);
  if (date) query = query.eq('attendance_date', date);

  const { data, error } = await query.limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attendance: data });
}

// POST - Mark attendance (upsert)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { child_id, status, check_in_time, notes, marked_by } = body;
  const date = body.attendance_date || new Date().toISOString().split('T')[0];

  if (!child_id || !status) {
    return NextResponse.json({ error: 'child_id and status required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('attendance')
    .upsert({
      child_id,
      attendance_date: date,
      status,
      check_in_time,
      notes,
      marked_by
    }, { onConflict: 'child_id,attendance_date' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ attendance: data });
}
