// /api/home/observations/route.ts
// Behavioral observations CRUD with ABC model (Antecedent, Behavior, Consequence)

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

// GET: List observations for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const familyId = searchParams.get('family_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const days = parseInt(searchParams.get('days') || '30');

    if (!childId || !familyId) {
      return errorResponse('child_id and family_id are required', undefined, 400);
    }

    const supabase = getSupabase();

    // Calculate date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data: observations, error } = await supabase
      .from('home_observations')
      .select('*')
      .eq('child_id', childId)
      .eq('family_id', familyId)
      .gte('observed_at', cutoffDate.toISOString())
      .order('observed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch observations:', error.message);
      return errorResponse('Failed to fetch observations', { message: error.message });
    }

    return NextResponse.json({
      success: true,
      observations: observations || [],
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Observations GET error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// POST: Create new observation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      child_id,
      family_id,
      observation_type,
      antecedent,
      behavior,
      consequence,
      context,
      area,
      work_name,
      notes,
      observed_at,
    } = body;

    if (!child_id || !family_id || !behavior) {
      return errorResponse('child_id, family_id, and behavior are required', undefined, 400);
    }

    // Validate observation_type if provided
    const validObservationTypes = ['general', 'work_related', 'social', 'independence', 'concentration'];
    if (observation_type && !validObservationTypes.includes(observation_type)) {
      return errorResponse('Invalid observation_type', undefined, 400);
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('home_observations')
      .insert({
        child_id,
        family_id,
        observation_type: observation_type || null,
        antecedent: antecedent || null,
        behavior,
        consequence: consequence || null,
        context: context || null,
        area: area || null,
        work_name: work_name || null,
        notes: notes || null,
        observed_at: observed_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create observation:', error.message);
      return errorResponse('Failed to create observation', { message: error.message });
    }

    return NextResponse.json({
      success: true,
      observation: data,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Observations POST error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// DELETE: Remove observation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const familyId = searchParams.get('family_id');

    if (!id || !familyId) {
      return errorResponse('id and family_id are required', undefined, 400);
    }

    const supabase = getSupabase();

    // Verify observation belongs to this family
    const { data: obs, error: findError } = await supabase
      .from('home_observations')
      .select('id')
      .eq('id', id)
      .eq('family_id', familyId)
      .single();

    if (findError || !obs) {
      return errorResponse('Observation not found', { message: findError?.message }, 404);
    }

    const { error } = await supabase
      .from('home_observations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete observation:', error.message);
      return errorResponse('Failed to delete observation', { message: error.message });
    }

    return NextResponse.json({ success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Observations DELETE error:', message);
    return errorResponse('Internal server error', { message });
  }
}

// PATCH: Update observation
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, family_id, ...updates } = body;

    if (!id || !family_id) {
      return errorResponse('id and family_id are required', undefined, 400);
    }

    // Validate observation_type if provided
    if (updates.observation_type) {
      const validObservationTypes = ['general', 'work_related', 'social', 'independence', 'concentration'];
      if (!validObservationTypes.includes(updates.observation_type)) {
        return errorResponse('Invalid observation_type', undefined, 400);
      }
    }

    const supabase = getSupabase();

    // Verify observation belongs to family
    const { data: obs, error: findError } = await supabase
      .from('home_observations')
      .select('id')
      .eq('id', id)
      .eq('family_id', family_id)
      .single();

    if (findError || !obs) {
      return errorResponse('Observation not found', { message: findError?.message }, 404);
    }

    const { data, error } = await supabase
      .from('home_observations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update observation:', error.message);
      return errorResponse('Failed to update observation', { message: error.message });
    }

    return NextResponse.json({ success: true, observation: data });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Observations PATCH error:', message);
    return errorResponse('Internal server error', { message });
  }
}
