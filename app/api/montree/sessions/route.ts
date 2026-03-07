// /api/montree/sessions/route.ts
// Records work sessions - notes, observations, photo captures
// Data is linked by child_id so ALL teachers in classroom see it

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { verifyChildBelongsToSchool } from '@/lib/montree/verify-child-access';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

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

    const access = await verifyChildBelongsToSchool(child_id, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    if (!work_id && !work_name) {
      return NextResponse.json(
        { error: 'work_id or work_name required' },
        { status: 400 }
      );
    }
    
    const supabase = getSupabase();
    
    // Table schema (migration 060): id, child_id, work_id (NOT NULL), assignment_id,
    // session_type, duration_minutes, notes, media_urls, observed_at, created_at
    // Note: work_name, area, teacher_id, status columns do NOT exist in the table
    const insertRecord: Record<string, unknown> = {
      child_id,
      work_id: work_id || work_name || 'unknown',
      session_type: session_type || 'observation',
      notes: notes ? `${work_name ? `[${work_name}]${area ? ` (${area})` : ''} ` : ''}${notes}` : null,
      media_urls: media_urls || [],
      duration_minutes: duration_minutes || null,
      observed_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('montree_work_sessions')
      .insert(insertRecord)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error.message, error.code);
      return NextResponse.json(
        { error: 'Failed to save session' },
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
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

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

    const supabase = getSupabase();

    const access = await verifyChildBelongsToSchool(childId, auth.schoolId);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
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
      console.error('Error fetching sessions:', error.message, error.code);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
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
