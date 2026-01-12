// app/api/assessment/results/route.ts
// Assessment Results API - Save skill results

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

// POST - Save a skill result
export async function POST(request: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await request.json();

    const {
      session_id,
      skill_code,
      skill_name,
      skill_order,
      correct_count,
      total_count,
      items_data,
      started_at,
      completed_at,
      duration_seconds
    } = body;

    // Validate required fields
    if (!session_id || !skill_code || !skill_name) {
      return NextResponse.json({
        success: false,
        error: 'session_id, skill_code, and skill_name are required'
      }, { status: 400 });
    }

    // Calculate percentage and level
    const percentage = total_count > 0 
      ? Math.round((correct_count / total_count) * 10000) / 100 
      : 0;
    const level = calculateLevel(percentage);

    const { data, error } = await sb
      .from('assessment_results')
      .insert({
        session_id,
        skill_code,
        skill_name,
        skill_order,
        correct_count: correct_count || 0,
        total_count: total_count || 0,
        percentage,
        level,
        items_data: items_data || [],
        started_at,
        completed_at,
        duration_seconds
      })
      .select()
      .single();

    if (error) throw error;

    // Also update the session's running totals
    await updateSessionTotals(sb, session_id);

    return NextResponse.json({
      success: true,
      result: data
    });
  } catch (error) {
    console.error('Assessment results POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save result'
    }, { status: 500 });
  }
}

// Helper: Update session totals after adding a result
async function updateSessionTotals(sb: SupabaseClient, sessionId: string) {
  try {
    // Get all results for this session
    const { data: results, error: fetchError } = await sb
      .from('assessment_results')
      .select('correct_count, total_count')
      .eq('session_id', sessionId);

    if (fetchError) throw fetchError;
    if (!results || results.length === 0) return;

    // Calculate totals
    const totalScore = results.reduce((sum, r) => sum + (r.correct_count || 0), 0);
    const totalPossible = results.reduce((sum, r) => sum + (r.total_count || 0), 0);
    const percentage = totalPossible > 0 
      ? Math.round((totalScore / totalPossible) * 10000) / 100 
      : 0;
    const level = calculateLevel(percentage);

    // Update session
    await sb
      .from('assessment_sessions')
      .update({
        total_score: totalScore,
        total_possible: totalPossible,
        overall_percentage: percentage,
        overall_level: level
      })
      .eq('id', sessionId);

  } catch (error) {
    console.error('Error updating session totals:', error);
    // Don't throw - this is a secondary operation
  }
}

// GET - Get results for a session (optional, mainly for debugging)
export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'session_id is required'
      }, { status: 400 });
    }

    const { data, error } = await sb
      .from('assessment_results')
      .select('*')
      .eq('session_id', sessionId)
      .order('skill_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      results: data
    });
  } catch (error) {
    console.error('Assessment results GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch results'
    }, { status: 500 });
  }
}
