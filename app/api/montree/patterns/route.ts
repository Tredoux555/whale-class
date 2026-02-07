// app/api/montree/patterns/route.ts
// Child patterns CRUD

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// GET: List patterns for a child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');
    const activeOnly = searchParams.get('active_only') !== 'false';

    if (!childId) {
      return NextResponse.json(
        { success: false, error: 'child_id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    let query = supabase
      .from('montree_child_patterns')
      .select('*')
      .eq('child_id', childId)
      .order('detected_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('still_active', true);
    }

    const { data: patterns, error } = await query;

    if (error) {
      console.error('Failed to fetch patterns:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch patterns' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      patterns: patterns || [],
    });

  } catch (error) {
    console.error('Patterns GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update pattern (mark inactive, add notes)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, still_active, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const updateData: Record<string, unknown> = {};
    if (typeof still_active === 'boolean') updateData.still_active = still_active;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('montree_child_patterns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update pattern:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update pattern' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pattern: data,
    });

  } catch (error) {
    console.error('Patterns PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
