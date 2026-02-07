// app/api/montree/guru/followup/route.ts
// Update outcome of a Guru interaction

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

// PATCH: Update interaction outcome
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { interaction_id, outcome, follow_up_notes } = body;

    if (!interaction_id) {
      return NextResponse.json(
        { success: false, error: 'interaction_id is required' },
        { status: 400 }
      );
    }

    if (outcome && !['improved', 'no_change', 'worsened', 'ongoing', 'not_tracked'].includes(outcome)) {
      return NextResponse.json(
        { success: false, error: 'Invalid outcome value' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const updateData: Record<string, unknown> = {};
    if (outcome) updateData.outcome = outcome;
    if (follow_up_notes !== undefined) updateData.follow_up_notes = follow_up_notes;

    const { data, error } = await supabase
      .from('montree_guru_interactions')
      .update(updateData)
      .eq('id', interaction_id)
      .select('id, outcome, follow_up_notes')
      .single();

    if (error) {
      console.error('Failed to update interaction:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      interaction: data,
    });

  } catch (error) {
    console.error('Followup PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
