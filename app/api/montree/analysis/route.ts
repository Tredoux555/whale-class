// app/api/montree/analysis/route.ts
// API for generating weekly child analysis
// GET: Get cached analysis for a child/week
// POST: Generate new analysis
// Session 126: Fixed to read env vars at runtime
// Updated: Now fetches FULL learning journey + notes from work_sessions

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeWeeklyProgress, WeeklyAnalysisResult } from '@/lib/montree/ai';

// Get supabase at runtime, not module load time
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// GET: Retrieve cached analysis
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const weekStart = searchParams.get('week_start');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    let query = supabase
      .from('montree_weekly_analysis')
      .select('*')
      .eq('child_id', childId)
      .order('week_start', { ascending: false });

    if (weekStart) {
      query = query.eq('week_start', weekStart);
    } else {
      query = query.limit(1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching analysis:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis: data?.[0] || null,
    });

  } catch (error) {
    console.error('Analysis GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Generate new analysis
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { child_id, week_start, week_end, force_regenerate } = body;

    if (!child_id || !week_start || !week_end) {
      return NextResponse.json(
        { success: false, error: 'child_id, week_start, and week_end are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Check for existing analysis
    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from('montree_weekly_analysis')
        .select('id, generated_at')
        .eq('child_id', child_id)
        .eq('week_start', week_start)
        .single();

      if (existing) {
        return NextResponse.json({
          success: true,
          message: 'Analysis already exists',
          analysis_id: existing.id,
          generated_at: existing.generated_at,
          cached: true,
        });
      }
    }

    // Fetch child data
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('id, name, date_of_birth, classroom_id')
      .eq('id', child_id)
      .single();

    if (childError || !child) {
      return NextResponse.json(
        { success: false, error: 'Child not found' },
        { status: 404 }
      );
    }

    // Fetch progress for the week
    const { data: progress, error: progressError } = await supabase
      .from('montree_child_progress')
      .select('*')
      .eq('child_id', child_id)
      .gte('created_at', week_start)
      .lte('created_at', week_end + 'T23:59:59');

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    // Fetch FULL historical progress (entire learning journey, not just 4 weeks)
    // This allows the AI to think like a teacher who's known the child for years
    const { data: historicalProgress } = await supabase
      .from('montree_child_progress')
      .select('work_name, area, status, created_at, notes')
      .eq('child_id', child_id)
      .lt('created_at', week_start)
      .order('created_at', { ascending: true }); // Chronological order

    // Fetch ALL teacher observations/notes from work_sessions
    // These contain detailed observations that aren't in progress records
    const { data: workSessions } = await supabase
      .from('montree_work_sessions')
      .select('work_name, area, notes, observed_at, session_type, duration_minutes')
      .eq('child_id', child_id)
      .order('observed_at', { ascending: true });

    // Create a map of notes by work_name for easy lookup
    const notesByWork: Record<string, string[]> = {};
    for (const session of workSessions || []) {
      if (session.notes && session.work_name) {
        if (!notesByWork[session.work_name]) {
          notesByWork[session.work_name] = [];
        }
        const dateStr = new Date(session.observed_at).toLocaleDateString();
        notesByWork[session.work_name].push(`[${dateStr}] ${session.notes}`);
      }
    }

    // Fetch available curriculum works
    const { data: curriculum } = await supabase
      .from('montree_classroom_curriculum_works')
      .select('id, name, area, sequence_order')
      .eq('classroom_id', child.classroom_id);

    // Run analysis with full learning journey data
    const analysisResult = analyzeWeeklyProgress({
      child: {
        id: child.id,
        name: child.name,
        date_of_birth: child.date_of_birth,
        classroom_id: child.classroom_id,
      },
      weekStart: week_start,
      weekEnd: week_end,
      // Current week's progress with merged notes from work_sessions
      progress: (progress || []).map(p => ({
        work_name: p.work_name,
        area: p.area,
        status: p.status,
        // Combine notes from progress record AND work_sessions
        notes: [
          p.notes,
          ...(notesByWork[p.work_name] || [])
        ].filter(Boolean).join('\n'),
        date: p.created_at,
        duration_minutes: p.duration_minutes,
        repetition_count: p.repetition_count,
      })),
      // FULL historical progress (entire learning journey)
      historicalProgress: (historicalProgress || []).map(p => ({
        work_name: p.work_name,
        area: p.area,
        status: p.status,
        date: p.created_at,
        // Include historical notes too
        notes: [
          p.notes,
          ...(notesByWork[p.work_name] || [])
        ].filter(Boolean).join('\n'),
      })),
      // All work sessions for detailed observation history
      observationHistory: (workSessions || []).map(s => ({
        work_name: s.work_name,
        area: s.area,
        notes: s.notes,
        date: s.observed_at,
        session_type: s.session_type,
        duration_minutes: s.duration_minutes,
      })),
      availableWorks: (curriculum || []).map(w => ({
        id: w.id,
        name: w.name,
        area: w.area,
        sequence_order: w.sequence_order,
      })),
    });

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from('montree_weekly_analysis')
      .upsert({
        child_id,
        classroom_id: child.classroom_id,
        week_start,
        week_end,
        area_distribution: analysisResult.area_distribution,
        expected_distribution: analysisResult.expected_distribution,
        total_works_count: analysisResult.total_works,
        avg_duration_minutes: analysisResult.avg_duration_minutes,
        expected_duration_minutes: analysisResult.expected_duration_minutes,
        concentration_score: analysisResult.concentration_score,
        repetition_patterns: analysisResult.repetition_highlights,
        avoidance_patterns: analysisResult.areas_needing_attention,
        breakthrough_indicators: [],
        active_sensitive_periods: analysisResult.detected_sensitive_periods.map(p => p.period_id),
        sensitive_period_evidence: analysisResult.detected_sensitive_periods,
        red_flags: analysisResult.red_flags,
        yellow_flags: analysisResult.yellow_flags,
        recommended_works: analysisResult.recommended_works,
        teacher_summary: analysisResult.teacher_summary,
        parent_summary: analysisResult.parent_summary,
        psychological_profile: analysisResult.psychological_profile,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'child_id,week_start',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      // Return the analysis even if save failed
      return NextResponse.json({
        success: true,
        analysis: analysisResult,
        saved: false,
        save_error: saveError.message,
      });
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      analysis_id: saved?.id,
      saved: true,
    });

  } catch (error) {
    console.error('Analysis POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
