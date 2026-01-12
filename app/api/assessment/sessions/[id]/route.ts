// app/api/assessment/sessions/[id]/route.ts
// Individual Assessment Session - GET, PATCH, DELETE

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

// Calculate level from percentage
function calculateLevel(percentage: number): string {
  if (percentage >= 80) return 'proficient';
  if (percentage >= 50) return 'developing';
  return 'emerging';
}

// GET - Get single session with all results
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sb = getSupabase();
    const { id } = await params;

    const { data, error } = await sb
      .from('assessment_sessions')
      .select(`
        *,
        assessment_results (
          id,
          skill_code,
          skill_name,
          skill_order,
          correct_count,
          total_count,
          percentage,
          level,
          items_data,
          started_at,
          completed_at,
          duration_seconds
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found' 
      }, { status: 404 });
    }

    // Sort results by skill_order
    if (data.assessment_results) {
      data.assessment_results.sort((a: any, b: any) => 
        (a.skill_order || 0) - (b.skill_order || 0)
      );
    }

    return NextResponse.json({ 
      success: true, 
      session: data 
    });
  } catch (error) {
    console.error('Assessment session GET error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch session' 
    }, { status: 500 });
  }
}

// PATCH - Update session (complete, abandon, update scores)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sb = getSupabase();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, any> = {};

    // Handle status change
    if (body.status) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
    }

    // Handle duration
    if (body.duration_seconds !== undefined) {
      updateData.duration_seconds = body.duration_seconds;
    }

    // Handle overall scores
    if (body.total_score !== undefined) updateData.total_score = body.total_score;
    if (body.total_possible !== undefined) updateData.total_possible = body.total_possible;
    
    // Calculate percentage and level if we have both scores
    if (body.total_score !== undefined && body.total_possible !== undefined && body.total_possible > 0) {
      const percentage = (body.total_score / body.total_possible) * 100;
      updateData.overall_percentage = Math.round(percentage * 100) / 100;
      updateData.overall_level = calculateLevel(percentage);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No update data provided' 
      }, { status: 400 });
    }

    const { data, error } = await sb
      .from('assessment_sessions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      session: data 
    });
  } catch (error) {
    console.error('Assessment session PATCH error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update session' 
    }, { status: 500 });
  }
}

// DELETE - Remove a session and its results (cascade)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sb = getSupabase();
    const { id } = await params;

    const { error } = await sb
      .from('assessment_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assessment session DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete session' 
    }, { status: 500 });
  }
}
