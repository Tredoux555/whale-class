// app/api/montree/children/[childId]/profile/route.ts
// Child mental profile CRUD

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

interface RouteContext {
  params: Promise<{ childId: string }>;
}

// GET: Fetch child's mental profile
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { childId } = await context.params;

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Fetch profile
    const { data: profile, error } = await supabase
      .from('montree_child_mental_profiles')
      .select('*')
      .eq('child_id', childId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Failed to fetch profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: profile || null,
    });

  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT: Create or update mental profile
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { childId } = await context.params;
    const body = await request.json();

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Build profile data from body
    const profileData = {
      child_id: childId,
      // Temperament
      temperament_activity_level: body.temperament_activity_level || null,
      temperament_regularity: body.temperament_regularity || null,
      temperament_initial_reaction: body.temperament_initial_reaction || null,
      temperament_adaptability: body.temperament_adaptability || null,
      temperament_intensity: body.temperament_intensity || null,
      temperament_mood_quality: body.temperament_mood_quality || null,
      temperament_distractibility: body.temperament_distractibility || null,
      temperament_persistence: body.temperament_persistence || null,
      temperament_sensory_threshold: body.temperament_sensory_threshold || null,
      // Learning modality
      learning_modality_visual: body.learning_modality_visual || null,
      learning_modality_auditory: body.learning_modality_auditory || null,
      learning_modality_kinesthetic: body.learning_modality_kinesthetic || null,
      // Focus
      baseline_focus_minutes: body.baseline_focus_minutes || null,
      optimal_time_of_day: body.optimal_time_of_day || null,
      // Sensitive periods
      sensitive_period_order: body.sensitive_period_order || 'active',
      sensitive_period_language: body.sensitive_period_language || 'active',
      sensitive_period_movement: body.sensitive_period_movement || 'active',
      sensitive_period_sensory: body.sensitive_period_sensory || 'active',
      sensitive_period_small_objects: body.sensitive_period_small_objects || 'active',
      sensitive_period_grace_courtesy: body.sensitive_period_grace_courtesy || 'not_started',
      // Context
      family_notes: body.family_notes || null,
      sleep_status: body.sleep_status || 'normal',
      special_considerations: body.special_considerations || null,
      // Strategies
      successful_strategies: body.successful_strategies || [],
      challenging_triggers: body.challenging_triggers || [],
      // Metadata
      updated_by: body.updated_by || null,
    };

    // Upsert profile
    const { data, error } = await supabase
      .from('montree_child_mental_profiles')
      .upsert(profileData, {
        onConflict: 'child_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save profile:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: data,
    });

  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
