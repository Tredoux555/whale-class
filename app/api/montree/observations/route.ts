// app/api/montree/observations/route.ts
// Behavioral observations CRUD with ABC model

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// GET: List observations for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const days = parseInt(searchParams.get('days') || '30');

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Calculate date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: observations, error } = await supabase
      .from('montree_behavioral_observations')
      .select('*')
      .eq('child_id', childId)
      .gte('observed_at', cutoffDate.toISOString())
      .order('observed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch observations:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch observations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      observations: observations || [],
    });

  } catch (error) {
    console.error('Observations GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create new observation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      child_id,
      classroom_id,
      behavior_description,
      antecedent,
      behavior_function,
      consequence,
      time_of_day,
      activity_during,
      environmental_notes,
      intervention_used,
      effectiveness,
      observed_by,
    } = body;

    if (!child_id || !behavior_description) {
      return NextResponse.json(
        { success: false, error: 'child_id and behavior_description are required' },
        { status: 400 }
      );
    }

    // Validate behavior_function
    const validFunctions = ['attention', 'escape', 'sensory', 'tangible', 'unknown'];
    if (behavior_function && !validFunctions.includes(behavior_function)) {
      return NextResponse.json(
        { success: false, error: 'Invalid behavior_function' },
        { status: 400 }
      );
    }

    // Validate time_of_day
    const validTimes = ['arrival', 'morning_work', 'snack', 'outdoor', 'afternoon_work', 'dismissal'];
    if (time_of_day && !validTimes.includes(time_of_day)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time_of_day' },
        { status: 400 }
      );
    }

    // Validate effectiveness
    const validEffectiveness = ['effective', 'partially', 'ineffective', 'not_applicable'];
    if (effectiveness && !validEffectiveness.includes(effectiveness)) {
      return NextResponse.json(
        { success: false, error: 'Invalid effectiveness' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('montree_behavioral_observations')
      .insert({
        child_id,
        classroom_id,
        behavior_description,
        antecedent: antecedent || null,
        behavior_function: behavior_function || 'unknown',
        consequence: consequence || null,
        time_of_day: time_of_day || null,
        activity_during: activity_during || null,
        environmental_notes: environmental_notes || null,
        intervention_used: intervention_used || null,
        effectiveness: effectiveness || null,
        observed_by: observed_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create observation:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create observation' },
        { status: 500 }
      );
    }

    // Check if we should auto-detect patterns
    await detectPatterns(supabase, child_id);

    return NextResponse.json({
      success: true,
      observation: data,
    });

  } catch (error) {
    console.error('Observations POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Pattern detection helper
interface ObservationRow {
  behavior_function: string | null;
  time_of_day: string | null;
  behavior_description: string | null;
}

async function detectPatterns(supabase: Record<string, unknown>, childId: string) {
  try {
    // Get recent observations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: observations } = await supabase
      .from('montree_behavioral_observations')
      .select('behavior_function, time_of_day, behavior_description')
      .eq('child_id', childId)
      .gte('observed_at', thirtyDaysAgo.toISOString()) as { data: ObservationRow[] | null };

    if (!observations || observations.length < 3) return;

    // Count behavior functions
    const functionCounts: Record<string, number> = {};
    const timeCounts: Record<string, number> = {};

    for (const obs of observations) {
      if (obs.behavior_function) {
        functionCounts[obs.behavior_function] = (functionCounts[obs.behavior_function] || 0) + 1;
      }
      if (obs.time_of_day) {
        timeCounts[obs.time_of_day] = (timeCounts[obs.time_of_day] || 0) + 1;
      }
    }

    // Detect dominant function pattern
    const totalObs = observations.length;
    for (const [func, count] of Object.entries(functionCounts)) {
      if (count >= 3 && count / totalObs >= 0.5) {
        // Check if pattern already exists
        const { data: existing } = await supabase
          .from('montree_child_patterns')
          .select('id')
          .eq('child_id', childId)
          .eq('pattern_type', 'behavioral')
          .ilike('pattern_description', `%${func}%`)
          .eq('still_active', true)
          .single();

        if (!existing) {
          // Create new pattern
          await supabase.from('montree_child_patterns').insert({
            child_id: childId,
            pattern_type: 'behavioral',
            pattern_description: `Behaviors frequently serve ${func} function (${count} of ${totalObs} recent observations)`,
            evidence: `Auto-detected from ${count} observations with ${func} function`,
            confidence: count / totalObs >= 0.7 ? 'high' : 'medium',
            first_observed: new Date().toISOString().split('T')[0],
          });
        }
      }
    }

    // Detect time-of-day pattern
    for (const [time, count] of Object.entries(timeCounts)) {
      if (count >= 3 && count / totalObs >= 0.5) {
        const { data: existing } = await supabase
          .from('montree_child_patterns')
          .select('id')
          .eq('child_id', childId)
          .eq('pattern_type', 'behavioral')
          .ilike('pattern_description', `%${time.replace('_', ' ')}%`)
          .eq('still_active', true)
          .single();

        if (!existing) {
          await supabase.from('montree_child_patterns').insert({
            child_id: childId,
            pattern_type: 'behavioral',
            pattern_description: `Behavioral challenges concentrated during ${time.replace('_', ' ')} (${count} of ${totalObs} observations)`,
            evidence: `Auto-detected from ${count} observations during ${time.replace('_', ' ')}`,
            confidence: count / totalObs >= 0.7 ? 'high' : 'medium',
            first_observed: new Date().toISOString().split('T')[0],
          });
        }
      }
    }

  } catch (error) {
    console.error('Pattern detection error:', error);
    // Don't throw - pattern detection is best-effort
  }
}

// DELETE: Remove observation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('montree_behavioral_observations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete observation:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete observation' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Observations DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
