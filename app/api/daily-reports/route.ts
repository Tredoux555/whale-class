import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch reports (by child_id or date)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '30');

    let query = supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false })
      .limit(limit);

    if (childId) {
      query = query.eq('child_id', childId);
    }
    if (date) {
      query = query.eq('report_date', date);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, reports: data });
  } catch (error) {
    console.error('Error fetching daily reports:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reports' }, { status: 500 });
  }
}

// POST - Create or update report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      child_id,
      teacher_name,
      report_date,
      mood,
      activities_done,
      activities_notes,
      meals_eaten,
      nap_duration,
      highlights,
      notes,
      photo_url
    } = body;

    if (!child_id || !teacher_name) {
      return NextResponse.json({ success: false, error: 'child_id and teacher_name required' }, { status: 400 });
    }

    // Upsert - create or update if exists for same child+date
    const { data, error } = await supabase
      .from('daily_reports')
      .upsert({
        child_id,
        teacher_name,
        report_date: report_date || new Date().toISOString().split('T')[0],
        mood,
        activities_done: activities_done || [],
        activities_notes,
        meals_eaten,
        nap_duration,
        highlights,
        notes,
        photo_url,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'child_id,report_date'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, report: data });
  } catch (error) {
    console.error('Error saving daily report:', error);
    return NextResponse.json({ success: false, error: 'Failed to save report' }, { status: 500 });
  }
}

// DELETE - Remove a report
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Report ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('daily_reports')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting daily report:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete report' }, { status: 500 });
  }
}
