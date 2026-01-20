// app/api/brain/available/route.ts
// Get works a child is ready for based on age and completed works

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/brain/available
 * Query params:
 *   - child_age: Child's age in years (decimal, e.g., 4.5)
 *   - completed_work_ids: Comma-separated list of completed work UUIDs (optional)
 * 
 * Returns works that:
 *   1. Are age-appropriate
 *   2. Have all required prerequisites completed
 *   3. Scored by sensitive period relevance
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childAge = searchParams.get('child_age');
    const completedIdsParam = searchParams.get('completed_work_ids');

    if (!childAge) {
      return NextResponse.json(
        { success: false, error: 'child_age is required' },
        { status: 400 }
      );
    }

    const age = parseFloat(childAge);
    if (isNaN(age) || age < 0 || age > 12) {
      return NextResponse.json(
        { success: false, error: 'child_age must be a valid number between 0 and 12' },
        { status: 400 }
      );
    }

    // Parse completed work IDs
    const completedIds = completedIdsParam 
      ? completedIdsParam.split(',').filter(id => id.trim())
      : [];

    const supabase = createClient();

    // Call the brain function
    const { data, error } = await supabase.rpc('get_available_works', {
      p_child_age: age,
      p_completed_work_ids: completedIds.length > 0 ? completedIds : null,
    });

    if (error) {
      console.error('Error calling get_available_works:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      child_age: age,
      completed_count: completedIds.length,
      available_count: data?.length || 0,
      data: data || [],
    });
  } catch (error: any) {
    console.error('Error in brain/available:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get available works' },
      { status: 500 }
    );
  }
}
