import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    
    supabase = createClient(url, key);
  }
  return supabase;
}

// GET - Fetch attendance records
export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const date = searchParams.get('date');

    let query = sb
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
  } catch (e) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

// POST - Mark attendance
export async function POST(request: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await request.json();
    const { child_id, status, check_in_time, notes, marked_by } = body;
    const date = body.attendance_date || new Date().toISOString().split('T')[0];

    if (!child_id || !status) {
      return NextResponse.json({ error: 'child_id and status required' }, { status: 400 });
    }

    const { data, error } = await sb
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
  } catch (e) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
