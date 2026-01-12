import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '30');

    let query = sb.from('daily_reports').select('*').order('report_date', { ascending: false }).limit(limit);
    if (childId) query = query.eq('child_id', childId);
    if (date) query = query.eq('report_date', date);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, reports: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await request.json();
    const { child_id, teacher_name, report_date, mood, activities_done, activities_notes, meals_eaten, nap_duration, highlights, notes, photo_url } = body;

    if (!child_id || !teacher_name) {
      return NextResponse.json({ success: false, error: 'child_id and teacher_name required' }, { status: 400 });
    }

    const { data, error } = await sb.from('daily_reports').upsert({
      child_id, teacher_name,
      report_date: report_date || new Date().toISOString().split('T')[0],
      mood, activities_done: activities_done || [], activities_notes,
      meals_eaten, nap_duration, highlights, notes, photo_url,
      updated_at: new Date().toISOString()
    }, { onConflict: 'child_id,report_date' }).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const { error } = await sb.from('daily_reports').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
