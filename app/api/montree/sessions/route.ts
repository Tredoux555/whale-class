// /api/montree/sessions/route.ts
// Records work sessions - notes, observations, photo captures
// Data is linked by child_id so ALL teachers in classroom see it

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      child_id, 
      work_id, 
      work_name, 
      area,
      session_type, 
      notes, 
      media_urls, 
      duration_minutes,
      teacher_id,
      status 
    } = body;
    
    if (!child_id) {
      return NextResponse.json(
        { error: 'child_id required' },
        { status: 400 }
      );
    }
    
    if (!work_id && !work_name) {
      return NextResponse.json(
        { error: 'work_id or work_name required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase
      .from('montree_work_sessions')
      .insert({
        child_id,
        work_id: work_id || null,
        work_name: work_name || null,
        area: area || null,
        session_type: session_type || 'observation',
        notes: notes || null,
        media_urls: media_urls || [],
        duration_minutes: duration_minutes || null,
        teacher_id: teacher_id || null,
        status: status || null,
        observed_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      return NextResponse.json(
        { error: 'Failed to save session', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, session: data });
    
  } catch (error) {
    console.error('Sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET sessions for a child (all teachers can see)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const workId = searchParams.get('work_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!childId) {
      return NextResponse.json(
        { error: 'child_id required' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    let query = supabase
      .from('montree_work_sessions')
      .select('*')
      .eq('child_id', childId)
      .order('observed_at', { ascending: false })
      .limit(limit);
    
    if (workId) {
      query = query.eq('work_id', workId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sessions', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ sessions: data || [] });
    
  } catch (error) {
    console.error('Sessions GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
