// app/api/montree/sessions/route.ts
// POST /api/montree/sessions - Log a work session (every interaction)
// GET /api/montree/sessions - Get sessions for a child (with filters)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// POST - Log a work session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      child_id, 
      work_id, 
      assignment_id,
      session_type = 'practice',
      duration_minutes,
      notes,
      media_urls = []
    } = body;

    if (!child_id || !work_id) {
      return NextResponse.json(
        { error: 'child_id and work_id are required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Insert session
    const { data: session, error } = await supabase
      .from('montree_work_sessions')
      .insert({
        child_id,
        work_id,
        assignment_id: assignment_id || null,
        session_type,
        duration_minutes: duration_minutes || null,
        notes: notes || null,
        media_urls,
        observed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Session insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      session 
    }, { status: 201 });

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { error: 'Failed to log session' },
      { status: 500 }
    );
  }
}

// GET - Fetch sessions for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const workId = searchParams.get('work_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    if (!childId) {
      return NextResponse.json(
        { error: 'child_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    let query = supabase
      .from('montree_work_sessions')
      .select(`
        *,
        work:montree_classroom_curriculum_works(
          id, name, name_chinese, area_id,
          area:montree_classroom_curriculum_areas(area_key, name)
        )
      `)
      .eq('child_id', childId)
      .order('observed_at', { ascending: false })
      .limit(limit);

    if (workId) {
      query = query.eq('work_id', workId);
    }

    if (fromDate) {
      query = query.gte('observed_at', fromDate);
    }

    if (toDate) {
      query = query.lte('observed_at', toDate);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Session fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions });

  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}
