// app/api/brain/recommend/route.ts
// Get AI-powered work recommendations for a child

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * GET /api/brain/recommend
 * Query params:
 *   - child_age: Child's age in years (decimal, e.g., 4.5)
 *   - completed_work_ids: Comma-separated list of completed work UUIDs (optional)
 *   - limit: Number of recommendations (default: 5, max: 20)
 * 
 * Returns personalized recommendations based on:
 *   1. Age appropriateness
 *   2. Sensitive period alignment (2x score during peak)
 *   3. Gateway work priority (+10 bonus)
 *   4. Curriculum area balance (+5 for underserved areas)
 *   5. Prerequisite completion
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childAge = searchParams.get('child_age');
    const completedIdsParam = searchParams.get('completed_work_ids');
    const limitParam = searchParams.get('limit');

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

    // Parse limit
    let limit = 5;
    if (limitParam) {
      limit = Math.min(Math.max(parseInt(limitParam) || 5, 1), 20);
    }

    // Parse completed work IDs
    const completedIds = completedIdsParam 
      ? completedIdsParam.split(',').filter(id => id.trim())
      : [];

    const supabase = createClient();

    // Call the brain function
    const { data, error } = await supabase.rpc('get_recommended_works', {
      p_child_age: age,
      p_completed_work_ids: completedIds.length > 0 ? completedIds : null,
      p_limit: limit,
    });

    if (error) {
      console.error('Error calling get_recommended_works:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      child_age: age,
      completed_count: completedIds.length,
      recommendations: data || [],
    });
  } catch (error: any) {
    console.error('Error in brain/recommend:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}
