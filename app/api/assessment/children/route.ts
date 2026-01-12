// app/api/assessment/children/route.ts
// Get children with their latest assessment scores

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

// GET - Get children with their assessment data
export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get children from children table
    const { data: children, error: childrenError } = await sb
      .from('children')
      .select('id, name, date_of_birth, active_status')
      .eq('active_status', true)
      .order('name')
      .limit(limit);

    if (childrenError) throw childrenError;

    if (!children || children.length === 0) {
      return NextResponse.json({
        success: true,
        children: []
      });
    }

    // Get the latest completed assessment for each child
    const childIds = children.map(c => c.id);
    
    const { data: sessions, error: sessionsError } = await sb
      .from('assessment_sessions')
      .select(`
        id,
        child_id,
        child_name,
        completed_at,
        overall_percentage,
        overall_level,
        total_score,
        total_possible
      `)
      .in('child_id', childIds)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    // Map latest session to each child
    const sessionsByChild: Record<string, any> = {};
    for (const session of sessions || []) {
      if (session.child_id && !sessionsByChild[session.child_id]) {
        sessionsByChild[session.child_id] = session;
      }
    }

    // Combine children with their latest assessment
    const childrenWithScores = children.map(child => ({
      ...child,
      latest_assessment: sessionsByChild[child.id] || null,
      assessment_count: (sessions || []).filter(s => s.child_id === child.id).length
    }));

    return NextResponse.json({
      success: true,
      children: childrenWithScores
    });
  } catch (error) {
    console.error('Assessment children GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch children'
    }, { status: 500 });
  }
}
