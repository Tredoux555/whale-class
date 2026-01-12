// app/api/assessment/sessions/route.ts
// Assessment Sessions API - List and Create

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

// GET - List assessment sessions with optional filters
export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    
    const childId = searchParams.get('child_id');
    const classroomId = searchParams.get('classroom_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = sb
      .from('assessment_sessions')
      .select(`
        *,
        assessment_results (
          skill_code,
          skill_name,
          skill_order,
          correct_count,
          total_count,
          percentage,
          level
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (childId) query = query.eq('child_id', childId);
    if (classroomId) query = query.eq('classroom_id', classroomId);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      sessions: data,
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Assessment sessions GET error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch sessions' 
    }, { status: 500 });
  }
}

// POST - Create a new assessment session
export async function POST(request: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await request.json();
    
    const { 
      child_id, 
      child_name, 
      classroom_id, 
      teacher_id 
    } = body;

    // child_name is required (child_id is optional for unregistered children)
    if (!child_name) {
      return NextResponse.json({ 
        success: false, 
        error: 'child_name is required' 
      }, { status: 400 });
    }

    const { data, error } = await sb
      .from('assessment_sessions')
      .insert({
        child_id,
        child_name,
        classroom_id,
        teacher_id,
        started_at: new Date().toISOString(),
        status: 'in_progress'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      session: data 
    });
  } catch (error) {
    console.error('Assessment session POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create session' 
    }, { status: 500 });
  }
}
