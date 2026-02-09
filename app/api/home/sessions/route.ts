// /api/home/sessions/route.ts
// Records work sessions - notes, observations, photo captures

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      child_id,
      family_id,
      work_name,
      area,
      session_type,
      notes,
      media_urls,
      duration_minutes,
      status
    } = body;

    if (!child_id || !family_id) {
      return errorResponse('child_id and family_id required', undefined, 400);
    }

    if (!work_name) {
      return errorResponse('work_name required', undefined, 400);
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('home_sessions')
      .insert({
        child_id,
        family_id,
        work_name,
        area: area || null,
        session_type: session_type || 'observation',
        notes: notes || null,
        media_urls: media_urls || [],
        duration_minutes: duration_minutes || null,
        status: status || null,
        observed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error.message);
      return errorResponse('Failed to save session', { message: error.message });
    }

    return NextResponse.json({ success: true, session: data });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sessions API error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// GET sessions for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const familyId = searchParams.get('family_id');
    const workName = searchParams.get('work_name');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!childId || !familyId) {
      return errorResponse('child_id and family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    let query = supabase
      .from('home_sessions')
      .select('*')
      .eq('child_id', childId)
      .eq('family_id', familyId)
      .order('observed_at', { ascending: false })
      .limit(limit);

    if (workName) {
      query = query.eq('work_name', workName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sessions:', error.message);
      return errorResponse('Failed to fetch sessions', { message: error.message });
    }

    return NextResponse.json({ success: true, sessions: data || [] });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sessions GET error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// DELETE: Remove session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const familyId = searchParams.get('family_id');

    if (!id || !familyId) {
      return errorResponse('id and family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Verify session belongs to this family
    const { data: session, error: findError } = await supabase
      .from('home_sessions')
      .select('id')
      .eq('id', id)
      .eq('family_id', familyId)
      .single();

    if (findError || !session) {
      return errorResponse('Session not found', { message: findError?.message }, 404);
    }

    const { error } = await supabase
      .from('home_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete session:', error.message);
      return errorResponse('Failed to delete session', { message: error.message });
    }

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sessions DELETE error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// PATCH: Update session
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, family_id, ...updates } = body;

    if (!id || !family_id) {
      return errorResponse('id and family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Verify session belongs to family
    const { data: session, error: findError } = await supabase
      .from('home_sessions')
      .select('id')
      .eq('id', id)
      .eq('family_id', family_id)
      .single();

    if (findError || !session) {
      return errorResponse('Session not found', { message: findError?.message }, 404);
    }

    const { data, error } = await supabase
      .from('home_sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update session:', error.message);
      return errorResponse('Failed to update session', { message: error.message });
    }

    return NextResponse.json({ success: true, session: data });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Sessions PATCH error:', message);
    return errorResponse('Internal server error', { message });
  }
}
